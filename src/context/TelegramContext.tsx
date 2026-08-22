import React, { createContext, useContext, useState, useEffect } from "react";

export interface TelegramCustomer {
  telegramUserId: string;
  telegramDisplayName: string;
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramLastName?: string;
  telegramLanguageCode?: string;
}
interface TelegramContextType { isLoading: boolean; isAuthenticated: boolean; customer: TelegramCustomer | null; sessionToken: string | null; error: string | null; isTelegramEnv: boolean; }
type TelegramWebApp = { initData?: string; initDataUnsafe?: { user?: { id: number; first_name: string; last_name?: string; username?: string; language_code?: string } }; ready?: () => void; expand?: () => void };
function getTelegramWebApp(): TelegramWebApp | undefined { if (typeof window === "undefined") return undefined; return (window as any).Telegram?.WebApp; }

export function TelegramProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [customer, setCustomer] = useState<TelegramCustomer | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isTelegramEnv, setIsTelegramEnv] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const authenticate = async () => {
      const tg = getTelegramWebApp();
      try { tg?.ready?.(); tg?.expand?.(); } catch {}
      const initData = tg?.initData || "";
      if (!tg?.initDataUnsafe?.user || !initData) { if (!cancelled) { setIsTelegramEnv(false); setIsLoading(false); } return; }
      if (!cancelled) setIsTelegramEnv(true);
      try {
        const response = await fetch("/api/auth/telegram", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.authenticated) throw new Error(data.error || "Telegram authentication failed");
        const user = data.user;
        if (!cancelled) { setCustomer({ telegramUserId: String(user.id), telegramDisplayName: [user.first_name, user.last_name].filter(Boolean).join(" ") || `TG User ${user.id}`, telegramUsername: user.username, telegramFirstName: user.first_name, telegramLastName: user.last_name, telegramLanguageCode: user.language_code || "en" }); setSessionToken(initData); setError(null); }
      } catch (e: any) { if (!cancelled) { setCustomer(null); setSessionToken(null); setError(e?.message || "Telegram authentication failed"); } }
      finally { if (!cancelled) setIsLoading(false); }
    };
    void authenticate(); return () => { cancelled = true; };
  }, []);

  return <TelegramContext.Provider value={{ isLoading, isAuthenticated: Boolean(customer && isTelegramEnv), customer, sessionToken, error, isTelegramEnv }}>{children}</TelegramContext.Provider>;
}
const TelegramContext = createContext<TelegramContextType>({ isLoading: false, isAuthenticated: false, customer: null, sessionToken: null, error: null, isTelegramEnv: false });
export function useTelegram() { return useContext(TelegramContext); }
