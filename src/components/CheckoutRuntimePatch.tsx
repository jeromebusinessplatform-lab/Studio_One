import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

const CODE_STORAGE_KEY = "prime_checkout_codes_v2";

function saveCheckoutCode(input: HTMLInputElement) {
  if (input.placeholder !== "COUPON" && input.placeholder !== "REFERRAL") return;
  try {
    const current = JSON.parse(sessionStorage.getItem(CODE_STORAGE_KEY) || "{}");
    if (input.placeholder === "COUPON") current.coupon = input.value.toUpperCase();
    if (input.placeholder === "REFERRAL") current.referral = input.value.toUpperCase();
    sessionStorage.setItem(CODE_STORAGE_KEY, JSON.stringify(current));
  } catch {}
}

function selectedDeliveryType() {
  const selected = Array.from(document.querySelectorAll("button")).find((button) => {
    const cls = button.className || "";
    return typeof cls === "string" && cls.includes("ring-2") && /STANDARD|PRIORITY|EXPRESS/i.test(button.textContent || "");
  });
  const match = selected?.textContent?.match(/\b(STANDARD|PRIORITY|EXPRESS)\b/i);
  return (match?.[1] || "STANDARD").toUpperCase();
}

function applyDeliveryLabels() {
  const label = Array.from(document.querySelectorAll("span, div, label")).find((node) => node.textContent?.trim() === "Delivery Due Now");
  if (!label) return;
  const type = selectedDeliveryType();
  const nextLabel = `${type.charAt(0) + type.slice(1).toLowerCase()} Delivery Fee`;
  if (label.textContent !== nextLabel) label.textContent = nextLabel;
}

function applySuccessButton() {
  const button = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((candidate) => /View Order Tracking & Details|GO TO MY ORDERS/i.test(candidate.textContent || ""));
  if (!button) return;
  const text = button.querySelector("span");
  if (text) text.textContent = "GO TO MY ORDERS";
  else button.textContent = "GO TO MY ORDERS";
}

function hydratePrimeMid() {
  const label = Array.from(document.querySelectorAll("span, div, label")).find((node) => node.textContent?.trim() === "PRIME MID");
  const input = label?.parentElement?.querySelector("input") as HTMLInputElement | null;
  if (!input) return;

  void fetch("/api/account/identity", { credentials: "same-origin", cache: "no-store" })
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || "Unable to hydrate PRIME Member ID");
      return String(data.primeMemberId || "").trim().toUpperCase();
    })
    .then((mid) => {
      if (!/^[A-Z0-9]{10}$/.test(mid) || /^PC[A-Z0-9]{8}$/.test(mid)) return;
      if (input.value !== mid) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        setter?.call(input, mid);
      }
    })
    .catch(() => {});
}

function validateReferralInput(input: HTMLInputElement) {
  const code = input.value.trim().toUpperCase();
  if (!code) {
    input.style.borderColor = "";
    input.title = "";
    return;
  }
  void fetch("/api/referrals/validate", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  })
    .then(async (response) => {
      const data = await response.json().catch(() => ({}));
      if (input.value.trim().toUpperCase() !== code) return;
      if (response.ok && data.valid) {
        input.style.borderColor = "#16a34a";
        input.title = data.kind === "PRIME_MEMBER_ID" ? "Valid PRIME Member ID" : "Valid Referral Code";
      } else {
        input.style.borderColor = "#dc2626";
        input.title = data.error || "Referral Code or PRIME Member ID not found";
      }
    })
    .catch(() => {
      if (input.value.trim().toUpperCase() === code) {
        input.style.borderColor = "#dc2626";
        input.title = "Unable to validate referral right now";
      }
    });
}

export default function CheckoutRuntimePatch() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname !== "/shop/checkout") return;
    let disposed = false;
    const timers = new WeakMap<HTMLInputElement, number>();

    const onInput = (event: Event) => {
      if (disposed) return;
      const input = event.target as HTMLInputElement | null;
      if (!(input instanceof HTMLInputElement)) return;
      saveCheckoutCode(input);
      if (input.placeholder === "REFERRAL") {
        const oldTimer = timers.get(input);
        if (oldTimer) window.clearTimeout(oldTimer);
        const timer = window.setTimeout(() => validateReferralInput(input), 300);
        timers.set(input, timer);
      }
    };

    const onPrimeMidClick = (event: Event) => {
      const target = event.target as HTMLElement | null;
      const input = target?.closest("input") as HTMLInputElement | null;
      if (!input || !input.disabled) return;
      const label = input.parentElement?.querySelector("span")?.textContent?.trim();
      if (label !== "PRIME MID") return;
      const mid = input.value.trim().toUpperCase();
      if (!/^[A-Z0-9]{10}$/.test(mid) || /^PC[A-Z0-9]{8}$/.test(mid)) return;
      event.preventDefault();
      event.stopPropagation();
      window.dispatchEvent(new CustomEvent("prime:open-member", { detail: { primeMemberId: mid } }));
    };

    const observer = new MutationObserver(() => {
      if (disposed) return;
      applyDeliveryLabels();
      applySuccessButton();
      hydratePrimeMid();
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    document.addEventListener("input", onInput, true);
    document.addEventListener("click", onPrimeMidClick, true);
    const timer = window.setInterval(() => {
      applyDeliveryLabels();
      applySuccessButton();
      hydratePrimeMid();
    }, 1000);

    const successHandler = (event: Event) => {
      const button = (event.target as HTMLElement | null)?.closest("button") as HTMLButtonElement | null;
      if (!button || !/View Order Tracking & Details|GO TO MY ORDERS/i.test(button.textContent || "")) return;
      event.preventDefault();
      event.stopPropagation();
      try { sessionStorage.removeItem(CODE_STORAGE_KEY); } catch {}
      navigate("/shop/orders");
    };
    document.addEventListener("click", successHandler, true);

    applyDeliveryLabels();
    applySuccessButton();
    hydratePrimeMid();

    return () => {
      disposed = true;
      observer.disconnect();
      document.removeEventListener("input", onInput, true);
      document.removeEventListener("click", onPrimeMidClick, true);
      window.clearInterval(timer);
      document.removeEventListener("click", successHandler, true);
    };
  }, [location.pathname, navigate]);

  return null;
}
