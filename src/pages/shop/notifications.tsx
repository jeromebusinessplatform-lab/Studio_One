import { Bell, CheckCircle2, Clock, Truck, ShieldAlert } from "lucide-react";

export default function NotificationsPage() {
  const notifications = [
    {
      id: "notif-1",
      title: "Order Dispatched",
      message: "Order #PRIME-9021 has left our fulfillment hub with priority courier.",
      time: "10 mins ago",
      icon: Truck,
      color: "#2563eb",
      unread: true,
    },
    {
      id: "notif-2",
      title: "Payment Receipt Confirmed",
      message: "Automated OCR scan successfully cleared receipt verification for Order #PRIME-9021.",
      time: "24 mins ago",
      icon: CheckCircle2,
      color: "#16a34a",
      unread: true,
    },
    {
      id: "notif-3",
      title: "Queue Position Update",
      message: "Your order has moved to Queue #1. Packing operations are currently in progress.",
      time: "42 mins ago",
      icon: Clock,
      color: "#ea580c",
      unread: true,
    },
    {
      id: "notif-4",
      title: "Flash Sale Alert",
      message: "Wireless Headphones are now 20% off for verified PRIME members.",
      time: "2 hours ago",
      icon: Bell,
      color: "#ef4444",
      unread: true,
    },
    {
      id: "notif-5",
      title: "Secured Session Established",
      message: "Telegram customer handshake authenticated with 256-bit token.",
      time: "5 hours ago",
      icon: ShieldAlert,
      color: "#6b7280",
      unread: true,
    },
  ];

  return (
    <div className="bg-[#f3f4f6] min-h-full pb-10">
      <div className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h1
            className="text-black font-normal uppercase text-xl leading-tight"
            style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
          >
            NOTIFICATIONS
          </h1>
          <p className="text-xs text-neutral-500 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
            5 unread customer alerts
          </p>
        </div>
        <span
          className="bg-black text-white text-[11px] font-normal px-2.5 py-1 rounded-full uppercase"
          style={{ fontFamily: "'Ubuntu', sans-serif" }}
        >
          All Cleared
        </span>
      </div>

      <div className="p-3 space-y-2.5">
        {notifications.map((n) => {
          const Icon = n.icon;
          return (
            <div
              key={n.id}
              className="bg-white rounded-2xl border border-neutral-200/90 p-3.5 shadow-xs flex items-start gap-3"
            >
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: `${n.color}15`, color: n.color }}
              >
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3
                    className="font-normal text-neutral-900 text-sm"
                    style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
                  >
                    {n.title}
                  </h3>
                  <span className="text-[10px] text-neutral-400 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                    {n.time}
                  </span>
                </div>
                <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                  {n.message}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
