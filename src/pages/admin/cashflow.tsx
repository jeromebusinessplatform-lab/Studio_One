import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  DollarSign,
  CreditCard,
  Building,
  Download,
  Plus,
  Trash2,
  Calendar,
  Filter,
  CheckCircle2,
  Clock,
  ArrowLeft,
  Coins,
} from "lucide-react";
import { useOrders } from "@/hooks/useOrders.ts";
import { formatCurrency } from "@/lib/utils.ts";
import { toast } from "sonner";

interface ExpenseItem {
  id: string;
  description: string;
  category: "Rider Payout" | "Inventory Restock" | "Packaging & Supplies" | "Platform Fees" | "Other";
  amount: number;
  date: string;
  status: "PAID" | "PENDING";
}

const INITIAL_EXPENSES: ExpenseItem[] = [
  { id: "exp-1", description: "Batch Courier Fuel & Base Payout", category: "Rider Payout", amount: 1850, date: "Today, 09:30 AM", status: "PAID" },
  { id: "exp-2", description: "Thermal Seal Bags & Tamper Stickers", category: "Packaging & Supplies", amount: 1200, date: "Yesterday", status: "PAID" },
  { id: "exp-3", description: "Wholesale Beverage & Snack Restock", category: "Inventory Restock", amount: 14500, date: "20-Aug-2026", status: "PAID" },
];

export default function AdminCashflowPage() {
  const navigate = useNavigate();
  const { allOrders } = useOrders();
  const [timeframe, setTimeframe] = useState<"TODAY" | "7DAYS" | "30DAYS" | "ALL">("30DAYS");
  const [expenses, setExpenses] = useState<ExpenseItem[]>(INITIAL_EXPENSES);
  const [newExpDesc, setNewExpDesc] = useState("");
  const [newExpAmount, setNewExpAmount] = useState("");
  const [newExpCategory, setNewExpCategory] = useState<ExpenseItem["category"]>("Rider Payout");
  const [isAddingExpense, setIsAddingExpense] = useState(false);

  // Filter orders by status
  const confirmedOrders = useMemo(
    () => allOrders.filter((o) => ["DELIVERED", "PAYMENT_CONFIRMED", "READY", "DISPATCHED"].includes(o.orderStatus)),
    [allOrders]
  );

  const pendingOrders = useMemo(
    () => allOrders.filter((o) => ["REVIEW", "PAYMENT_FAILED", "HOLD_ORDER"].includes(o.orderStatus)),
    [allOrders]
  );

  // Totals calculation
  const grossVolume = useMemo(() => allOrders.reduce((sum, o) => sum + (o.total || 0), 0), [allOrders]);
  const collectedCash = useMemo(() => confirmedOrders.reduce((sum, o) => sum + (o.total || 0), 0), [confirmedOrders]);
  const pendingCash = useMemo(() => pendingOrders.reduce((sum, o) => sum + (o.total || 0), 0), [pendingOrders]);
  const totalExpenses = useMemo(() => expenses.reduce((sum, e) => sum + e.amount, 0), [expenses]);
  const netOperatingCash = collectedCash - totalExpenses;

  // Payment method breakdown
  const paymentBreakdown = useMemo(() => {
    const counts: Record<string, { count: number; total: number }> = {
      GCASH: { count: 0, total: 0 },
      MAYA: { count: 0, total: 0 },
      BANK_TRANSFER: { count: 0, total: 0 },
      COD: { count: 0, total: 0 },
    };

    confirmedOrders.forEach((order) => {
      const method = (order.paymentMethodName || "GCASH").toUpperCase();
      if (counts[method]) {
        counts[method].count += 1;
        counts[method].total += order.total || 0;
      } else {
        counts.GCASH.count += 1;
        counts.GCASH.total += order.total || 0;
      }
    });

    return counts;
  }, [confirmedOrders]);

  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpDesc.trim() || !newExpAmount || Number(newExpAmount) <= 0) {
      toast.error("Please enter a valid expense description and positive amount.");
      return;
    }

    const item: ExpenseItem = {
      id: `exp-${Date.now()}`,
      description: newExpDesc.trim(),
      category: newExpCategory,
      amount: Number(newExpAmount),
      date: "Just now",
      status: "PAID",
    };

    setExpenses([item, ...expenses]);
    setNewExpDesc("");
    setNewExpAmount("");
    setIsAddingExpense(false);
    toast.success("Expense recorded into ledger.");
  };

  const handleDeleteExpense = (id: string) => {
    setExpenses(expenses.filter((e) => e.id !== id));
    toast.info("Expense entry removed.");
  };

  const handleExportCsv = () => {
    const headers = "Type,ID/Reference,Description,Amount,Status,Date\n";
    const orderRows = confirmedOrders
      .map((o) => `Income,${o.orderNumber},Order Sale,${o.total},${o.paymentStatus},${new Date(o._creationTime).toLocaleDateString()}`)
      .join("\n");
    const expRows = expenses
      .map((e) => `Expense,${e.id},"${e.description.replace(/"/g, '""')}",-${e.amount},${e.status},${e.date}`)
      .join("\n");

    const blob = new Blob([headers + orderRows + "\n" + expRows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `PRIME_Cashflow_Report_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Financial ledger exported as CSV.");
  };

  return (
    <div className="p-3 sm:p-5 space-y-5 bg-white text-black min-h-screen">
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
            <h1 className="text-xl font-bold uppercase tracking-tight font-condensed">
              CASHFLOW & FINANCIAL LEDGER
            </h1>
            <p className="text-xs text-neutral-500">
              Live settlement reconciliation, payment channels & expense logging
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

      {/* Main KPI Stats Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-condensed uppercase">
            <span>Gross Inflow</span>
            <ArrowDownLeft size={15} className="text-emerald-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono mt-1 text-black">
            {formatCurrency(grossVolume)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">{allOrders.length} total orders</div>
        </div>

        <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-condensed uppercase">
            <span>Collected Cash</span>
            <CheckCircle2 size={15} className="text-blue-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono mt-1 text-emerald-700">
            {formatCurrency(collectedCash)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">{confirmedOrders.length} verified paid</div>
        </div>

        <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-condensed uppercase">
            <span>Total Expenses</span>
            <ArrowUpRight size={15} className="text-rose-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono mt-1 text-rose-700">
            {formatCurrency(totalExpenses)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">{expenses.length} disbursements</div>
        </div>

        <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-200">
          <div className="flex items-center justify-between text-neutral-500 text-xs font-condensed uppercase">
            <span>Net Operating Margin</span>
            <Wallet size={15} className="text-amber-600" />
          </div>
          <div className="text-lg sm:text-xl font-bold font-mono mt-1 text-black">
            {formatCurrency(netOperatingCash)}
          </div>
          <div className="text-[10px] text-neutral-400 mt-0.5">Cleared cash on hand</div>
        </div>
      </div>

      {/* Payment Gateway Breakdown */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs space-y-3">
        <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-600 font-condensed">
          PAYMENT CHANNEL RECONCILIATION
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
            <div className="flex items-center justify-between text-xs font-semibold text-blue-700">
              <span>GCash</span>
              <Coins size={14} />
            </div>
            <div className="text-base font-bold font-mono mt-1">
              {formatCurrency(paymentBreakdown.GCASH.total)}
            </div>
            <div className="text-[10px] text-neutral-500">{paymentBreakdown.GCASH.count} transactions</div>
          </div>

          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
            <div className="flex items-center justify-between text-xs font-semibold text-emerald-700">
              <span>Maya</span>
              <CreditCard size={14} />
            </div>
            <div className="text-base font-bold font-mono mt-1">
              {formatCurrency(paymentBreakdown.MAYA.total)}
            </div>
            <div className="text-[10px] text-neutral-500">{paymentBreakdown.MAYA.count} transactions</div>
          </div>

          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
            <div className="flex items-center justify-between text-xs font-semibold text-purple-700">
              <span>Bank Transfer</span>
              <Building size={14} />
            </div>
            <div className="text-base font-bold font-mono mt-1">
              {formatCurrency(paymentBreakdown.BANK_TRANSFER.total)}
            </div>
            <div className="text-[10px] text-neutral-500">{paymentBreakdown.BANK_TRANSFER.count} transactions</div>
          </div>

          <div className="p-3 bg-neutral-50 rounded-lg border border-neutral-200">
            <div className="flex items-center justify-between text-xs font-semibold text-amber-700">
              <span>Cash on Delivery</span>
              <DollarSign size={14} />
            </div>
            <div className="text-base font-bold font-mono mt-1">
              {formatCurrency(paymentBreakdown.COD.total)}
            </div>
            <div className="text-[10px] text-neutral-500">{paymentBreakdown.COD.count} transactions</div>
          </div>
        </div>
      </div>

      {/* Operational Expenses & Ledger Section */}
      <div className="bg-white border border-neutral-200 rounded-xl p-4 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-600 font-condensed">
              OPERATIONAL EXPENSES & DISBURSEMENTS
            </h2>
            <p className="text-xs text-neutral-500">Record logistics payouts, restock costs, and supply expenses</p>
          </div>
          <button
            type="button"
            onClick={() => setIsAddingExpense(!isAddingExpense)}
            className="flex items-center gap-1 px-3 py-1.5 bg-black text-white text-xs font-condensed uppercase rounded-lg hover:bg-neutral-800"
          >
            <Plus size={13} /> {isAddingExpense ? "Cancel" : "Record Expense"}
          </button>
        </div>

        {isAddingExpense && (
          <form onSubmit={handleAddExpense} className="p-3 bg-neutral-50 rounded-xl border border-neutral-300 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="text-[11px] font-condensed uppercase text-neutral-600 block mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Courier fuel allowance"
                  value={newExpDesc}
                  onChange={(e) => setNewExpDesc(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs outline-none focus:border-black"
                />
              </div>
              <div>
                <label className="text-[11px] font-condensed uppercase text-neutral-600 block mb-1">
                  Category
                </label>
                <select
                  value={newExpCategory}
                  onChange={(e) => setNewExpCategory(e.target.value as ExpenseItem["category"])}
                  className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs outline-none focus:border-black"
                >
                  <option value="Rider Payout">Rider Payout</option>
                  <option value="Inventory Restock">Inventory Restock</option>
                  <option value="Packaging & Supplies">Packaging & Supplies</option>
                  <option value="Platform Fees">Platform Fees</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="text-[11px] font-condensed uppercase text-neutral-600 block mb-1">
                  Amount (₱)
                </label>
                <input
                  type="number"
                  min="1"
                  step="0.01"
                  placeholder="0.00"
                  value={newExpAmount}
                  onChange={(e) => setNewExpAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-neutral-300 rounded-lg text-xs outline-none focus:border-black"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddingExpense(false)}
                className="px-3 py-1 text-xs border border-neutral-300 rounded-lg font-condensed uppercase"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1 bg-black text-white text-xs rounded-lg font-condensed uppercase hover:bg-neutral-800"
              >
                Save Entry
              </button>
            </div>
          </form>
        )}

        {/* Expenses List */}
        <div className="space-y-2">
          {expenses.length === 0 ? (
            <div className="text-center py-6 text-xs text-neutral-400">No expenses recorded yet.</div>
          ) : (
            expenses.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between p-2.5 bg-white rounded-lg border border-neutral-200 text-xs"
              >
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-neutral-900 truncate">{item.description}</div>
                  <div className="text-[10px] text-neutral-500 flex items-center gap-2 mt-0.5">
                    <span className="bg-neutral-100 px-1.5 py-0.5 rounded text-neutral-700">{item.category}</span>
                    <span>{item.date}</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-rose-600">-{formatCurrency(item.amount)}</span>
                  <button
                    type="button"
                    onClick={() => handleDeleteExpense(item.id)}
                    className="p-1 text-neutral-400 hover:text-rose-600"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
