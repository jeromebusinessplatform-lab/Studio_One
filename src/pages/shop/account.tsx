import { useTelegram } from "@/context/TelegramContext.tsx";
import { useCustomers } from "@/hooks/useCustomers";
import { useOrders } from "@/hooks/useOrders";
import { User, ShieldCheck, ShoppingBag, Bell, HelpCircle } from "lucide-react";

export default function AccountPage() {
  const { customer } = useTelegram();
  const { customers } = useCustomers();
  const { orders } = useOrders(customer?.telegramUserId);

  const customerData = customers.find(c => c.telegramUserId === customer?.telegramUserId);

  if (!customerData) return <div>Loading...</div>;

  return (
    <div className="bg-[#f3f4f6] min-h-full pb-10">
      <div className="bg-white border-b border-neutral-200 px-4 py-3">
        <h1 className="text-black font-normal uppercase text-xl leading-tight">MY ACCOUNT</h1>
        <p className="text-xs text-neutral-500 font-normal">SECURED CUSTOMER ACCESS</p>
      </div>

      <div className="p-3 space-y-3">
        {/* Profile Card */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm text-center">
            <div className="w-20 h-20 rounded-full bg-neutral-200 mx-auto mb-3 flex items-center justify-center">
                <User size={40} className="text-neutral-500" />
            </div>
            <div className="text-lg font-bold">{customerData.telegramDisplayName}</div>
            <div className="text-neutral-500 text-sm">@{customerData.telegramUsername}</div>
            
            <div className="grid grid-cols-2 gap-4 mt-6 text-xs text-left">
                <div className="border p-2 rounded">
                    <div className="text-neutral-500">TELEGRAM UID</div>
                    <div>{customerData.telegramUserId}</div>
                </div>
                <div className="border p-2 rounded">
                    <div className="text-neutral-500">PRIME MEMBER ID</div>
                    <div>{customerData.primeMemberId}</div>
                </div>
            </div>
        </div>

        {/* Membership Summary */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm space-y-2 text-sm">
            <div className="flex justify-between">
                <span>VIP Tier Status:</span>
                <span className="font-bold">{customerData.vipTier}</span>
            </div>
            <div className="flex justify-between">
                <span>Points:</span>
                <span className="font-bold">{customerData.points}</span>
            </div>
            <div className="flex justify-between">
                <span>Member since:</span>
                <span className="font-bold">{new Date(customerData.memberSince).toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between">
                <span>Order Count:</span>
                <span className="font-bold">{customerData.orderCount}</span>
            </div>
            <div className="flex justify-between">
                <span>Total Spending:</span>
                <span className="font-bold">₱{customerData.totalSpending.toFixed(2)}</span>
            </div>
        </div>
        
        {/* Recent Orders */}
        <div className="bg-white rounded-2xl border border-neutral-200 p-4 shadow-sm">
            <h2 className="font-bold mb-3">RECENT ORDERS</h2>
            <div className="space-y-2">
                {orders.slice(0, 5).map(order => (
                    <div key={order._id} className="flex justify-between text-xs border-b pb-2">
                        <div>{order.orderNumber}</div>
                        <div>{order.orderStatus}</div>
                        <div>₱{order.total.toFixed(2)}</div>
                    </div>
                ))}
            </div>
        </div>
      </div>
    </div>
  );
}
