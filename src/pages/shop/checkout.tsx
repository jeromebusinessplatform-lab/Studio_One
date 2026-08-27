import { useEffect } from "react";
import CheckoutPage from "./checkout-hardened-v3.tsx";

/**
 * Checkout route shell.
 * Keeps the hardened checkout implementation intact while removing the
 * duplicate subtotal display from the checkout header.
 */
export default function CheckoutRoute() {
  useEffect(() => {
    const root = document.querySelector("[data-prime-checkout-shell]");
    if (!root) return;

    const hideDuplicateSubtotal = () => {
      root.querySelectorAll("div").forEach((node) => {
        if (node.textContent?.trim() !== "SUBTOTAL") return;
        const summary = node.parentElement;
        if (summary?.classList.contains("text-right")) {
          summary.style.display = "none";
          summary.setAttribute("aria-hidden", "true");
        }
      });
    };

    hideDuplicateSubtotal();
    const observer = new MutationObserver(hideDuplicateSubtotal);
    observer.observe(root, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  return (
    <div data-prime-checkout-shell className="w-full min-h-screen">
      <CheckoutPage />
    </div>
  );
}
