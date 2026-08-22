import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAdmin } from "@/context/AdminContext.tsx";
import { ArrowLeft, LogOut } from "lucide-react";

export default function AdminLayout() {
  const { logout } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();
  const isDashboard = location.pathname === "/admin" || location.pathname === "/admin/";

  const handleLogout = () => {
    logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-[100dvh] bg-white text-black flex flex-col">
      {!isDashboard && (
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-neutral-200 px-4 sm:px-6 py-2.5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => navigate("/admin")}
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-neutral-600 hover:text-black transition"
          >
            <ArrowLeft size={14} /> Dashboard
          </button>
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.12em] text-neutral-600 hover:text-black transition"
          >
            <LogOut size={14} /> Logout
          </button>
        </header>
      )}
      <main className="flex-1 min-h-0 overflow-auto">
        <Outlet />
      </main>
      {isDashboard && (
        <div className="border-t border-neutral-200 bg-white flex items-center justify-end gap-3 px-4 sm:px-7 py-2 text-[10px] uppercase tracking-[0.12em] text-neutral-500">
          <button type="button" onClick={() => navigate("/admin/settings")} className="hover:text-black transition">System Settings</button>
          <button type="button" onClick={handleLogout} className="hover:text-black transition">Logout</button>
        </div>
      )}
    </div>
  );
}
