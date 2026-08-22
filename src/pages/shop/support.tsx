import { Headphones, Send, ShieldCheck, MessageSquare } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

export default function SupportPage() {
  const [message, setMessage] = useState("");
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setMessage("");
      toast.success("Message dispatched to PRIME Operations Bot");
    }, 600);
  };

  return (
    <div className="bg-[#f3f4f6] min-h-full pb-10">
      <div className="bg-white border-b border-neutral-200 px-4 py-3">
        <h1
          className="text-black font-normal uppercase text-xl leading-tight"
          style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
        >
          24/7 CUSTOMER SUPPORT
        </h1>
        <p className="text-xs text-neutral-500 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
          Live Telegram Business Desk
        </p>
      </div>

      <div className="p-3 space-y-3">
        <div className="bg-white rounded-2xl border border-neutral-200/90 p-4 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-black text-white flex items-center justify-center">
              <Headphones size={24} />
            </div>
            <div>
              <div
                className="text-black font-normal text-base uppercase"
                style={{ fontFamily: "'Roboto Condensed', sans-serif" }}
              >
                DIRECT DISPATCH & DISPUTES
              </div>
              <div className="text-xs text-neutral-500 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
                Average response time: &lt; 2 minutes
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-blue-50/70 border border-blue-100 rounded-xl text-xs text-blue-900 space-y-1 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
            <div className="font-normal flex items-center gap-1.5" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
              <ShieldCheck size={14} className="text-blue-600" />
              Direct Bot Connection
            </div>
            <p className="text-[11px] text-blue-800 leading-relaxed font-normal">
              Your inquiry connects directly to our automated dispatch bot and authorized staff.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="mt-4 space-y-2.5">
            <label className="text-[11px] font-normal text-neutral-700 uppercase" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
              Send an Instant Inquiry
            </label>
            <textarea
              rows={3}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Describe your question or provide your order number..."
              className="w-full bg-neutral-50 border border-neutral-200 rounded-xl p-3 text-xs text-neutral-800 outline-none focus:border-black resize-none font-normal"
              style={{ fontFamily: "'Ubuntu', sans-serif" }}
            />
            <button
              type="submit"
              disabled={isSending || !message.trim()}
              className="w-full bg-black hover:bg-neutral-800 text-white font-normal py-2.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-xs disabled:opacity-40 transition-all"
              style={{
                fontFamily: "'Ubuntu', sans-serif",
                fontSize: "15px",
                letterSpacing: "0.5px",
              }}
            >
              <Send size={14} />
              {isSending ? "DISPATCHING INQUIRY..." : "SEND TO TELEGRAM DESK"}
            </button>
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200/90 p-4 shadow-xs space-y-2">
          <div className="flex items-center gap-2 text-black font-normal text-sm uppercase">
            <MessageSquare size={16} className="text-neutral-600" />
            <span style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>Frequently Asked Questions</span>
          </div>
          <div className="text-xs space-y-2 text-neutral-600 pt-1 font-normal" style={{ fontFamily: "'Ubuntu', sans-serif" }}>
            <div>
              <div className="font-normal text-neutral-900" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
                How do I track my queue position?
              </div>
              <p className="text-[11px] text-neutral-500 font-normal">
                Check the top queue monitor on your home screen or visit the Orders tab.
              </p>
            </div>
            <div className="pt-2 border-t border-neutral-100">
              <div className="font-normal text-neutral-900" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
                What payment methods are supported?
              </div>
              <p className="text-[11px] text-neutral-500 font-normal">
                We accept Telegram Pay, instant QR transfers, and OCR verified payment slips.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
