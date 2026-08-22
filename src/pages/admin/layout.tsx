import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useAdmin } from "@/context/AdminContext.tsx";
import { ShoppingBag, Package, LogOut, Truck, ArrowLeft, Users, ReceiptText, BadgePercent, LayoutDashboard } from "lucide-react";
import PrimeLogo from "@/components/PrimeLogo.tsx";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Home", end: true },
  { to: "/admin/orders", icon: ShoppingBag, label: "Orders" },
  { to: "/admin/products", icon: Package, label: "Inventory" },
  { to: "/admin/customers", icon: Users, label: "Customers" },
  { to: "/admin/courier", icon: Truck, label: "Logistics" },
  { to: "/admin/charges", icon: ReceiptText, label: "Charges" },
  { to: "/admin/discounts", icon: BadgePercent, label: "Discounts" },
];

export default function AdminLayout() {
  const { logout } = useAdmin();
  const navigate = useNavigate();
  const handleLogout = () => { logout(); navigate("/admin"); };

  return <div className="min-h-screen bg-[#f3f4f6] text-black">
    <header className="bg-white border-b border-neutral-200 px-3 py-2.5 flex items-center justify-between">
      <div className="flex items-center gap-2">
        <button onClick={() => navigate("/shop")} className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-black border border-neutral-200 px-2 py-1 rounded-lg"><ArrowLeft size={12}/> Shop</button>
        <div className="bg-white rounded px-1.5 py-0.5 cursor-pointer" onClick={() => navigate("/admin")}><PrimeLogo className="h-5" /></div>
        <span className="text-neutral-400 text-[11px] hidden sm:inline">ADMIN</span>
      </div>
      <button onClick={handleLogout} className="flex items-center gap-1.5 text-neutral-500 hover:text-red-600 text-[11px]"><LogOut size={13}/> Logout</button>
    </header>
    <div className="flex h-[calc(100vh-48px)]">
      <aside className="hidden md:flex flex-col w-40 bg-white border-r border-neutral-200 p-2">
        <nav className="space-y-0.5">{navItems.map(({to,icon:Icon,label,end})=><NavLink key={to} to={to} end={end} className={({isActive})=>`flex items-center gap-2 px-2.5 py-2 rounded-lg text-xs ${isActive?"bg-black text-white":"text-neutral-600 hover:text-black hover:bg-neutral-100"}`}><Icon size={15}/>{label}</NavLink>)}</nav>
      </aside>
      <main className="flex-1 overflow-auto pb-20 md:pb-6"><Outlet/></main>
    </div>
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-neutral-200 flex md:hidden z-40 overflow-x-auto">{navItems.map(({to,icon:Icon,label,end})=><NavLink key={to} to={to} end={end} className={({isActive})=>`min-w-[56px] flex-1 flex flex-col items-center py-1.5 text-[9px] ${isActive?"text-black font-semibold":"text-neutral-400"}`}><Icon size={16}/><span className="mt-0.5">{label}</span></NavLink>)}</nav>
  </div>;
}
