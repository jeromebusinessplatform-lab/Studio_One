import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCustomers, type Customer, type VipTier } from "@/hooks/useCustomers";
import {
  Users,
  Search,
  ArrowLeft,
  Crown,
  Download,
  Eye,
  Plus,
  Minus,
  X,
} from "lucide-react";
import { CustomerTableSkeleton } from "@/components/admin/CustomerTableSkeleton.tsx";
import { formatCurrency } from "@/lib/utils.ts";
import { toast } from "sonner";

const VIP_TIER_COLORS: Record<VipTier, string> = {
  Bronze: "bg-amber-100 text-amber-800 border-amber-300",
  Silver: "bg-neutral-200 text-neutral-800 border-neutral-400",
  Gold: "bg-yellow-100 text-yellow-800 border-yellow-400",
  Platinum: "bg-purple-100 text-purple-800 border-purple-400",
};

export default function AdminCustomersPage() {
  const navigate = useNavigate();
  const { customers, loading, updateCustomerVip, updateCustomerPoints } = useCustomers();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("ALL");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [pointsDelta, setPointsDelta] = useState<number>(50);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.telegramDisplayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.telegramUsername?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.telegramUserId.includes(searchTerm) ||
        c.primeMemberId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTier = selectedTier === "ALL" || c.vipTier.toUpperCase() === selectedTier.toUpperCase();
      return matchSearch && matchTier;
    });
  }, [customers, searchTerm, selectedTier]);

  const handleVipChange = async (customer: Customer, newTier: VipTier) => {
    try {
      await updateCustomerVip(customer.id, newTier);
      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer({ ...selectedCustomer, vipTier: newTier });
      }
      toast.success(`${customer.telegramDisplayName} upgraded to ${newTier} VIP.`);
    } catch {
      toast.error("Failed to update VIP Tier.");
    }
  };

  const handleAdjustPoints = async (customer: Customer, delta: number) => {
    try {
      const newPoints = Math.max(0, (customer.pointsBalance || 0) + delta);
      await updateCustomerPoints(customer.id, newPoints);
      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer({ ...selectedCustomer, pointsBalance: newPoints, points: newPoints });
      }
      toast.success(`Updated points balance to ${newPoints} pts.`);
    } catch {
      toast.error("Failed to adjust points balance.");
    }
  };

  const handleExportCsv = () => {
    const headers = "MemberID,Name,Username,TelegramID,VIPTier,Points,OrdersCount,TotalSpending\n";
    const rows = filteredCustomers
      .map(
        (c) =>
          `${c.primeMemberId},"${c.telegramDisplayName.replace(/"/g, '""')}",${c.telegramUsername || ""},${c.telegramUserId},${c.vipTier},${c.pointsBalance || c.points || 0},${c.orderCount},${c.totalSpending}`
      )
      .join("\n");

    const blob = new Blob([headers + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PRIME_Customers_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Customer list exported as CSV.");
  };

  return (
    <div className="p-3 sm:p-5 space-y-4 bg-white text-black min-h-screen font-condensed">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="p-1 text-neutral-500 hover:text-black rounded"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-bold uppercase tracking-tight">
              CUSTOMER MANAGEMENT & VIP PROFILES
            </h1>
            <p className="text-xs text-neutral-500 font-sans">
              Telegram members, loyalty points, tiers & spending history
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-black text-white text-xs font-condensed uppercase rounded-lg hover:bg-neutral-800 transition"
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1 font-sans">
          <Search size={14} className="absolute left-3 top-2.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search by name, username, Telegram ID, or Member ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-neutral-50 border border-neutral-300 rounded-lg text-xs outline-none focus:border-black"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto text-[11px] font-condensed uppercase">
          {(["ALL", "Bronze", "Silver", "Gold", "Platinum"] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setSelectedTier(tier)}
              className={`px-3 py-1.5 rounded-lg border whitespace-nowrap ${
                selectedTier === tier
                  ? "bg-black text-white border-black"
                  : "bg-neutral-50 text-neutral-600 border-neutral-200 hover:bg-neutral-100"
              }`}
            >
              {tier}
            </button>
          ))}
        </div>
      </div>

      {/* Customer Table */}
      {loading ? (
        <CustomerTableSkeleton rowCount={6} />
      ) : (
        <div className="bg-white rounded-xl border border-neutral-200 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left font-sans">
              <thead className="bg-neutral-50 text-neutral-600 border-b border-neutral-200 font-condensed uppercase text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Customer</th>
                  <th className="py-2.5 px-3">Member ID</th>
                  <th className="py-2.5 px-3">VIP Tier</th>
                  <th className="py-2.5 px-3">Points</th>
                  <th className="py-2.5 px-3">Orders</th>
                  <th className="py-2.5 px-3">Total Spend</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filteredCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-neutral-400">
                      No customers matched the query.
                    </td>
                  </tr>
                ) : (
                  filteredCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-neutral-50 transition-colors">
                      <td className="py-2.5 px-3">
                        <div className="font-semibold text-neutral-900">{c.telegramDisplayName}</div>
                        <div className="text-[10px] text-neutral-400 font-mono">
                          {c.telegramUsername ? `@${c.telegramUsername}` : `ID: ${c.telegramUserId}`}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-medium text-neutral-700">
                        {c.primeMemberId}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-condensed font-bold border ${
                            VIP_TIER_COLORS[c.vipTier] || "bg-neutral-100 text-neutral-700"
                          }`}
                        >
                          {c.vipTier}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-semibold text-amber-700">
                        {c.pointsBalance || c.points || 0} pts
                      </td>
                      <td className="py-2.5 px-3 font-medium">{c.orderCount || 0}</td>
                      <td className="py-2.5 px-3 font-mono font-bold text-neutral-900">
                        {formatCurrency(c.totalSpending || 0)}
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          type="button"
                          onClick={() => setSelectedCustomer(c)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded text-[11px] font-condensed uppercase"
                        >
                          <Eye size={12} /> Manage
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Customer Profile & Management Modal */}
      {selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-3">
          <div className="bg-white rounded-2xl p-5 max-w-md w-full border border-neutral-300 shadow-2xl space-y-4 font-condensed">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <div className="flex items-center gap-2">
                <Crown size={18} className="text-yellow-600" />
                <span className="text-base font-bold uppercase">Customer Profile & Controls</span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="text-neutral-400 hover:text-black"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 font-sans text-xs">
              <div className="p-3 bg-neutral-50 rounded-xl border border-neutral-200 space-y-1.5">
                <div className="text-sm font-bold text-neutral-900 font-condensed">
                  {selectedCustomer.telegramDisplayName}
                </div>
                <div className="flex items-center justify-between text-neutral-500 text-[11px]">
                  <span>Member ID: <strong className="font-mono text-black">{selectedCustomer.primeMemberId}</strong></span>
                  <span>TG ID: <strong className="font-mono text-black">{selectedCustomer.telegramUserId}</strong></span>
                </div>
                <div className="flex items-center justify-between text-neutral-500 text-[11px]">
                  <span>Lifetime Spend: <strong className="font-mono text-emerald-700">{formatCurrency(selectedCustomer.totalSpending || 0)}</strong></span>
                  <span>Orders: <strong className="font-mono text-black">{selectedCustomer.orderCount || 0}</strong></span>
                </div>
              </div>

              {/* VIP Tier Override */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold font-condensed uppercase text-neutral-700 block">
                  VIP Tier Assignment
                </label>
                <div className="grid grid-cols-4 gap-1.5 font-condensed">
                  {(["Bronze", "Silver", "Gold", "Platinum"] as const).map((tier) => (
                    <button
                      key={tier}
                      type="button"
                      onClick={() => handleVipChange(selectedCustomer, tier)}
                      className={`py-1 px-2 rounded-lg text-xs uppercase border ${
                        selectedCustomer.vipTier === tier
                          ? "bg-black text-white border-black font-bold"
                          : "bg-white text-neutral-700 border-neutral-300 hover:bg-neutral-100"
                      }`}
                    >
                      {tier}
                    </button>
                  ))}
                </div>
              </div>

              {/* Points Adjustment */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold font-condensed uppercase text-neutral-700 block">
                  Adjust Loyalty Balance (Current: {selectedCustomer.pointsBalance || selectedCustomer.points || 0} pts)
                </label>
                <div className="flex items-center gap-2 font-condensed">
                  <input
                    type="number"
                    min="1"
                    value={pointsDelta}
                    onChange={(e) => setPointsDelta(Number(e.target.value))}
                    className="w-24 px-2 py-1.5 border border-neutral-300 rounded-lg text-xs font-mono outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAdjustPoints(selectedCustomer, pointsDelta)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-emerald-600 text-white rounded-lg text-xs uppercase hover:bg-emerald-700"
                  >
                    <Plus size={13} /> Add
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustPoints(selectedCustomer, -pointsDelta)}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 bg-rose-600 text-white rounded-lg text-xs uppercase hover:bg-rose-700"
                  >
                    <Minus size={13} /> Deduct
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="px-4 py-1.5 bg-black text-white rounded-lg text-xs uppercase"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
