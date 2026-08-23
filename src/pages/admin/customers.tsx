import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useCustomers, type Customer, type VipTier } from "@/hooks/useCustomers";
import { useProducts } from "@/hooks/useProducts";
import { type Product } from "@/data/products";
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
  CheckSquare,
  Square,
  Trash2,
  Sparkles,
  Coins,
  ShoppingBag,
  Layers,
  Package,
} from "lucide-react";
import { CustomerTableSkeleton } from "@/components/admin/CustomerTableSkeleton.tsx";
import { AdminOverlayLoader } from "@/components/admin/AdminOverlayLoader.tsx";
import { BundleViewModal } from "@/components/admin/BundleViewModal.tsx";
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
  const {
    customers,
    loading,
    updateCustomerVip,
    updateCustomerPoints,
    deleteCustomer,
    batchUpdateVip,
    batchAdjustPoints,
    batchDeleteCustomers,
  } = useCustomers();
  const { products } = useProducts();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("ALL");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [viewingBundleProduct, setViewingBundleProduct] = useState<Product | null>(null);
  const [pointsDelta, setPointsDelta] = useState<number>(50);

  // Multi-select & Batch States
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [overlayLoading, setOverlayLoading] = useState<{
    isVisible: boolean;
    label: string;
    sublabel?: string;
  }>({
    isVisible: false,
    label: "",
  });

  const [showBatchVipModal, setShowBatchVipModal] = useState(false);
  const [showBatchPointsModal, setShowBatchPointsModal] = useState(false);
  const [batchTargetVip, setBatchTargetVip] = useState<VipTier>("Gold");
  const [batchPointsDelta, setBatchPointsDelta] = useState<number>(100);

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.telegramDisplayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.telegramUsername?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.telegramUserId.includes(searchTerm) ||
        c.primeMemberId.toLowerCase().includes(searchTerm.toLowerCase());
      const matchTier =
        selectedTier === "ALL" || c.vipTier.toUpperCase() === selectedTier.toUpperCase();
      return matchSearch && matchTier;
    });
  }, [customers, searchTerm, selectedTier]);

  // Multi-select logic
  const isAllSelected = useMemo(() => {
    if (filteredCustomers.length === 0) return false;
    return filteredCustomers.every((c) => selectedIds.includes(c.id));
  }, [filteredCustomers, selectedIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCustomers.map((c) => c.id));
    }
  };

  const toggleSelectCustomer = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleVipChange = async (customer: Customer, newTier: VipTier) => {
    setOverlayLoading({
      isVisible: true,
      label: "Updating VIP Tier...",
      sublabel: `Upgrading ${customer.telegramDisplayName} to ${newTier}`,
    });
    try {
      await updateCustomerVip(customer.id, newTier);
      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer({ ...selectedCustomer, vipTier: newTier });
      }
      toast.success(`${customer.telegramDisplayName} upgraded to ${newTier} VIP.`);
    } catch {
      toast.error("Failed to update VIP Tier.");
    } finally {
      setOverlayLoading({ isVisible: false, label: "" });
    }
  };

  const handleAdjustPoints = async (customer: Customer, delta: number) => {
    setOverlayLoading({
      isVisible: true,
      label: "Updating Points...",
      sublabel: `${delta > 0 ? "Adding" : "Deducting"} ${Math.abs(delta)} pts`,
    });
    try {
      const newPoints = Math.max(0, (customer.pointsBalance || 0) + delta);
      await updateCustomerPoints(customer.id, newPoints);
      if (selectedCustomer?.id === customer.id) {
        setSelectedCustomer({ ...selectedCustomer, pointsBalance: newPoints, points: newPoints });
      }
      toast.success(`Updated points balance to ${newPoints} pts.`);
    } catch {
      toast.error("Failed to adjust points balance.");
    } finally {
      setOverlayLoading({ isVisible: false, label: "" });
    }
  };

  // Batch Handlers
  const handleBatchVipConfirm = async () => {
    if (!selectedIds.length) return;
    setShowBatchVipModal(false);
    setOverlayLoading({
      isVisible: true,
      label: "Batch Updating VIP Tiers...",
      sublabel: `Setting ${selectedIds.length} profiles to ${batchTargetVip}`,
    });
    try {
      await batchUpdateVip(selectedIds, batchTargetVip);
      toast.success(`Updated ${selectedIds.length} customers to ${batchTargetVip} VIP`);
      setSelectedIds([]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to batch update VIP tiers");
    } finally {
      setOverlayLoading({ isVisible: false, label: "" });
    }
  };

  const handleBatchPointsConfirm = async () => {
    if (!selectedIds.length) return;
    setShowBatchPointsModal(false);
    setOverlayLoading({
      isVisible: true,
      label: "Batch Adjusting Points...",
      sublabel: `Applying ${batchPointsDelta > 0 ? "+" : ""}${batchPointsDelta} pts to ${selectedIds.length} profiles`,
    });
    try {
      await batchAdjustPoints(selectedIds, batchPointsDelta);
      toast.success(
        `Adjusted points (${batchPointsDelta > 0 ? "+" : ""}${batchPointsDelta}) for ${selectedIds.length} customers`
      );
      setSelectedIds([]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to batch adjust points");
    } finally {
      setOverlayLoading({ isVisible: false, label: "" });
    }
  };

  const handleBatchDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} customer records permanently?`)) return;

    setOverlayLoading({
      isVisible: true,
      label: "Batch Deleting Customers...",
      sublabel: `Removing ${selectedIds.length} records from Firestore`,
    });
    try {
      await batchDeleteCustomers(selectedIds);
      toast.success(`Deleted ${selectedIds.length} customers`);
      setSelectedIds([]);
    } catch (err: any) {
      toast.error(err?.message || "Failed to batch delete customers");
    } finally {
      setOverlayLoading({ isVisible: false, label: "" });
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
    <div className="p-3 sm:p-4 w-full max-w-full space-y-3 bg-white text-black min-h-screen font-condensed pb-24">
      <AdminOverlayLoader
        isVisible={overlayLoading.isVisible}
        label={overlayLoading.label}
        sublabel={overlayLoading.sublabel}
      />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-neutral-200 pb-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="p-1 text-neutral-500 hover:text-black rounded cursor-pointer"
          >
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-lg sm:text-xl font-bold uppercase tracking-tight">
              CUSTOMER MANAGEMENT & VIP PROFILES
            </h1>
            <p className="text-[11px] text-neutral-500 font-sans">
              Telegram members, loyalty points, tiers & spending history
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleExportCsv}
          className="flex items-center gap-1.5 px-2.5 py-1.5 bg-black text-white text-xs font-condensed uppercase rounded-lg hover:bg-neutral-800 transition cursor-pointer"
        >
          <Download size={13} /> Export CSV
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center justify-between">
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

        <div className="flex gap-1 overflow-x-auto text-[10px] sm:text-[11px] font-condensed uppercase">
          {(["ALL", "Bronze", "Silver", "Gold", "Platinum"] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setSelectedTier(tier)}
              className={`px-2.5 py-1.5 rounded-lg border whitespace-nowrap cursor-pointer transition ${
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

      {/* Select All & Summary Bar */}
      <div className="flex items-center justify-between px-1 text-[11px] text-neutral-600">
        <button
          type="button"
          onClick={toggleSelectAll}
          className="flex items-center gap-1.5 font-medium hover:text-black transition cursor-pointer"
        >
          {isAllSelected ? (
            <CheckSquare size={14} className="text-black" />
          ) : (
            <Square size={14} className="text-neutral-400" />
          )}
          <span>{isAllSelected ? "Deselect All" : "Select All"} ({filteredCustomers.length} Total)</span>
        </button>
        {selectedIds.length > 0 && (
          <span className="font-semibold text-black">{selectedIds.length} Selected</span>
        )}
      </div>

      {/* Floating Sticky Batch Action Bar when customers are selected */}
      {selectedIds.length > 0 && (
        <div className="sticky bottom-3 z-40 bg-neutral-950 text-white rounded-2xl p-3 shadow-2xl border border-neutral-800 flex flex-wrap items-center justify-between gap-2.5 animate-in slide-in-from-bottom-2 duration-200">
          <div className="flex items-center gap-2">
            <span className="w-6 h-6 rounded-full bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center font-mono">
              {selectedIds.length}
            </span>
            <span className="text-xs font-semibold uppercase tracking-tight font-condensed">
              {selectedIds.length === 1 ? "1 Customer Selected" : `${selectedIds.length} Customers Selected`}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <button
              type="button"
              onClick={() => setShowBatchVipModal(true)}
              className="min-h-[40px] px-3 bg-neutral-800 hover:bg-neutral-700 text-amber-300 rounded-xl text-xs font-medium flex items-center gap-1 border border-neutral-700 transition cursor-pointer"
            >
              <Crown size={13} /> Set VIP
            </button>

            <button
              type="button"
              onClick={() => setShowBatchPointsModal(true)}
              className="min-h-[40px] px-3 bg-neutral-800 hover:bg-neutral-700 text-emerald-300 rounded-xl text-xs font-medium flex items-center gap-1 border border-neutral-700 transition cursor-pointer"
            >
              <Coins size={13} /> Points
            </button>

            <button
              type="button"
              onClick={handleBatchDelete}
              className="min-h-[40px] px-3.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm active:scale-95"
            >
              <Trash2 size={13} /> Delete Selected ({selectedIds.length})
            </button>

            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="min-h-[40px] min-w-[40px] flex items-center justify-center text-neutral-400 hover:text-white rounded-xl hover:bg-neutral-800 transition cursor-pointer"
              title="Clear selection"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Batch Set VIP Modal */}
      {showBatchVipModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-neutral-300 shadow-2xl space-y-4 font-condensed">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <h3 className="text-sm font-bold uppercase">
                Assign VIP Tier for {selectedIds.length} Customers
              </h3>
              <button
                type="button"
                onClick={() => setShowBatchVipModal(false)}
                className="text-neutral-400 hover:text-black cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["Bronze", "Silver", "Gold", "Platinum"] as const).map((tier) => (
                <button
                  key={tier}
                  type="button"
                  onClick={() => setBatchTargetVip(tier)}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-center transition cursor-pointer ${
                    batchTargetVip === tier
                      ? "bg-black text-white border-black"
                      : "bg-neutral-50 text-neutral-700 border-neutral-300 hover:bg-neutral-100"
                  }`}
                >
                  {tier}
                </button>
              ))}
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowBatchVipModal(false)}
                className="px-3 py-1.5 border border-neutral-300 rounded-lg text-xs font-medium text-neutral-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBatchVipConfirm}
                className="px-4 py-1.5 bg-black text-white rounded-lg text-xs font-medium hover:bg-neutral-800 cursor-pointer"
              >
                Apply to {selectedIds.length} Customers
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Adjust Points Modal */}
      {showBatchPointsModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full border border-neutral-300 shadow-2xl space-y-4 font-condensed">
            <div className="flex items-center justify-between border-b border-neutral-200 pb-2">
              <h3 className="text-sm font-bold uppercase">
                Adjust Points for {selectedIds.length} Customers
              </h3>
              <button
                type="button"
                onClick={() => setShowBatchPointsModal(false)}
                className="text-neutral-400 hover:text-black cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="space-y-3 font-sans">
              <label className="text-xs text-neutral-600 font-medium block">
                Points Delta (use negative to deduct)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={batchPointsDelta}
                  onChange={(e) => setBatchPointsDelta(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-neutral-300 rounded-xl text-sm font-mono outline-none focus:border-black font-semibold"
                />
              </div>

              {/* Quick Presets */}
              <div className="flex gap-1.5 font-condensed">
                {[+50, +100, +250, +500, -50, -100].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setBatchPointsDelta(preset)}
                    className="flex-1 py-1 bg-neutral-100 hover:bg-neutral-200 rounded text-[11px] font-mono text-neutral-800 cursor-pointer"
                  >
                    {preset > 0 ? `+${preset}` : preset}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-neutral-100">
              <button
                type="button"
                onClick={() => setShowBatchPointsModal(false)}
                className="px-3 py-1.5 border border-neutral-300 rounded-lg text-xs font-medium text-neutral-700 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBatchPointsConfirm}
                className="px-4 py-1.5 bg-black text-white rounded-lg text-xs font-medium hover:bg-neutral-800 cursor-pointer"
              >
                Confirm Update
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Stacked Cards with Multi-Select */}
      {loading ? (
        <CustomerTableSkeleton rowCount={6} />
      ) : filteredCustomers.length === 0 ? (
        <div className="bg-white rounded-2xl border border-neutral-200 p-8 text-center text-xs text-neutral-400 font-sans">
          No customers matched the query.
        </div>
      ) : (
        <div className="flex-1 w-full flex flex-col gap-3">
          {filteredCustomers.map((c) => {
            const isSelected = selectedIds.includes(c.id);
            return (
              <div
                key={c.id}
                className={`bg-white rounded-2xl border transition p-3.5 shadow-2xs relative flex flex-col gap-3 ${
                  isSelected ? "border-black bg-neutral-50/70 ring-1 ring-black" : "border-neutral-200 hover:border-neutral-300"
                }`}
              >
                {/* Absolute Top-Right VIP Badge */}
                <div className="absolute top-2.5 right-2.5 z-10 pointer-events-none">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-[10px] font-condensed font-bold border shadow-2xs ${
                      VIP_TIER_COLORS[c.vipTier] || "bg-neutral-100 text-neutral-700"
                    }`}
                  >
                    {c.vipTier}
                  </span>
                </div>

                {/* Card Top Row: 48px Checkbox Hit Area, Name, IDs */}
                <div className="flex items-start justify-between gap-2 pr-20">
                  <div className="flex items-start gap-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => toggleSelectCustomer(c.id)}
                      className="min-w-[48px] min-h-[48px] -ml-2 -mt-2 flex items-center justify-center text-neutral-400 hover:text-black transition cursor-pointer shrink-0 rounded-xl"
                      title={isSelected ? "Deselect" : "Select"}
                    >
                      {isSelected ? (
                        <CheckSquare size={18} className="text-black" />
                      ) : (
                        <Square size={18} className="text-neutral-300 hover:text-neutral-500" />
                      )}
                    </button>
                    <div className="min-w-0 pt-0.5">
                      <div className="font-bold text-sm text-neutral-900 truncate">
                        {c.telegramDisplayName}
                      </div>
                      <div className="text-[10px] text-neutral-500 font-mono truncate mt-0.5">
                        {c.telegramUsername ? `@${c.telegramUsername}` : `ID: ${c.telegramUserId}`} • {c.primeMemberId}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Card Bottom Row: Metrics Chips */}
                <div className="grid grid-cols-3 gap-1.5 pt-2 border-t border-neutral-100 text-[11px] font-sans">
                  <div className="bg-neutral-50 rounded-xl p-2 text-center border border-neutral-100">
                    <div className="text-[9px] uppercase tracking-wider text-neutral-400 font-condensed font-bold">Loyalty Points</div>
                    <div className="font-mono font-bold text-amber-700 text-xs mt-0.5">
                      {c.pointsBalance || c.points || 0} pts
                    </div>
                  </div>

                  <div className="bg-neutral-50 rounded-xl p-2 text-center border border-neutral-100">
                    <div className="text-[9px] uppercase tracking-wider text-neutral-400 font-condensed font-bold">Orders</div>
                    <div className="font-mono font-bold text-neutral-800 text-xs mt-0.5">
                      {c.orderCount || 0}
                    </div>
                  </div>

                  <div className="bg-neutral-50 rounded-xl p-2 text-center border border-neutral-100">
                    <div className="text-[9px] uppercase tracking-wider text-neutral-400 font-condensed font-bold">Lifetime Spend</div>
                    <div className="font-mono font-bold text-emerald-700 text-xs mt-0.5 truncate">
                      {formatCurrency(c.totalSpending || 0)}
                    </div>
                  </div>
                </div>

                {/* 48px Manage Action Button */}
                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setSelectedCustomer(c)}
                    className="w-full sm:w-auto min-h-[48px] px-4 bg-neutral-900 hover:bg-black text-white rounded-xl text-xs font-condensed font-bold uppercase tracking-wide flex items-center justify-center gap-1.5 transition active:scale-95 cursor-pointer shadow-2xs"
                  >
                    <Eye size={13} /> Manage Profile & Balance
                  </button>
                </div>
              </div>
            );
          })}
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
                className="text-neutral-400 hover:text-black cursor-pointer"
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
                      className={`py-1 px-2 rounded-lg text-xs uppercase border cursor-pointer ${
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
                    className="flex-1 min-h-[46.5px] flex items-center justify-center gap-1 py-1.5 bg-emerald-600 text-white rounded-lg text-xs uppercase hover:bg-emerald-700 cursor-pointer"
                  >
                    <Plus size={13} /> Add
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdjustPoints(selectedCustomer, -pointsDelta)}
                    className="flex-1 min-h-[46.5px] flex items-center justify-center gap-1 py-1.5 bg-rose-600 text-white rounded-lg text-xs uppercase hover:bg-rose-700 cursor-pointer"
                  >
                    <Minus size={13} /> Deduct
                  </button>
                </div>
              </div>

              {/* VIP Catalog Bundles & Packages Available to Customer */}
              <div className="space-y-2 pt-2 border-t border-neutral-200">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold font-condensed uppercase text-neutral-700 flex items-center gap-1">
                    <Sparkles size={12} className="text-amber-500" />
                    Available Bundles & Tier Packages
                  </span>
                  <span className="text-[10px] text-neutral-400 font-mono">
                    {products.filter((p) => p.isCombination || (p.bundleItems && p.bundleItems.length > 0)).length} Bundles
                  </span>
                </div>

                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {products
                    .filter((p) => p.isCombination || (p.bundleItems && p.bundleItems.length > 0))
                    .map((bundleProd) => {
                      const currentPrice = bundleProd.salePrice ?? bundleProd.price;
                      const isOutOfStock = bundleProd.stock <= 0 || bundleProd.available === false;
                      return (
                        <div
                          key={bundleProd._id}
                          className="bg-white border border-amber-200/90 rounded-2xl p-3 shadow-2xs relative flex flex-col gap-2"
                        >
                          {/* Absolute Top-Right Badges */}
                          <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5 z-10 pointer-events-none">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded shadow-2xs text-white bg-amber-500 font-condensed tracking-wide">
                              BUNDLED
                            </span>
                            <span
                              className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                                isOutOfStock
                                  ? "bg-red-100 text-red-700 border border-red-200"
                                  : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                              }`}
                            >
                              {isOutOfStock ? "Out of Stock" : `Stock: ${bundleProd.stock}`}
                            </span>
                          </div>

                          {/* Top Section: Thumbnail + Identity */}
                          <div className="flex items-start gap-2.5 pr-24">
                            <div className="w-12 h-12 rounded-xl bg-neutral-50 border border-neutral-200 p-1 shrink-0 flex items-center justify-center overflow-hidden">
                              {bundleProd.image ? (
                                <img
                                  src={bundleProd.image}
                                  alt={bundleProd.name}
                                  className="w-full h-full object-contain"
                                  referrerPolicy="no-referrer"
                                />
                              ) : (
                                <ShoppingBag size={18} className="text-neutral-300" />
                              )}
                            </div>

                            <div className="flex-1 min-w-0">
                              <h4 className="font-bold text-black text-xs leading-tight truncate font-condensed">
                                {bundleProd.name}
                              </h4>

                              {/* Sub-name placeholder: VIEW BUNDLE hyperlink */}
                              <button
                                type="button"
                                onClick={() => setViewingBundleProduct(bundleProd)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-700 hover:text-amber-900 underline underline-offset-2 font-mono cursor-pointer mt-0.5 tracking-tight hover:opacity-80 transition"
                              >
                                <Sparkles size={10} className="text-amber-500 shrink-0" />
                                <span>VIEW BUNDLE ({bundleProd.bundleItems?.length || 0} ITEMS)</span>
                              </button>
                            </div>
                          </div>

                          {/* Middle Section: Price */}
                          <div className="flex items-baseline justify-between pt-1 border-t border-neutral-100 text-xs">
                            <span className="text-black font-bold text-sm font-mono">
                              {formatCurrency(currentPrice)}
                            </span>
                            <span className="text-[10px] text-neutral-500 font-sans">
                              {bundleProd.category || "Bundle Package"}
                            </span>
                          </div>

                          {/* Bottom Section: 48px Touch Target Quick Action */}
                          <div className="pt-1 border-t border-neutral-100 flex items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => setViewingBundleProduct(bundleProd)}
                              className="min-h-[46.5px] px-3 flex-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 rounded-xl text-[11px] font-condensed font-bold uppercase flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
                            >
                              <Sparkles size={12} className="text-amber-600" />
                              View Bundle Breakdown
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                toast.success(
                                  `Allocated bundle "${bundleProd.name}" offer to ${selectedCustomer.telegramDisplayName}`
                                );
                              }}
                              className="min-h-[46.5px] px-3 bg-neutral-900 hover:bg-black text-white rounded-xl text-[11px] font-condensed font-bold uppercase transition active:scale-95 cursor-pointer"
                            >
                              Assign Promo
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-neutral-200">
              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="min-h-[44px] px-5 bg-black text-white rounded-xl text-xs uppercase cursor-pointer active:scale-95 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Interactive Bundle Breakdown Modal */}
      <BundleViewModal
        bundleProduct={viewingBundleProduct}
        allProducts={products}
        onClose={() => setViewingBundleProduct(null)}
      />
    </div>
  );
}
