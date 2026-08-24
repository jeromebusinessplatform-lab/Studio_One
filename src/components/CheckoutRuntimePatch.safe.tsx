import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

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
  const uidInput = Array.from(document.querySelectorAll<HTMLInputElement>("input")).find((input) => input.value && /^\d+$/.test(input.value) && input.previousElementSibling?.textContent?.includes("TELEGRAM UID"));
  const uid = uidInput?.value;
  if (!uid) return;
  void fetch(`/api/customers?userId=${encodeURIComponent(uid)}&_t=${Date.now()}`, { credentials: "same-origin", cache: "no-store" })
    .then((response) => response.json().catch(() => ({})))
    .then((data) => {
      const mid = data?.customers?.[0]?.primeMemberId;
      if (!mid) return;
      const label = Array.from(document.querySelectorAll("span")).find((node) => node.textContent?.trim() === "PRIME MID");
      const input = label?.parentElement?.querySelector("input") as HTMLInputElement | null;
      if (input && input.value !== mid) {
        const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
        setter?.call(input, mid);
      }
    })
    .catch(() => {});
}

export default function CheckoutRuntimePatch() {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (location.pathname !== "/shop/checkout") return;
    let disposed = false;

    // Important: checkout code inputs are React-controlled fields. This helper deliberately
    // does not intercept clicks, key events, submit events, or window.fetch.
    const observer = new MutationObserver(() => {
      if (disposed) return;
      applyDeliveryLabels();
      applySuccessButton();
      hydratePrimeMid();
    });

    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
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
      navigate("/shop/orders");
    };
    document.addEventListener("click", successHandler, true);

    applyDeliveryLabels();
    applySuccessButton();
    hydratePrimeMid();

    return () => {
      disposed = true;
      observer.disconnect();
      window.clearInterval(timer);
      document.removeEventListener("click", successHandler, true);
    };
  }, [location.pathname, navigate]);

  return null;
}
