import { useState, useEffect, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Eye, EyeOff } from "lucide-react";
import { useAdmin } from "@/context/AdminContext.tsx";
import PrimeLogo from "@/components/PrimeLogo.tsx";

export default function AdminLogin() {
  const { login, isAuthenticated, isLoading: authLoading } = useAdmin();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [showCode, setShowCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/admin", { replace: true });
    }
  }, [isAuthenticated, authLoading, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    const result = await login(code);
    if (result.success) {
      navigate("/admin", { replace: true });
    } else {
      setError(result.error ?? "Invalid access code.");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-[100dvh] bg-[#f3f4f6] flex flex-col items-center justify-center px-5 py-8">
      <div className="w-full max-w-sm flex flex-col items-center">
        <div className="flex flex-col items-center text-center mb-7">
          <div className="bg-white rounded-2xl px-7 py-4 flex items-center justify-center shadow-sm border border-neutral-200">
            <PrimeLogo className="h-9" />
          </div>
          <div
            className="text-neutral-500 text-sm font-medium tracking-[0.24em] uppercase mt-4"
            style={{ fontFamily: "'Ubuntu', sans-serif" }}
          >
            Admin Panel
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="w-full bg-white rounded-2xl p-6 border border-neutral-200 shadow-sm"
        >
          <div className="mb-5">
            <label
              className="block text-neutral-500 text-xs font-normal uppercase tracking-wider mb-2 text-center"
              style={{ fontFamily: "'Ubuntu', sans-serif" }}
            >
              Access Code
            </label>
            <div className="relative">
              <input
                type={showCode ? "text" : "password"}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter admin access code"
                className="w-full bg-white border border-neutral-300 text-neutral-900 rounded-xl px-4 py-3 pr-11 text-sm outline-none focus:border-neutral-700 focus:ring-1 focus:ring-neutral-200 placeholder-neutral-400 text-center font-normal"
                style={{ fontFamily: "'Ubuntu', sans-serif" }}
                autoComplete="off"
              />
              <button
                type="button"
                aria-label={showCode ? "Hide access code" : "Show access code"}
                onClick={() => setShowCode(!showCode)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-700 cursor-pointer"
              >
                {showCode ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          {error && (
            <div
              className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm px-3 py-2 rounded-xl text-center font-normal"
              style={{ fontFamily: "'Ubuntu', sans-serif" }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={!code || isLoading}
            className="w-full bg-neutral-900 text-white font-normal py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer disabled:opacity-40 hover:bg-black transition-colors"
            style={{ fontFamily: "'Ubuntu', sans-serif", fontSize: "16px" }}
          >
            {isLoading ? <Loader2 size={16} className="animate-spin" /> : null}
            ENTER ADMIN PANEL
          </button>
        </form>
      </div>
    </div>
  );
}
