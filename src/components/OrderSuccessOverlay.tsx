import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { formatCurrency } from "@/lib/utils.ts";

type OrderSuccess = {
  orderNumber?: string;
  queuePosition?: number;
  estimatedWaitingMinutes?: number;
  estimatedDispatchTime?: string;
  distanceKm?: number;
  total?: number;
};

export default function OrderSuccessOverlay() {
  const [order, setOrder] = useState<OrderSuccess | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<{ order?: OrderSuccess }>).detail;
      if (detail?.order) setOrder(detail.order);
    };
    window.addEventListener("prime:order-success", handler);
    return () => window.removeEventListener("prime:order-success", handler);
  }, []);

  const close = () => setOrder(null);

  return (
    <AnimatePresence>
      {order && (
        <div className="fixed inset-0 z-[120] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.88, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 12 }}
            transition={{ type: "spring", stiffness: 260, damping: 22 }}
            className="bg-white w-full max-w-sm rounded-[28px] p-6 shadow-2xl text-center space-y-4 border border-neutral-200"
          >
            <motion.div
              initial={{ scale: 0.5, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.08, type: "spring", stiffness: 300, damping: 18 }}
              className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner"
            >
              <Check size={32} className="stroke-[3]" />
            </motion.div>

            <div>
              <h2 className="text-xl font-bold uppercase text-neutral-900" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
                ORDER PLACED SUCCESSFULLY!
              </h2>
              <p className="text-xs text-neutral-600 leading-relaxed mt-1.5">
                Your order <strong className="font-mono text-black">#{order.orderNumber || "—"}</strong> has been securely validated and submitted.
              </p>
            </div>

            <div className="bg-neutral-50 p-3 rounded-2xl border border-neutral-200 text-xs text-left space-y-1 font-mono">
              <div className="flex justify-between"><span>Queue Position:</span><strong className="text-black">#{order.queuePosition ?? "—"}</strong></div>
              <div className="flex justify-between"><span>Estimated Wait:</span><strong className="text-black">{order.estimatedWaitingMinutes ?? "—"} mins</strong></div>
              <div className="flex justify-between"><span>Total Amount:</span><strong className="text-black">{order.total != null ? formatCurrency(order.total) : "—"}</strong></div>
            </div>

            <button
              type="button"
              onClick={() => {
                const orderNumber = order.orderNumber;
                close();
                if (orderNumber) {
                  navigate(`/shop/order-confirmation/${orderNumber}`, {
                    state: {
                      orderNumber,
                      queuePosition: order.queuePosition,
                      estimatedWaitingMinutes: order.estimatedWaitingMinutes,
                      estimatedDispatchTime: order.estimatedDispatchTime,
                      distanceKm: order.distanceKm,
                    },
                  });
                }
              }}
              className="w-full bg-black text-white py-3 rounded-xl font-bold text-xs hover:bg-neutral-800 transition shadow-md cursor-pointer uppercase tracking-wide"
            >
              VIEW ORDER TRACKING & DETAILS
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
