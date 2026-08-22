import { 
  ClipboardList, Package, Users, Truck, ReceiptText, BadgePercent, 
  TrendingUp, Wallet, Headphones, Settings, Stethoscope 
} from "lucide-react";
import { useNavigate } from "react-router-dom";

const modules = [
  { title: "ORDERS", icon: ClipboardList, to: "/admin/orders" },
  { title: "INVENTORY", icon: Package, to: "/admin/products" },
  { title: "CUSTOMERS", icon: Users, to: "/admin/customers" },
  { title: "COURIERS", icon: Truck, to: "/admin/courier" },
  { title: "CHARGES", icon: ReceiptText, to: "/admin/charges" },
  { title: "DISCOUNTS", icon: BadgePercent, to: "/admin/discounts" },
  { title: "ANALYTICS", icon: TrendingUp, to: "/admin/analytics" },
  { title: "CASHFLOW", icon: Wallet, to: "/admin/analytics" }, // Map to analytics for now
  { title: "SUPPORT", icon: Headphones, to: "/admin/support" },
  { title: "SYSTEM SETTINGS", icon: Settings, to: "/admin/settings" },
  { title: "RUN FULL DIAGNOSTICS", icon: Stethoscope, to: "#" },
];

export default function AdminDashboardPage() {
  const navigate = useNavigate();

  const handleDiagnostic = () => {
    alert("Running full system diagnostics...");
  };

  return (
    <section className="p-4 bg-white text-black min-h-screen" style={{ fontFamily: "'Roboto Condensed', sans-serif" }}>
      <header className="flex justify-between items-center mb-6 border-b border-black pb-4">
        <div className="text-3xl font-bold tracking-tighter">PRIME</div>
        <div className="text-right text-xs">
          <div>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase()} | {new Date().toLocaleTimeString()}</div>
          <div className="font-bold">FULL SYSTEM ACCESS</div>
        </div>
      </header>

      <div className="grid grid-cols-5 gap-2 mb-6 text-center border-b border-black pb-4">
        {[
          { label: "ON QUEUE", value: "6" },
          { label: "PROCESSING", value: "4" },
          { label: "EST. WAIT TIME", value: "44 MINUTES" },
          { label: "EST. DISPATCH TIME", value: "21 MINUTES" },
          { label: "ORDER TRAFFIC", value: "MODERATE" },
        ].map(stat => (
          <div key={stat.label}>
            <div className="text-[10px]">{stat.label}</div>
            <div className="font-bold text-sm">{stat.value}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-10">
        {modules.map(({ title, icon: Icon, to }) => (
          <button
            key={title}
            type="button"
            onClick={() => to === "#" ? handleDiagnostic() : navigate(to)}
            className="border border-black p-4 flex flex-col items-center gap-2 hover:bg-neutral-100 transition-colors"
          >
            <Icon size={32} />
            <span className="font-bold text-xs text-center">{title}</span>
          </button>
        ))}
      </div>

      <footer className="text-center text-[10px] text-neutral-500 uppercase tracking-widest mt-auto">
        USAGE OF THIS SYSTEM IS PROPRIETARY. DO NOT DISTRIBUTE OR COPY.
      </footer>
    </section>
  );
}
