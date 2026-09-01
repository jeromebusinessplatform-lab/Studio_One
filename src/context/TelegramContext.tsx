import React, { createContext, useContext, useState, useEffect } from "react";

export interface TelegramCustomer {
  telegramUserId: string;
  telegramDisplayName: string;
  telegramUsername?: string;
  telegramFirstName?: string;
  telegramLastName?: string;
  telegramLanguageCode?: string;
  avatarUrl?: string;
  primeMemberId?: string;
}
interface TelegramContextType { isLoading: boolean; isAuthenticated: boolean; customer: TelegramCustomer | null; sessionToken: string | null; error: string | null; isTelegramEnv: boolean; }
type TelegramWebApp = { initData?: string; initDataUnsafe?: { user?: { id: number; first_name: string; last_name?: string; username?: string; language_code?: string; photo_url?: string } }; ready?: () => void; expand?: () => void };
function getTelegramWebApp(): TelegramWebApp | undefined { if (typeof window === "undefined") return undefined; return (window as any).Telegram?.WebApp; }
async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit = {}, timeoutMs = 8000) { const controller = new AbortController(); const timeout = window.setTimeout(() => controller.abort(), timeoutMs); try { return await fetch(input, { ...init, signal: controller.signal }); } finally { window.clearTimeout(timeout); } }
const GUEST_ID_KEY = "prime_guest_customer_id";
function getOrCreateGuestCustomer(): TelegramCustomer { if (typeof window === "undefined") return { telegramUserId: "guest_web_user", telegramDisplayName: "Valued Customer" }; let id = localStorage.getItem(GUEST_ID_KEY); if (!id) { id = `guest_${Date.now().toString().slice(-6)}${Math.floor(100 + Math.random() * 900)}`; localStorage.setItem(GUEST_ID_KEY, id); } return { telegramUserId: id, telegramDisplayName: "Valued Customer" }; }

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
      const initUser = tg?.initDataUnsafe?.user;
      if (!initUser || !initData) { if (!cancelled) { setIsTelegramEnv(false); setCustomer(getOrCreateGuestCustomer()); setIsLoading(false); } return; }
      if (!cancelled) setIsTelegramEnv(true);
      try {
        const response = await fetchWithTimeout("/api/auth/telegram", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData }) });
        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.authenticated) throw new Error(data.error || "Telegram authentication failed");
        
        // Use server-provided user but ensure it's hydrated with initDataUnsafe for real-time accuracy
        const user = data.user;
        const profile = {
          telegramUserId: String(user.id),
          telegramDisplayName: [initUser.first_name, initUser.last_name].filter(Boolean).join(" ") || `TG User ${user.id}`,
          telegramUsername: initUser.username,
          telegramFirstName: initUser.first_name,
          telegramLastName: initUser.last_name,
          telegramLanguageCode: initUser.language_code || "en",
          avatarUrl: initUser.photo_url || user.photo_url,
        };

        let primeMemberId: string | undefined;
        try {
          const profileRes = await fetchWithTimeout(`/api/customers?userId=${encodeURIComponent(String(user.id))}&_t=${Date.now()}`, { credentials: "same-origin", cache: "no-store" }, 6000);
          const profileData = await profileRes.json().catch(() => ({}));
          primeMemberId = profileData?.customers?.[0]?.primeMemberId;
        } catch {}

        if (!cancelled) {
          setCustomer({ ...profile, primeMemberId });
          setSessionToken(initData);
          setError(null);
        }
      } catch (e: any) {
        if (!cancelled) {
          if (initUser) {
             setCustomer({
               telegramUserId: String(initUser.id),
               telegramDisplayName: [initUser.first_name, initUser.last_name].filter(Boolean).join(" ") || `TG User ${initUser.id}`,
               telegramUsername: initUser.username,
               telegramFirstName: initUser.first_name,
               telegramLastName: initUser.last_name,
               telegramLanguageCode: initUser.language_code || "en",
               avatarUrl: initUser.photo_url,
             });
             setSessionToken(initData);
             setError(e.message);
          } else {
             setCustomer(getOrCreateGuestCustomer());
             setSessionToken(null);
             setError(null);
          }
        }
      } finally { if (!cancelled) setIsLoading(false); }
    };
    void authenticate();
    return () => { cancelled = true; };
  }, []);

  return <TelegramContext.Provider value={{ isLoading, isAuthenticated: Boolean(customer), customer, sessionToken, error, isTelegramEnv }}>{children}</TelegramContext.Provider>;
}
const TelegramContext = createContext<TelegramContextType>({ isLoading: false, isAuthenticated: false, customer: null, sessionToken: null, error: null, isTelegramEnv: false });
export function useTelegram() { return useContext(TelegramContext); }
