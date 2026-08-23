import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function moneyToNumber(text: string) {
  const cleaned = String(text || "").replace(/[^0-9.\-]/g, "");
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : 0;
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
  const labels = Array.from(document.querySelectorAll("span, div, label"));
  const label = labels.find((node) => node.textContent?.trim() === "Delivery Due Now");
  if (!label) return;
  const type = selectedDeliveryType();
  label.textContent = `${type.charAt(0) + type.slice(1).toLowerCase()} Delivery Fee`;
  const row = label.parentElement;
  if (!row) return;
  const value = row.querySelector("span:last-child") as HTMLElement | null;
  if (!value) return;
  const fulfillment = /Pay upon fulfillment|Payable to courier|Not in final checkout amount/i.test(document.body.innerText);
  if (fulfillment) {
    const raw = value.textContent?.replace(/\(.*?\)/g, "").replace(/Payable to courier|Pay upon delivery/gi, "").trim() || "₱0.00";
    value.textContent = `(${raw})`;
    value.style.color = "#f97316";
    value.style.fontWeight = "700";
  } else {
    value.style.color = "";
    value.style.fontWeight = "";
  }
}

function findSubtotal() {
  const node = Array.from(document.querySelectorAll("span, div")).find((el) => el.textContent?.trim() === "Items Subtotal");
  return node?.parentElement ? moneyToNumber(node.parentElement.textContent || "0") : 0;
}

function hideCodeErrorCopy() {
  const patterns = [/Invalid coupon or referral code/i, /This code is not available for your account/i, /This code requires a minimum subtotal/i, /Coupon or referral code is inactive/i];
  document.querySelectorAll<HTMLElement>("div,span,p").forEach((node) => {
    const text = node.textContent?.trim() || "";
    if (patterns.some((pattern) => pattern.test(text)) && text.length < 180) node.style.display = "none";
  });
}

export default function CheckoutRuntimePatch() {
  const location = useLocation();

  useEffect(() => {
    if (location.pathname !== "/shop/checkout") return;
    let disposed = false;
    const timers = new Map<HTMLInputElement, number>();
    const state = new WeakMap<HTMLInputElement, string>();

    const hydratePrimeMid = async () => {
      const uidInput = Array.from(document.querySelectorAll<HTMLInputElement>("input")).find((input) => input.value && /^\d+$/.test(input.value) && input.previousElementSibling?.textContent?.includes("TELEGRAM UID"));
      const uid = uidInput?.value;
      if (!uid) return;
      try {
        const response = await fetch(`/api/customers?userId=${encodeURIComponent(uid)}&_t=${Date.now()}`, { credentials: "same-origin", cache: "no-store" });
        const data = await response.json().catch(() => ({}));
        const mid = data?.customers?.[0]?.primeMemberId;
        if (!mid || disposed) return;
        const label = Array.from(document.querySelectorAll("span")).find((node) => node.textContent?.trim() === "PRIME MID");
        const input = label?.parentElement?.querySelector("input") as HTMLInputElement | null;
        if (input) input.value = mid;
      } catch {}
    };

    const validateField = async (input: HTMLInputElement) => {
      const code = input.value.trim().toUpperCase();
      if (!code) {
        input.style.borderColor = "";
        state.set(input, "");
        return;
      }
      const kind = input.placeholder?.toUpperCase() === "REFERRAL" ? "referral" : "coupon";
      input.style.borderColor = "#a3a3a3";
      try {
        const response = await fetch("/api/checkout/validate-code", {
          method: "POST",
          credentials: "same-origin",
          cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ code, kind, subtotal: findSubtotal() }),
        });
        const data = await response.json().catch(() => ({}));
        if (disposed || input.value.trim().toUpperCase() !== code) return;
        if (response.ok && data.valid) {
          input.style.borderColor = "#16a34a";
          state.set(input, "valid");
        } else {
          input.style.borderColor = "#dc2626";
          state.set(input, "invalid");
        }
        hideCodeErrorCopy();
      } catch {
        if (!disposed) input.style.borderColor = "#dc2626";
      }
    };

    const onInput = (event: Event) => {
      const input = event.target as HTMLInputElement;
      if (!(input instanceof HTMLInputElement)) return;
      if (input.placeholder !== "COUPON" && input.placeholder !== "REFERRAL") return;
      const oldTimer = timers.get(input);
      if (oldTimer) window.clearTimeout(oldTimer);
      const timer = window.setTimeout(() => void validateField(input), 350);
      timers.set(input, timer);
    };

    const observer = new MutationObserver(() => {
      applyDeliveryLabels();
      hideCodeErrorCopy();
      void hydratePrimeMid();
      document.querySelectorAll<HTMLInputElement>('input[placeholder="COUPON"], input[placeholder="REFERRAL"]').forEach((input) => {
        if (!state.has(input)) input.addEventListener("input", onInput);
      });
    });

    document.querySelectorAll<HTMLInputElement>('input[placeholder="COUPON"], input[placeholder="REFERRAL"]').forEach((input) => input.addEventListener("input", onInput));
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    const labelTimer = window.setInterval(() => { applyDeliveryLabels(); hideCodeErrorCopy(); void hydratePrimeMid(); }, 500);
    void hydratePrimeMid();

    return () => {
      disposed = true;
      observer.disconnect();
      window.clearInterval(labelTimer);
      timers.forEach((timer) => window.clearTimeout(timer));
      document.querySelectorAll<HTMLInputElement>('input[placeholder="COUPON"], input[placeholder="REFERRAL"]').forEach((input) => input.removeEventListener("input", onInput));
    };
  }, [location.pathname]);

  return null;
}
