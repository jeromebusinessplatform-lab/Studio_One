import { useState, useEffect, useCallback } from "react";
import { Bell, CheckCircle2, Clock, Truck, ShieldAlert, Trash2, CheckSquare, Square, X, AlertCircle } from "lucide-react";
import { useTelegram } from "@/context/TelegramContext.tsx";
import { toast } from "sonner";
import { motion, AnimatePresence } from "motion/react";

interface NotificationItem {
  _id: string;
  id?: string;
  telegramUserId: string;
  title: string;
  message: string;
  type: string;
  iconName: string;
  color: string;
  read: boolean;
  createdAt: number;
}

export default function NotificationsPage() {
  const { customer } = useTelegram();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [activeDetail, setActiveDetail] = useState<NotificationItem | null>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const url = customer?.telegramUserId 
        ? `/api/notifications?telegramUserId=${encodeURIComponent(customer.telegramUserId)}`
        : "/api/notifications";
      const res = await fetch(url, { credentials: "same-origin" });
      const data = await res.json().catch(() => ({}));
      if (res.ok && Array.isArray(data.notifications)) {
        setNotifications(data.notifications);
      }
    } catch (e) {
      console.error("Failed to load notifications:", e);
    } finally {
      setLoading(false);
    }
  }, [customer?.telegramUserId]);

  useEffect(() => {
    void fetchNotifications();
  }, [fetchNotifications]);

  const toggleSelectAll = () => {
    if (selectedIds.length === notifications.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(notifications.map((n) => n._id || n.id || ""));
    }
  };

  const toggleSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedIds((prev) => 
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleMarkSelectedRead = async (readState: boolean) => {
    if (!selectedIds.length) return;
    try {
      const res = await fetch("/api/notifications/batch", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_read", ids: selectedIds, read: readState }),
      });
      if (!res.ok) throw new Error("Failed batch update");
      setNotifications((prev) => prev.map((n) => selectedIds.includes(n._id || n.id || "") ? { ...n, read: readState } : n));
      setSelectedIds([]);
      toast.success(readState ? "Marked selected as read" : "Marked selected as unread");
    } catch (e) {
      toast.error("Failed to update notifications");
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    try {
      const res = await fetch("/api/notifications/batch", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", ids: selectedIds }),
      });
      if (!res.ok) throw new Error("Failed batch delete");
      setNotifications((prev) => prev.filter((n) => !selectedIds.includes(n._id || n.id || "")));
      setSelectedIds([]);
      toast.success("Deleted selected notifications");
    } catch (e) {
      toast.error("Failed to delete notifications");
    }
  };

  const handleDeleteSingle = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${encodeURIComponent(id)}`, {
        method: "DELETE",
        credentials: "same-origin",
      });
      if (!res.ok) throw new Error("Delete failed");
      setNotifications((prev) => prev.filter((n) => (n._id || n.id) !== id));
      if (activeDetail?._id === id || activeDetail?.id === id) setActiveDetail(null);
      toast.success("Notification deleted");
    } catch (e) {
      toast.error("Failed to delete notification");
    }
  };

  const handleOpenDetail = async (n: NotificationItem) => {
    setActiveDetail(n);
    const id = n._id || n.id;
    if (id && !n.read) {
      try {
        await fetch(`/api/notifications/${encodeURIComponent(id)}`, {
          method: "PATCH",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read: true }),
        });
        setNotifications((prev) => prev.map((item) => ((item._id || item.id) === id ? { ...item, read: true } : item)));
      } catch (e) {
        console.error(e);
      }
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "Truck": return Truck;
      case "CheckCircle2": return CheckCircle2;
      case "Clock": return Clock;
      case "ShieldAlert": return ShieldAlert;
      default: return Bell;
    }
  };

  return (
    <div className="bg-[#f3f4f6] min-h-full pb-20">
      <div className="bg-white border-b border-neutral-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h1
            className="text-black font-normal uppercase text-xl leading-tight"
            style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
          >
            NOTIFICATIONS
          </h1>
          <p className="text-xs text-neutral-500 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
            {unreadCount} unread customer alerts
          </p>
        </div>
        {notifications.length > 0 && (
          <button
            type="button"
            onClick={toggleSelectAll}
            className="text-xs bg-neutral-100 hover:bg-neutral-200 text-neutral-800 px-3 py-1.5 rounded-lg transition font-medium cursor-pointer"
          >
            {selectedIds.length === notifications.length ? "Deselect All" : "Select All"}
          </button>
        )}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-neutral-900 text-white px-4 py-2.5 flex items-center justify-between shadow-md">
          <span className="text-xs font-semibold">{selectedIds.length} selected</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleMarkSelectedRead(true)}
              className="bg-white/10 hover:bg-white/20 text-white text-xs px-2.5 py-1 rounded-lg transition"
            >
              Mark Read
            </button>
            <button
              type="button"
              onClick={handleDeleteSelected}
              className="bg-red-600 hover:bg-red-700 text-white text-xs px-2.5 py-1 rounded-lg transition flex items-center gap-1"
            >
              <Trash2 size={12} /> Delete
            </button>
          </div>
        </div>
      )}

      <div className="p-3 space-y-2.5">
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-white rounded-2xl border border-neutral-200 p-4 animate-pulse h-20"></div>
          ))
        ) : notifications.length === 0 ? (
          <div className="bg-white rounded-2xl border border-neutral-200 p-12 text-center text-neutral-500 space-y-2">
            <Bell size={36} className="mx-auto opacity-30 text-neutral-400" />
            <div className="font-bold text-sm">No notifications</div>
            <p className="text-xs text-neutral-400">You are fully up to date with your server alerts and order updates.</p>
          </div>
        ) : (
          notifications.map((n) => {
            const Icon = getIcon(n.iconName);
            const id = n._id || n.id || "";
            const isSelected = selectedIds.includes(id);

            return (
              <div
                key={id}
                onClick={() => handleOpenDetail(n)}
                className={`bg-white rounded-2xl border p-3.5 shadow-xs flex items-start gap-3 transition cursor-pointer relative ${
                  !n.read ? "border-black/30 bg-neutral-50/50 font-medium" : "border-neutral-200/90 hover:border-neutral-300"
                }`}
              >
                {/* Checkbox for multiple selection */}
                <button
                  type="button"
                  onClick={(e) => toggleSelect(id, e)}
                  className="mt-1 text-neutral-400 hover:text-black shrink-0 cursor-pointer"
                >
                  {isSelected ? <CheckSquare size={16} className="text-black" /> : <Square size={16} />}
                </button>

                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ backgroundColor: `${n.color || "#2563eb"}15`, color: n.color || "#2563eb" }}
                >
                  <Icon size={18} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h3
                      className={`text-sm ${!n.read ? "font-bold text-black" : "font-normal text-neutral-900"}`}
                      style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
                    >
                      {n.title}
                    </h3>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-neutral-400 font-normal">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => handleDeleteSingle(id, e)}
                        className="text-neutral-400 hover:text-red-600 p-1 rounded transition"
                        title="Delete notification"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-neutral-600 mt-0.5 leading-relaxed line-clamp-2" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                    {n.message}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {activeDetail && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden border border-neutral-200"
            >
              <div className="bg-neutral-900 text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bell size={18} />
                  <span className="font-bold text-sm uppercase tracking-wide">Notification Details</span>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveDetail(null)}
                  className="text-neutral-400 hover:text-white p-1 rounded-full"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <div className="flex items-center justify-between text-xs text-neutral-500 border-b border-neutral-100 pb-3">
                  <span>Type: <strong className="uppercase text-neutral-800">{activeDetail.type}</strong></span>
                  <span>{new Date(activeDetail.createdAt).toLocaleString()}</span>
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-lg font-bold text-neutral-900" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
                    {activeDetail.title}
                  </h2>
                  <p className="text-sm text-neutral-700 leading-relaxed bg-neutral-50 p-3.5 rounded-xl border border-neutral-200/80">
                    {activeDetail.message}
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-neutral-100">
                  <button
                    type="button"
                    onClick={(e) => handleDeleteSingle(activeDetail._id || activeDetail.id || "", e)}
                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Trash2 size={14} /> Delete Notification
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveDetail(null)}
                    className="bg-black text-white px-5 py-2 rounded-xl text-xs font-semibold hover:bg-neutral-800 transition cursor-pointer"
                  >
                    Close
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
