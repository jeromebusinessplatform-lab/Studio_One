import { useState, useEffect } from "react";
import { useTelegram } from "@/context/TelegramContext.tsx";
import { useOrders, type CustomerOrder } from "@/hooks/useOrders.ts";
import { useReviews } from "@/hooks/useReviews.ts";
import { Package, Clock, Truck, Star, MessageSquare, CheckCircle2, ChevronRight, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { formatCurrency } from "@/lib/utils.ts";
import { StarRating } from "@/components/StarRating.tsx";
import { ProductReviewModal } from "@/components/ProductReviewModal.tsx";

// Mock tracking component
const OrderTracker = ({ orderId, lat, lon }: { orderId: string, lat: number, lon: number }) => {
  const [tracking, setTracking] = useState<any>(null);
  useEffect(() => {
    fetch(`/api/courier-location?lat=${lat}&lon=${lon}`).then(res => res.json()).then(setTracking);
  }, [lat, lon]);
  if (!tracking) return <div className="text-xs text-neutral-500">Tracking...</div>;
  return <div className="text-xs font-mono text-blue-600 bg-blue-50 p-2 rounded">Courier: {tracking.features?.[0]?.properties?.distance ? (tracking.features[0].properties.distance/1000).toFixed(1) : "?"} km away</div>;
}

const STATUS_LABELS: Record<string, string> = {
  REVIEW: "Under Review",
  PAYMENT_CONFIRMED: "Payment Confirmed",
  START_PACKING: "Packing",
  READY: "Ready for Pickup",
  AWAITING_RIDER: "Awaiting Rider",
  DISPATCHED: "Dispatched",
  DELIVERED: "Delivered",
  PAYMENT_FAILED: "Payment Failed",
  HOLD_ORDER: "On Hold",
  REQUEST_RESUBMIT: "Resubmit Required",
  PAYMENT_CLEARED: "Payment Cleared",
  FINAL_FOLLOW_UP: "Final Follow-up",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

const STATUS_COLORS: Record<string, string> = {
  REVIEW: "#f97316",
  PAYMENT_CONFIRMED: "#22c55e",
  START_PACKING: "#3b82f6",
  READY: "#22c55e",
  AWAITING_RIDER: "#3b82f6",
  DISPATCHED: "#3b82f6",
  DELIVERED: "#22c55e",
  PAYMENT_FAILED: "#ef4444",
  HOLD_ORDER: "#f97316",
  REQUEST_RESUBMIT: "#f97316",
  PAYMENT_CLEARED: "#22c55e",
  FINAL_FOLLOW_UP: "#f97316",
  REJECTED: "#ef4444",
  CANCELLED: "#6b7280",
};

export default function OrdersPage() {
  const { customer } = useTelegram();
  const { orders, loading } = useOrders(customer?.telegramUserId);
  const { reviews, getReviewForOrderItem } = useReviews();

  // Review Modal State
  const [reviewModalState, setReviewModalState] = useState<{
    isOpen: boolean;
    productId: string;
    productName: string;
    orderId: string;
    orderNumber: string;
    existingReview?: any;
  }>({
    isOpen: false,
    productId: "",
    productName: "",
    orderId: "",
    orderNumber: "",
  });

  const handleOpenReview = (order: CustomerOrder, item: CustomerOrder["items"][0]) => {
    const existing = getReviewForOrderItem(order._id, item.productId);
    setReviewModalState({
      isOpen: true,
      productId: item.productId,
      productName: item.productName,
      orderId: order._id,
      orderNumber: order.orderNumber,
      existingReview: existing,
    });
  };

  return (
    <div className="bg-[#f3f4f6] min-h-full pb-10">
      <div className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h1
            className="text-black font-normal uppercase text-xl leading-tight"
            style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
          >
            MY ORDERS
          </h1>
          <p className="text-xs text-neutral-500 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
            Live order queue, fulfillment tracking & product reviews
          </p>
        </div>
        <Link
          to="/shop"
          className="text-xs text-black border border-neutral-200 px-3 py-1.5 rounded-lg hover:bg-neutral-50 font-normal"
          style={{ fontFamily: "'Ubuntu', sans-serif" }}
        >
          Shop More
        </Link>
      </div>

      {loading ? (
        <div className="p-3 space-y-2.5">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-neutral-200/90 p-3.5 shadow-xs animate-pulse">
              <div className="flex items-start justify-between mb-2">
                <div className="w-1/3 h-4 bg-neutral-200 rounded"></div>
                <div className="w-1/4 h-4 bg-neutral-200 rounded-full"></div>
              </div>
              <div className="space-y-2 py-1">
                <div className="h-3 bg-neutral-100 rounded w-full"></div>
                <div className="h-3 bg-neutral-100 rounded w-2/3"></div>
              </div>
            </div>
          ))}
        </div>
      ) : orders.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400 bg-white m-3 rounded-2xl border border-neutral-200 p-8">
          <Package size={48} className="mb-3 opacity-30" />
          <p className="font-normal text-neutral-700" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
            No active orders
          </p>
          <Link
            to="/shop"
            className="mt-4 text-xs bg-black text-white font-normal px-4 py-2 rounded-xl"
            style={{ fontFamily: "'Ubuntu', sans-serif" }}
          >
            BROWSE PRODUCTS
          </Link>
        </div>
      ) : (
        <div className="p-3 space-y-2.5">
          {orders.map((order: CustomerOrder) => (
            <div
              key={order._id}
              className="bg-white rounded-2xl border border-neutral-200/90 p-3.5 shadow-xs space-y-3"
            >
              <div className="flex items-start justify-between border-b border-neutral-100 pb-2.5">
                <div>
                  <div
                    className="text-black font-normal leading-tight flex items-center gap-1.5"
                    style={{
                      fontFamily: "'Roboto Condensed', sans-serif",
                      fontSize: "17px",
                      letterSpacing: "0.5px",
                    }}
                  >
                    <span>#{order.orderNumber}</span>
                  </div>
                  <div className="text-[11px] text-neutral-400 mt-0.5 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                    {new Date(order._creationTime).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>

                <span
                  className="text-[10px] font-normal px-2.5 py-0.5 rounded-full text-white uppercase"
                  style={{
                    backgroundColor: STATUS_COLORS[order.orderStatus] ?? "#6b7280",
                    fontFamily: "'Roboto Condensed', sans-serif",
                    letterSpacing: "0.5px",
                  }}
                >
                  {STATUS_LABELS[order.orderStatus] ?? order.orderStatus}
                </span>
              </div>

              {/* Items summary with individual Star Rating & Comment trigger */}
              <div className="space-y-2.5">
                <div className="text-[11px] font-medium text-neutral-400 uppercase tracking-wider" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
                  Purchased Items & Reviews
                </div>

                <div className="divide-y divide-neutral-100 space-y-2">
                  {order.items.map((it, idx) => {
                    const review = getReviewForOrderItem(order._id, it.productId);

                    return (
                      <div key={idx} className="pt-2 first:pt-0 space-y-1.5">
                        <div className="flex justify-between items-start text-xs font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                          <div className="pr-2 font-medium text-black">
                            <span className="font-bold text-neutral-800">{it.quantity}x</span> {it.productName}
                          </div>
                          <span className="font-semibold text-neutral-900 shrink-0 font-mono">
                            {formatCurrency(it.subtotal)}
                          </span>
                        </div>

                        {/* Rating and Review action / preview */}
                        {review ? (
                          <div className="bg-amber-50/70 border border-amber-200/80 rounded-xl p-2.5 text-xs space-y-1">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-1.5">
                                <StarRating rating={review.rating} size={13} showScore={true} />
                                <span className="text-[10px] text-amber-900 font-bold font-mono">Your Review</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => handleOpenReview(order, it)}
                                className="text-[11px] text-neutral-600 hover:text-black underline cursor-pointer"
                                style={{ fontFamily: "'Ubuntu', sans-serif" }}
                              >
                                Edit Review
                              </button>
                            </div>
                            <p className="text-xs text-neutral-700 italic line-clamp-2" style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: "13px" }}>
                              "{review.comment}"
                            </p>
                            {review.tags && review.tags.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {review.tags.map((tag) => (
                                  <span
                                    key={tag}
                                    className="text-[9px] bg-white text-neutral-600 border border-amber-200 px-1.5 py-0.2 rounded-md font-mono"
                                  >
                                    #{tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between bg-neutral-50 rounded-xl px-2.5 py-1.5 border border-neutral-200/70">
                            <span className="text-[11px] text-neutral-500 flex items-center gap-1" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                              <Star size={11} className="text-amber-500 fill-amber-400" />
                              Rate this product
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenReview(order, it)}
                              className="text-[11px] font-medium text-black bg-white hover:bg-neutral-100 border border-neutral-200 px-2.5 py-1 rounded-lg flex items-center gap-1 cursor-pointer transition shadow-2xs"
                              style={{ fontFamily: "'Ubuntu', sans-serif" }}
                            >
                              <MessageSquare size={11} className="text-neutral-700" />
                              <span>Write Review</span>
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Order total info */}
              <div className="flex items-center justify-between text-sm pt-2 border-t border-neutral-100">
                <span className="text-xs text-neutral-500 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                  {order.items.reduce((s, i) => s + i.quantity, 0)} items total
                </span>
                <span
                  className="text-black font-semibold font-mono"
                  style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: "18px" }}
                >
                  {formatCurrency(order.total)}
                </span>
              </div>

              {!["DELIVERED", "CANCELLED", "REJECTED"].includes(order.orderStatus) && (
                <div className="mt-2 pt-2 border-t border-neutral-100 space-y-2">
                  <div className="flex items-center justify-between text-xs text-neutral-600 bg-neutral-50/80 -mx-3.5 p-2.5 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                    <div className="flex items-center gap-1.5 font-normal">
                      <Clock size={13} className="text-orange-500" />
                      <span>
                        Queue #{order.queuePosition} • {order.estimatedWaitingMinutes} min wait
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 font-normal">
                      <Truck size={13} className="text-blue-500" />
                      <span>{order.estimatedDispatchTime}</span>
                    </div>
                  </div>
                  {["DISPATCHED", "AWAITING_RIDER"].includes(order.orderStatus) && (
                    <OrderTracker orderId={order._id} lat={14.5516} lon={121.0503} />
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      <ProductReviewModal
        isOpen={reviewModalState.isOpen}
        onClose={() => setReviewModalState((prev) => ({ ...prev, isOpen: false }))}
        productId={reviewModalState.productId}
        productName={reviewModalState.productName}
        orderId={reviewModalState.orderId}
        orderNumber={reviewModalState.orderNumber}
        userId={customer?.telegramUserId || "1085949511"}
        userName={customer?.telegramDisplayName || "Marcus Vance"}
        existingReview={reviewModalState.existingReview}
      />
    </div>
  );
}

