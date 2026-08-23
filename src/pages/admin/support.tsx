import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Headphones,
  ArrowLeft,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  MessageSquare,
  Send,
  Sparkles,
  ShieldCheck,
  User,
  ExternalLink,
  Bot,
  Megaphone,
} from "lucide-react";
import { toast } from "sonner";

interface Ticket {
  id: string;
  customerName: string;
  telegramUserId: string;
  orderNumber?: string;
  category: "PAYMENT" | "DELIVERY" | "ORDER_STATUS" | "REFUND" | "GENERAL";
  priority: "HIGH" | "MEDIUM" | "LOW";
  status: "OPEN" | "IN_PROGRESS" | "RESOLVED";
  createdAt: string;
  messages: Array<{
    sender: "CUSTOMER" | "ADMIN" | "BOT";
    text: string;
    timestamp: string;
  }>;
}

const INITIAL_TICKETS: Ticket[] = [
  {
    id: "TCK-8821",
    customerName: "Alex Rivera",
    telegramUserId: "5829104",
    orderNumber: "PRIME-9024",
    category: "PAYMENT",
    priority: "HIGH",
    status: "OPEN",
    createdAt: "10 mins ago",
    messages: [
      { sender: "CUSTOMER", text: "Hello! I uploaded my GCash reference screenshot but my order status still shows Under Review.", timestamp: "10 mins ago" },
      { sender: "BOT", text: "Thank you for reaching out. An administrator has been notified and is verifying your GCash reference.", timestamp: "9 mins ago" },
    ],
  },
  {
    id: "TCK-8819",
    customerName: "Samantha Cruz",
    telegramUserId: "6910382",
    orderNumber: "PRIME-9018",
    category: "DELIVERY",
    priority: "MEDIUM",
    status: "IN_PROGRESS",
    createdAt: "45 mins ago",
    messages: [
      { sender: "CUSTOMER", text: "Can you please instruct the rider to ring the intercom upon arrival?", timestamp: "45 mins ago" },
      { sender: "ADMIN", text: "Noted with thanks Samantha! We have added the gate buzzer instruction to the courier dispatch notes.", timestamp: "30 mins ago" },
    ],
  },
  {
    id: "TCK-8812",
    customerName: "David Tan",
    telegramUserId: "4190823",
    category: "GENERAL",
    priority: "LOW",
    status: "RESOLVED",
    createdAt: "3 hours ago",
    messages: [
      { sender: "CUSTOMER", text: "What are your store hours today?", timestamp: "3 hours ago" },
      { sender: "ADMIN", text: "We are open 24/7 with active express courier dispatch until 2:00 AM.", timestamp: "2 hours ago" },
      { sender: "CUSTOMER", text: "Great, placing my cart now. Thank you!", timestamp: "2 hours ago" },
    ],
  },
];

const CANNED_REPLIES = [
  "Payment verified and cleared. Your order is now proceeding to packing.",
  "Rider has been assigned and is heading to your designated address.",
  "We are currently reviewing your receipt with our automated OCR engine.",
  "Thank you for contacting PRIME Support. Your request has been processed successfully.",
];

export default function AdminSupportPage() {
  const navigate = useNavigate();
  const [tickets, setTickets] = useState<Ticket[]>(INITIAL_TICKETS);
  const [selectedTicketId, setSelectedTicketId] = useState<string>("TCK-8821");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "OPEN" | "IN_PROGRESS" | "RESOLVED">("ALL");
  const [search, setSearch] = useState("");
  const [replyText, setReplyText] = useState("");
  const [broadcastText, setBroadcastText] = useState("");
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);

  const selectedTicket = tickets.find((t) => t.id === selectedTicketId) || tickets[0];

  const filteredTickets = tickets.filter((t) => {
    const matchStatus = filterStatus === "ALL" || t.status === filterStatus;
    const matchSearch =
      t.id.toLowerCase().includes(search.toLowerCase()) ||
      t.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (t.orderNumber && t.orderNumber.toLowerCase().includes(search.toLowerCase()));
    return matchStatus && matchSearch;
  });

  const handleSendReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    const updated = tickets.map((t) => {
      if (t.id === selectedTicket.id) {
        return {
          ...t,
          status: t.status === "OPEN" ? ("IN_PROGRESS" as const) : t.status,
          messages: [
            ...t.messages,
            {
              sender: "ADMIN" as const,
              text: replyText.trim(),
              timestamp: "Just now",
            },
          ],
        };
      }
      return t;
    });

    setTickets(updated);
    setReplyText("");
    toast.success("Response sent to customer.");
  };

  const handleStatusChange = (status: Ticket["status"]) => {
    if (!selectedTicket) return;
    const updated = tickets.map((t) => (t.id === selectedTicket.id ? { ...t, status } : t));
    setTickets(updated);
    toast.success(`Ticket marked as ${status}.`);
  };

  const handleBroadcast = (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastText.trim()) return;
    setShowBroadcastModal(false);
    setBroadcastText("");
    toast.success("Broadcast message queued for active Telegram customers.");
  };

  return (
    <div className="p-3 sm:p-4 w-full max-w-full space-y-3 bg-white text-black min-h-screen">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-b border-neutral-200 pb-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="p-1 text-neutral-500 hover:text-black rounded cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold uppercase tracking-tight font-condensed">
              SUPPORT & TICKET RESOLVER
            </h1>
            <p className="text-[11px] text-neutral-500 font-normal">
              Customer inquiry queue, Telegram live response & broadcast alerts
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowBroadcastModal(true)}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black text-white text-xs font-condensed uppercase rounded-lg hover:bg-neutral-800 transition cursor-pointer self-start sm:self-auto"
        >
          <Megaphone size={12} /> Telegram Broadcast
        </button>
      </div>

      {/* Main Support Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Ticket List Column */}
        <div className="space-y-3">
          {/* Search and Filters */}
          <div className="space-y-2">
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-neutral-400" />
              <input
                type="text"
                placeholder="Search tickets, names, order #..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs outline-none focus:border-black"
              />
            </div>
            <div className="flex gap-1 overflow-x-auto pb-1 text-[11px] font-condensed uppercase">
              {(["ALL", "OPEN", "IN_PROGRESS", "RESOLVED"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`px-2.5 py-1 rounded-md border whitespace-nowrap ${
                    filterStatus === st
                      ? "bg-black text-white border-black"
                      : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100"
                  }`}
                >
                  {st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          {/* Ticket Items */}
          <div className="space-y-2 max-h-[550px] overflow-y-auto pr-1">
            {filteredTickets.length === 0 ? (
              <div className="text-center py-8 text-xs text-neutral-400">No support tickets found.</div>
            ) : (
              filteredTickets.map((ticket) => {
                const isSelected = selectedTicket?.id === ticket.id;
                return (
                  <div
                    key={ticket.id}
                    onClick={() => setSelectedTicketId(ticket.id)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? "bg-neutral-50 border-black shadow-xs"
                        : "bg-white border-neutral-200 hover:border-neutral-400"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-xs font-mono">{ticket.id}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-condensed font-semibold ${
                          ticket.status === "OPEN"
                            ? "bg-rose-100 text-rose-700"
                            : ticket.status === "IN_PROGRESS"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {ticket.status.replace("_", " ")}
                      </span>
                    </div>
                    <div className="font-semibold text-xs text-neutral-900 mt-1">{ticket.customerName}</div>
                    <div className="text-[11px] text-neutral-500 truncate mt-0.5">
                      {ticket.messages[ticket.messages.length - 1]?.text}
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-neutral-400 mt-2 pt-1.5 border-t border-neutral-100">
                      <span>{ticket.category}</span>
                      <span>{ticket.createdAt}</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Active Ticket Conversation & Actions */}
        {selectedTicket && (
          <div className="md:col-span-2 bg-neutral-50 rounded-xl border border-neutral-300 flex flex-col h-[550px] overflow-hidden">
            {/* Thread Header */}
            <div className="p-3.5 bg-white border-b border-neutral-200 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm font-mono">{selectedTicket.id}</span>
                  <span className="text-xs font-semibold text-neutral-700">{selectedTicket.customerName}</span>
                  <span className="text-[10px] text-neutral-400 font-mono">TG ID: {selectedTicket.telegramUserId}</span>
                </div>
                {selectedTicket.orderNumber && (
                  <div className="text-[11px] text-blue-600 font-medium mt-0.5">
                    Associated Order: {selectedTicket.orderNumber}
                  </div>
                )}
              </div>

              {/* Status Action Buttons */}
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => handleStatusChange("IN_PROGRESS")}
                  className={`px-2.5 py-1 text-[10px] font-condensed uppercase rounded border ${
                    selectedTicket.status === "IN_PROGRESS" ? "bg-amber-500 text-white border-amber-500" : "bg-white text-neutral-700 border-neutral-300"
                  }`}
                >
                  In Progress
                </button>
                <button
                  type="button"
                  onClick={() => handleStatusChange("RESOLVED")}
                  className={`px-2.5 py-1 text-[10px] font-condensed uppercase rounded border ${
                    selectedTicket.status === "RESOLVED" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-neutral-700 border-neutral-300"
                  }`}
                >
                  Resolve
                </button>
              </div>
            </div>

            {/* Message Thread */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3">
              {selectedTicket.messages.map((msg, idx) => {
                const isAdmin = msg.sender === "ADMIN";
                const isBot = msg.sender === "BOT";
                return (
                  <div
                    key={idx}
                    className={`flex flex-col ${
                      isAdmin ? "items-end" : "items-start"
                    }`}
                  >
                    <div className="text-[10px] text-neutral-400 mb-0.5 flex items-center gap-1">
                      {isBot && <Bot size={11} className="text-blue-500" />}
                      <span>{msg.sender === "ADMIN" ? "PRIME Support (Admin)" : msg.sender === "BOT" ? "PRIME Auto-Bot" : selectedTicket.customerName}</span>
                      <span>•</span>
                      <span>{msg.timestamp}</span>
                    </div>
                    <div
                      className={`max-w-[80%] rounded-2xl px-3.5 py-2 text-xs leading-relaxed ${
                        isAdmin
                          ? "bg-black text-white rounded-br-none"
                          : isBot
                          ? "bg-blue-50 text-blue-900 border border-blue-200"
                          : "bg-white text-black border border-neutral-200 rounded-bl-none"
                      }`}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Quick Canned Replies */}
            <div className="px-3 py-2 bg-white border-t border-neutral-200 flex gap-1.5 overflow-x-auto text-[10px]">
              <span className="text-neutral-400 whitespace-nowrap self-center font-condensed uppercase">
                Quick Reply:
              </span>
              {CANNED_REPLIES.map((canned, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => setReplyText(canned)}
                  className="px-2 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 rounded-md whitespace-nowrap truncate max-w-[160px]"
                  title={canned}
                >
                  {canned}
                </button>
              ))}
            </div>

            {/* Reply Input Bar */}
            <form onSubmit={handleSendReply} className="p-3 bg-white border-t border-neutral-200 flex gap-2">
              <input
                type="text"
                placeholder="Type response to customer via Telegram..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl text-xs outline-none focus:border-black"
              />
              <button
                type="submit"
                className="px-4 py-2 bg-black text-white rounded-xl text-xs font-condensed uppercase flex items-center gap-1.5 hover:bg-neutral-800"
              >
                <Send size={13} /> Send
              </button>
            </form>
          </div>
        )}
      </div>

      {/* Broadcast Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full border border-neutral-300 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <div className="font-bold text-sm font-condensed uppercase">Send Telegram Broadcast Alert</div>
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="text-xs text-neutral-400 hover:text-black"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-neutral-500">
              Broadcast an urgent notification or store announcement to all registered customer Telegram accounts.
            </p>
            <textarea
              rows={4}
              placeholder="e.g. Flash Promo! Free delivery for the next 2 hours on all orders above ₱1,500."
              value={broadcastText}
              onChange={(e) => setBroadcastText(e.target.value)}
              className="w-full p-3 bg-neutral-50 border border-neutral-300 rounded-xl text-xs outline-none focus:border-black"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowBroadcastModal(false)}
                className="px-3 py-1.5 text-xs font-condensed uppercase border border-neutral-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBroadcast}
                className="px-4 py-1.5 text-xs font-condensed uppercase bg-black text-white rounded-lg hover:bg-neutral-800"
              >
                Send Broadcast
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
