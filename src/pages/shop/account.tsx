import { useEffect, useState, useRef } from "react";
import { useTelegram } from "@/context/TelegramContext.tsx";
import { useCustomers } from "@/hooks/useCustomers";
import { useOrders } from "@/hooks/useOrders";
import { User, Pencil, UserRound, Copy, Check } from "lucide-react";
import { toast } from "sonner";
import { PrimeMemberLink } from "@/components/PrimeMemberProfile.tsx";

type Referrer = { telegramDisplayName: string; telegramUsername: string | null; primeMemberId: string; vipTier: string };
const AVATAR_KEY = "prime_member_avatar_data";

async function imageFileToDataUrl(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Please select an image file.");
  if (file.size > 2 * 1024 * 1024) throw new Error("Image must be 2 MB or smaller.");
  return await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result || "")); reader.onerror = () => reject(new Error("Unable to read image file.")); reader.readAsDataURL(file); });
}

export default function AccountPage() {
  const { customer, isAuthenticated, isTelegramEnv, error: telegramError, isLoading: isTelegramLoading } = useTelegram();
  const { customers, refresh } = useCustomers();
  const { orders } = useOrders(customer?.telegramUserId);
  const [avatarUrl, setAvatarUrl] = useState("");
  const [referrer, setReferrer] = useState<Referrer | null>(null);
  const [midCopied, setMidCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => { if (isAuthenticated) void refresh(); }, [isAuthenticated, refresh]);
  useEffect(() => {
    const id = String(customer?.telegramUserId || "");
    const customerRecord = customers.find((c) => c.telegramUserId === id);
    let stored = ""; try { stored = id ? localStorage.getItem(`${AVATAR_KEY}:${id}`) || "" : ""; } catch {}
    setAvatarUrl(stored || customerRecord?.avatarUrl || customer?.avatarUrl || "");
  }, [customers, customer]);
  useEffect(() => {
    if (!isAuthenticated) return;
    fetch("/api/account/referrer", { credentials: "same-origin", cache: "no-store" }).then(async (response) => { const data = await response.json().catch(() => ({})); return response.ok ? data.referrer || null : null; }).then(setReferrer).catch(() => setReferrer(null));
  }, [isAuthenticated, customer?.telegramUserId]);

  const handleCopyMid = async () => {
    const mid = String(customerData.primeMemberId || "").trim(); if (!mid || mid === "—") return;
    try { await navigator.clipboard.writeText(mid); } catch { const area = document.createElement("textarea"); area.value = mid; area.style.position = "fixed"; area.style.opacity = "0"; document.body.appendChild(area); area.select(); document.execCommand("copy"); area.remove(); }
    setMidCopied(true); window.setTimeout(() => setMidCopied(false), 1400);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file || !customer?.telegramUserId) return;
    setIsUpdating(true);
    try { const dataUrl = await imageFileToDataUrl(file); localStorage.setItem(`${AVATAR_KEY}:${customer.telegramUserId}`, dataUrl); setAvatarUrl(dataUrl); toast.success("Profile avatar updated successfully!"); }
    catch (error: any) { console.error(error); toast.error(error?.message || "Failed to upload avatar."); }
    finally { setIsUpdating(false); e.target.value = ""; }
  };

  if (isTelegramLoading) return <div className="min-h-[60vh] flex items-center justify-center p-6 text-center text-neutral-500"><div className="animate-pulse">Loading account...</div></div>;
  if (!isTelegramEnv || !customer) return <div className="min-h-[60vh] flex items-center justify-center p-6 text-center"><div><div className="font-bold text-lg">ACCOUNT UNAVAILABLE</div><p className="text-sm text-neutral-500 mt-2">Open PRIME from Telegram to access your customer account.</p>{telegramError && <p className="text-xs text-neutral-400 mt-2">{telegramError}</p>}</div></div>;

  const customerRecord = customers.find((c) => c.telegramUserId === customer.telegramUserId);
  const customerData = customerRecord || { id: customer.telegramUserId, telegramUserId: customer.telegramUserId, telegramDisplayName: customer.telegramDisplayName, telegramUsername: customer.telegramUsername, primeMemberId: customer.primeMemberId || "—", vipTier: "Bronze" as const, points: 0, memberSince: Date.now(), referrals: 0, totalSpending: 0, totalDiscounts: 0, appliedDiscounts: [], referees: [], referredBy: null, orderCount: 0, avatarUrl: customer.avatarUrl };
  const hydratedOrderCount = orders.length;
  const referralCount = customerData.referrals || customerData.referees?.length || 0;

  return <div className="bg-[#f3f4f6] min-h-full pb-10">
    <div className="bg-white border-b border-neutral-200 px-4 py-3"><h1 className="text-black font-normal uppercase text-xl leading-tight">MY ACCOUNT</h1><p className="text-xs text-neutral-500 font-normal">SECURED CUSTOMER ACCESS</p></div>
    <div className="p-3 space-y-3">
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm text-center"><div className="relative w-20 h-20 rounded-full bg-neutral-200 mx-auto mb-3 flex items-center justify-center overflow-hidden">{avatarUrl ? <img src={avatarUrl} alt="Profile avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <User size={40} className="text-neutral-500" />}<button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUpdating} title="Edit Avatar" className="absolute bottom-0 right-0 w-7 h-7 bg-black text-white rounded-full flex items-center justify-center shadow-md border-2 border-white"><Pencil size={12} /></button></div><div className="text-lg font-bold">{customerData.telegramDisplayName}</div><div className="text-neutral-500 text-sm mb-4">{customerData.telegramUsername ? `@${customerData.telegramUsername}` : "Telegram Customer"}</div><input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" /><div className="grid grid-cols-2 gap-4 mt-2 text-xs text-left"><div className="border p-2 rounded"><div className="text-neutral-500">TELEGRAM UID</div><div className="font-critical-data">{customerData.telegramUserId}</div></div><div className="border p-2 rounded"><div className="text-neutral-500">PRIME MEMBER ID</div><div className="flex items-center gap-1.5"><PrimeMemberLink primeMemberId={customerData.primeMemberId} className="text-neutral-900 font-bold no-underline hover:no-underline" /><button type="button" onClick={handleCopyMid} className="inline-flex h-6 w-6 items-center justify-center rounded-md text-neutral-500">{midCopied ? <Check size={13} /> : <Copy size={13} />}</button></div></div></div></div>
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm space-y-2 text-sm"><div className="flex justify-between"><span>VIP Tier Status:</span><span className="font-bold">{customerData.vipTier}</span></div><div className="flex justify-between"><span>Points:</span><span className="font-critical-data font-bold">{customerData.points}</span></div><div className="flex justify-between"><span>Member since:</span><span className="font-critical-data font-bold">{new Date(customerData.memberSince || Date.now()).toLocaleDateString()}</span></div><div className="flex justify-between"><span>Order Count:</span><span className="font-critical-data font-bold">{hydratedOrderCount}</span></div><div className="flex justify-between"><span>Total Spending:</span><span className="font-critical-data font-bold">₱{(customerData.totalSpending || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div><div className="flex justify-between"><span>Total Discounts Saved:</span><span className="font-critical-data font-bold text-emerald-600">₱{(customerData.totalDiscounts || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div><div className="flex justify-between"><span>Referrals Made:</span><button type="button" onClick={() => window.dispatchEvent(new CustomEvent("prime:open-referrals"))} className="font-critical-data font-bold underline decoration-dotted">{referralCount.toLocaleString()}</button></div></div>
      {referrer && <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm"><div className="text-[10px] uppercase tracking-[0.18em] font-bold text-neutral-500 mb-3 flex items-center gap-2"><UserRound size={14} /> Referred By</div><div className="flex items-center justify-between gap-3"><div className="min-w-0"><div className="font-bold text-sm truncate">{referrer.telegramDisplayName}</div><div className="text-[11px] text-neutral-500 truncate">{referrer.telegramUsername ? `@${referrer.telegramUsername}` : "Telegram handle not set"} • {referrer.vipTier}</div></div><PrimeMemberLink primeMemberId={referrer.primeMemberId} className="text-xs no-underline hover:no-underline" /></div></div>}
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm"><h2 className="font-bold mb-3 text-sm flex items-center justify-between"><span>APPLIED DISCOUNTS & PROMOS</span><span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-normal">{(customerData.appliedDiscounts || []).length} used</span></h2><div className="space-y-2">{(customerData.appliedDiscounts || []).map((disc: any, idx: number) => <div key={idx} className="flex justify-between items-center text-xs border-b border-neutral-100 pb-2"><div><div className="font-bold text-black uppercase">{disc.code}</div><div className="text-[10px] text-neutral-400">Order #{disc.orderNumber} • {new Date(disc.date).toLocaleDateString()}</div></div><div className="font-critical-data font-bold text-emerald-600">-₱{(disc.amountSaved || 0).toFixed(2)}</div></div>)}{!(customerData.appliedDiscounts || []).length && <div className="text-xs text-neutral-500 text-center py-3">No promo codes or discounts applied yet.</div>}</div></div>
      <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm"><h2 className="font-bold mb-3 text-sm">RECENT ORDERS</h2><div className="space-y-2">{orders.slice(0, 5).map((order) => <div key={order._id} className="flex justify-between text-xs border-b pb-2"><div className="font-critical-data">{order.orderNumber}</div><div>{order.orderStatus}</div><PrimeMemberLink primeMemberId={order.primeMemberId} className="text-neutral-700 no-underline hover:no-underline" /></div>)}{!orders.length && <div className="text-xs text-neutral-500">No orders yet.</div>}</div></div>
    </div>
  </div>;
}
