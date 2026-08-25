import { useLocation, useParams, Link } from "react-router-dom";
import { CheckCircle, Clock, Truck, Hash, MapPin, Route } from "lucide-react";
import { useEffect } from "react";
import confetti from "canvas-confetti";
import { motion } from "motion/react";

export default function OrderConfirmationPage() {
  const { orderId } = useParams<{ orderId: string }>();
  const location = useLocation();
  const state = location.state as {
    orderNumber?: string;
    queuePosition?: number;
    estimatedWaitingMinutes?: number;
    estimatedDispatchTime?: string;
    distanceKm?: number;
  } | null;

  useEffect(() => {
    confetti({
      particleCount: 150,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  return (
    <motion.div 
      className="bg-[#f3f4f6] min-h-full p-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="text-center py-6">
        <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
        <h1
          className="text-black font-normal"
          style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: "28px" }}
        >
          ORDER PLACED!
        </h1>
        <p
          className="text-neutral-500 text-sm mt-1 font-normal"
          style={{ fontFamily: "'Ubuntu', sans-serif" }}
        >
          Your order has been received and is currently in the fulfillment queue.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-neutral-200 overflow-hidden shadow-xs">
        <div className="px-4 py-3.5 border-b border-neutral-100 flex items-center gap-3">
          <Hash size={20} className="text-neutral-400" />
          <div>
            <div
              className="text-xs text-neutral-500 uppercase tracking-wide font-normal"
              style={{ fontFamily: "'Ubuntu', sans-serif" }}
            >
              Order Number
            </div>
            <div
              className="text-black font-normal"
              style={{
                fontFamily: "'Roboto Condensed', sans-serif",
                fontSize: "20px",
                letterSpacing: "1px",
              }}
            >
              {state?.orderNumber || orderId || "PRIME-9021"}
            </div>
          </div>
        </div>

        <div className="px-4 py-3.5 border-b border-neutral-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-full bg-black flex items-center justify-center flex-shrink-0">
            <span
              className="text-white font-normal text-base"
              style={{ fontFamily: "'Ubuntu', sans-serif" }}
            >
              #{state?.queuePosition ?? 6}
            </span>
          </div>
          <div>
            <div
              className="text-xs text-neutral-500 uppercase tracking-wide font-normal"
              style={{ fontFamily: "'Ubuntu', sans-serif" }}
            >
              Queue Position
            </div>
            <div
              className="text-black font-normal"
              style={{ fontFamily: "'Roboto Condensed', sans-serif", fontSize: "18px" }}
            >
              QUEUE #{state?.queuePosition ?? 6}
            </div>
          </div>
        </div>

        <div className="px-4 py-3.5 border-b border-neutral-100 flex items-center gap-3">
          <Clock size={20} className="text-orange-500" />
          <div>
            <div
              className="text-xs text-neutral-500 uppercase tracking-wide font-normal"
              style={{ fontFamily: "'Ubuntu', sans-serif" }}
            >
              Estimated Wait
            </div>
            <div
              className="font-normal"
              style={{
                fontFamily: "'Roboto Condensed', sans-serif",
                fontSize: "18px",
                color: "#ef4444",
              }}
            >
              {state?.estimatedWaitingMinutes ?? 44} MINUTES
            </div>
          </div>
        </div>

        <div className="px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Truck size={20} className="text-blue-500" />
            <div>
              <div
                className="text-xs text-neutral-500 uppercase tracking-wide font-normal"
                style={{ fontFamily: "'Ubuntu', sans-serif" }}
              >
                Estimated Dispatch
              </div>
              <div
                className="font-normal"
                style={{
                  fontFamily: "'Roboto Condensed', sans-serif",
                  fontSize: "18px",
                  color: "#ef4444",
                }}
              >
                {state?.estimatedDispatchTime ?? "21 MINUTES"}
              </div>
            </div>
          </div>

          {state?.distanceKm && (
            <div className="bg-neutral-100 border border-neutral-200 px-2.5 py-1 rounded-lg text-right font-mono">
              <div className="text-[10px] text-neutral-400 uppercase">Route Distance</div>
              <div className="text-xs font-semibold text-neutral-900 flex items-center gap-1">
                <Route size={12} className="text-neutral-600" /> {state.distanceKm} km
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-3.5">
        <p
          className="text-xs text-blue-900 leading-relaxed font-normal"
          style={{ fontFamily: "'Ubuntu', sans-serif" }}
        >
          Your payment receipt has been linked for automated verification. You will receive Telegram notifications as your order progresses.
        </p>
      </div>

      <div className="mt-5 space-y-2.5">
        <Link
          to="/shop/orders"
          className="block w-full text-center bg-black text-white font-normal py-3 rounded-xl cursor-pointer hover:bg-neutral-800 transition-colors shadow-xs"
          style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: "15px" }}
        >
          VIEW MY ORDERS
        </Link>
        <Link
          to="/shop"
          className="block w-full text-center bg-white border border-neutral-300 text-neutral-800 font-normal py-3 rounded-xl cursor-pointer hover:bg-neutral-50 transition-colors"
          style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: "15px" }}
        >
          CONTINUE SHOPPING
        </Link>
      </div>
    </motion.div>
  );
}
