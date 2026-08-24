import { useEffect } from "react";
import { useLocation } from "react-router-dom";

function textOf(element: Element | null) {
  return String(element?.textContent || "").replace(/\s+/g, " ").trim();
}

function findCourierGrid() {
  const nodes = Array.from(document.querySelectorAll("p, h2, h3, div, span"));
  const heading = nodes.find((node) => textOf(node) === "DELIVERY PROVIDER");
  if (!heading) return null;

  let current: Element | null = heading;
  for (let depth = 0; current && depth < 8; depth += 1, current = current.parentElement) {
    const grid = Array.from(current.querySelectorAll("div.grid")).find((candidate) => candidate.querySelectorAll("button img").length >= 2);
    if (grid) return grid as HTMLElement;
  }
  return null;
}

function normalizeCourierGrid() {
  const grid = findCourierGrid();
  if (!grid) return;

  grid.setAttribute("data-prime-courier-grid", "true");
  grid.style.display = "grid";
  grid.style.gridTemplateColumns = "repeat(3, minmax(0, 1fr))";
  grid.style.gap = "10px";

  Array.from(grid.querySelectorAll("button")).forEach((button) => {
    const el = button as HTMLElement;
    el.style.height = "auto";
    el.style.minHeight = "0";
    el.style.padding = "0";
    el.style.display = "flex";
    el.style.flexDirection = "column";
    el.style.justifyContent = "flex-start";
    el.style.alignItems = "stretch";
    el.style.background = "white";
    el.style.overflow = "hidden";

    const image = button.querySelector("img") as HTMLElement | null;
    if (image) {
      image.style.position = "relative";
      image.style.inset = "auto";
      image.style.width = "100%";
      image.style.height = "78px";
      image.style.objectFit = "cover";
      image.style.opacity = "1";
      image.style.display = "block";
    }

    const overlay = button.querySelector(".absolute.inset-0") as HTMLElement | null;
    if (overlay) overlay.style.display = "none";

    const info = button.querySelector(".relative.z-10") as HTMLElement | null;
    if (info) {
      info.style.position = "relative";
      info.style.inset = "auto";
      info.style.width = "100%";
      info.style.background = "white";
      info.style.color = "#111827";
      info.style.padding = "8px";
      info.style.display = "flex";
      info.style.justifyContent = "space-between";
      info.style.alignItems = "flex-start";
      info.style.gap = "5px";
    }

    Array.from(button.querySelectorAll(".relative.z-10 span")).forEach((span, index) => {
      const spanEl = span as HTMLElement;
      spanEl.style.color = index === 0 ? "#047857" : "#111827";
      spanEl.style.background = "transparent";
    });

    const fee = button.querySelector(".relative.z-10 span:last-child") as HTMLElement | null;
    if (fee) {
      fee.style.background = "#f3f4f6";
      fee.style.color = "#111827";
      fee.style.whiteSpace = "nowrap";
    }
  });
}

function hideLegacyDeliveryDueNow() {
  const nodes = Array.from(document.querySelectorAll("span, div, p"));
  const label = nodes.find((node) => textOf(node) === "Delivery Due Now");
  if (!label) return;
  const row = label.closest("div.flex.justify-between") || label.parentElement;
  if (!row) return;
  (row as HTMLElement).style.display = "none";
  row.setAttribute("data-prime-delivery-due-hidden", "true");
}

function alignCodeFields() {
  const coupon = document.querySelector('input[placeholder="COUPON"]') as HTMLInputElement | null;
  const referral = document.querySelector('input[placeholder="REFERRAL"]') as HTMLInputElement | null;
  if (!coupon || !referral) return;
  const commonGrid = coupon.closest("div.grid") || referral.closest("div.grid");
  if (!commonGrid || !commonGrid.contains(referral)) return;
  const el = commonGrid as HTMLElement;
  el.style.display = "grid";
  el.style.gridTemplateColumns = "repeat(2, minmax(0, 1fr))";
  el.style.gap = "8px";
}

export default function CheckoutUiConsistency() {
  const location = useLocation();

  useEffect(() => {
    if (!location.pathname.startsWith("/shop/checkout")) return;

    let disposed = false;
    const apply = () => {
      if (disposed) return;
      hideLegacyDeliveryDueNow();
      alignCodeFields();
      normalizeCourierGrid();
    };

    requestAnimationFrame(apply);
    const timers = [250, 800, 1400].map((delay) => window.setTimeout(apply, delay));
    return () => {
      disposed = true;
      timers.forEach(window.clearTimeout);
    };
  }, [location.pathname]);

  return null;
}
