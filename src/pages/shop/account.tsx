import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { useTelegram } from "@/context/TelegramContext.tsx";
import { useCustomers } from "@/hooks/useCustomers";
import { useOrders } from "@/hooks/useOrders";
import { User, Pencil, ShoppingBag } from "lucide-react";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { toast } from "sonner";

export default function AccountPage() {
  const { customer, isAuthenticated, isTelegramEnv, error: telegramError, isLoading: isTelegramLoading } = useTelegram();
  const { customers, refresh, updateCustomerAvatar } = useCustomers();
  const { orders } = useOrders(customer?.telegramUserId);
  const [avatarUrl, setAvatarUrl] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => { if (isAuthenticated) void refresh(); }, [isAuthenticated, refresh]);

  useEffect(() => {
    const customerRecord = customers.find((c) => c.telegramUserId === customer?.telegramUserId);
    setAvatarUrl(customerRecord?.avatarUrl || customer?.avatarUrl || "");
  }, [customers, customer]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !customer?.telegramUserId) return;
    setIsUpdating(true);
    try {
      let url = "";
      try {
        const storageRef = ref(storage, `avatars/${customer.telegramUserId}_${Date.now()}`);
        await uploadBytes(storageRef, file);
        url = await getDownloadURL(storageRef);
      } catch (fbErr) {
        console.warn("Firebase storage upload failed, using Data URL fallback:", fbErr);
        url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }
      await updateCustomerAvatar(customer.telegramUserId, url, true);
      setAvatarUrl(url);
      toast.success("Profile avatar updated successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to upload avatar.");
    } finally {
      setIsUpdating(false);
    }
  };

  if (isTelegramLoading) return <div className="min-h-[60vh] flex items-center justify-center p-6 text-center text-neutral-500"><div className="animate-pulse">Loading account...</div></div>;
  if (!isTelegramEnv || !customer) return <div className="min-h-[60vh] flex items-center justify-center p-6 text-center"><div><div className="font-bold text-lg">ACCOUNT UNAVAILABLE</div><p className="text-sm text-neutral-500 mt-2">Open PRIME from Telegram to access your customer account.</p>{telegramError && <p className="text-xs text-neutral-400 mt-2">{telegramError}</p>}</div></div>;

  const customerRecord = customers.find((c) => c.telegramUserId === customer.telegramUserId);
  const customerData = customerRecord || {
    id: customer.telegramUserId,
    telegramUserId: customer.telegramUserId,
    telegramDisplayName: customer.telegramDisplayName,
    telegramUsername: customer.telegramUsername,
    primeMemberId: "—",
    vipTier: "Bronze" as const,
    points: 0,
    memberSince: Date.now(),
    referrals: 0,
    totalSpending: 0,
    totalDiscounts: 0,
    appliedDiscounts: [],
    referees: [],
    referredBy: null,
    orderCount: 0,
    avatarUrl: customer.avatarUrl,
  };
  const hydratedOrderCount = orders.length;

  return (
    <div className="bg-[#f3f4f6] min-h-full pb-10">
      <div className="bg-white border-b border-neutral-200 px-4 py-3"><h1 className="text-black font-normal uppercase text-xl leading-tight">MY ACCOUNT</h1><p className="text-xs text-neutral-500 font-normal">SECURED CUSTOMER ACCESS</p></div>
      <div className="p-3 space-y-3">
        <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm text-center">
          <div className="relative w-20 h-20 rounded-full bg-neutral-200 mx-auto mb-3 flex items-center justify-center overflow-hidden">
            {avatarUrl ? <img src={avatarUrl} alt="Telegram profile avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : <User size={40} className="text-neutral-500" />}
            <button type="button" onClick={() => fileInputRef.current?.click()} disabled={isUpdating} title="Edit Avatar" className="absolute bottom-0 right-0 w-7 h-7 bg-black text-white rounded-full flex items-center justify-center shadow-md border-2 border-white hover:bg-neutral-800 transition-transform active:scale-90"><Pencil size={12} /></button>
          </div>
          <div className="text-lg font-bold">{customerData.telegramDisplayName}</div>
          <div className="text-neutral-500 text-sm mb-4">{customerData.telegramUsername ? `@${customerData.telegramUsername}` : "Telegram Customer"}</div>
          <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />
          <div className="grid grid-cols-2 gap-4 mt-2 text-xs text-left"><div className="border p-2 rounded"><div className="text-neutral-500">TELEGRAM UID</div><div>{customerData.telegramUserId}</div></div><div className="border p-2 rounded"><div className="text-neutral-500">PRIME MEMBER ID</div><div>{customerData.primeMemberId}</div></div></div>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm space-y-2 text-sm">
          <div className="flex justify-between"><span>VIP Tier Status:</span><span className="font-bold">{customerData.vipTier}</span></div>
          <div className="flex justify-between"><span>Points:</span><span className="font-bold">{customerData.points}</span></div>
          <div className="flex justify-between"><span>Member since:</span><span className="font-bold">{new Date(customerData.memberSince || Date.now()).toLocaleDateString()}</span></div>
          <div className="flex justify-between"><span>Order Count:</span><span className="font-bold">{hydratedOrderCount}</span></div>
          <div className="flex justify-between"><span>Total Spending:</span><span className="font-bold">₱{(customerData.totalSpending || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between"><span>Total Discounts Saved:</span><span className="font-bold text-emerald-600">₱{(customerData.totalDiscounts || 0).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
          <div className="flex justify-between"><span>Referrals Made:</span><span className="font-bold">{customerData.referrals || customerData.referees?.length || 0}</span></div>
          {customerData.referredBy && <div className="flex justify-between text-xs text-neutral-500 pt-1 border-t"><span>Referred By:</span><span className="font-mono">{customerData.referredBy}</span></div>}
        </div>

        <Link to="/shop/orders" className="bg-black text-white rounded-2xl p-4 shadow-sm flex items-center justify-between hover:bg-neutral-800 transition">
          <span className="flex items-center gap-2 text-sm font-bold uppercase"><ShoppingBag size={17} /> MY ORDERS ({hydratedOrderCount})</span>
          <span className="text-xs">VIEW ORDERS →</span>
        </Link>

        <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm">
          <h2 className="font-bold mb-3 text-sm flex items-center justify-between"><span>APPLIED DISCOUNTS & PROMOS</span><span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-normal">{(customerData.appliedDiscounts || []).length} used</span></h2>
          <div className="space-y-2">
            {(customerData.appliedDiscounts || []).map((disc: any, idx: number) => (
              <div key={idx} className="flex justify-between items-center text-xs border-b border-neutral-100 pb-2"><div><div className="font-bold text-black uppercase">{disc.code}</div><div className="text-[10px] text-neutral-400">Order #{disc.orderNumber} • {new Date(disc.date).toLocaleDateString()}</div></div><div className="font-bold text-emerald-600">-₱{(disc.amountSaved || 0).toFixed(2)}</div></div>
            ))}
            {!(customerData.appliedDiscounts || []).length && <div className="text-xs text-neutral-500 text-center py-3">No promo codes or discounts applied yet.</div>}
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm"><h2 className="font-bold mb-3 text-sm">RECENT ORDERS</h2><div className="space-y-2">{orders.slice(0, 5).map((order) => <div key={order._id} className="flex justify-between text-xs border-b pb-2"><div>{order.orderNumber}</div><div>{order.orderStatus}</div><div>₱{order.total.toFixed(2)}</div></div>)}{!orders.length && <div className="text-xs text-neutral-500">No orders yet.</div>}</div></div>
      </div>
    </div>
  );
}
