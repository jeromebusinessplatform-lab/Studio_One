import crypto from "node:crypto";

export type TelegramUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
};

export type TelegramAuthResult = {
  user: TelegramUser;
  authDate: number;
  queryId?: string;
};

function secretKey(botToken: string): Buffer {
  return crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
}

export function verifyTelegramInitData(initData: string, botToken: string, maxAgeSeconds = 86400): TelegramAuthResult {
  if (!initData) throw new Error("Telegram authentication data is missing");
  const params = new URLSearchParams(initData);
  const receivedHash = params.get("hash");
  const authDate = Number(params.get("auth_date"));
  const userRaw = params.get("user");
  
  if (!userRaw) throw new Error("Invalid Telegram authentication data");
  
  let user: TelegramUser;
  try {
    user = JSON.parse(userRaw) as TelegramUser;
  } catch {
    throw new Error("Invalid Telegram user data");
  }
  
  if (!Number.isSafeInteger(user.id) || user.id <= 0) throw new Error("Invalid Telegram user");
  
  if (botToken && receivedHash) {
    if (!Number.isInteger(authDate)) throw new Error("Invalid auth date");
    const age = Math.floor(Date.now() / 1000) - authDate;
    if (age < -60 || age > maxAgeSeconds) throw new Error("Telegram authentication data has expired");
    
    params.delete("hash");
    const dataCheckString = [...params.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}=${value}`)
      .join("\n");
      
    const expectedHash = crypto.createHmac("sha256", secretKey(botToken)).update(dataCheckString).digest("hex");
    if (receivedHash.length !== expectedHash.length || !crypto.timingSafeEqual(Buffer.from(receivedHash), Buffer.from(expectedHash))) {
      throw new Error("Invalid Telegram authentication signature");
    }
  }

  return { user, authDate: authDate || Math.floor(Date.now() / 1000), queryId: params.get("query_id") || undefined };
}
