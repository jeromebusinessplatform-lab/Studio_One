const TELEGRAM_API = "https://api.telegram.org";

export async function sendTelegramMessage(telegramUserId: string, text: string) {
  const botToken = String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
  const chatId = String(telegramUserId || "").trim();
  if (!botToken || !chatId) return { sent: false, reason: "telegram_not_configured" };

  const response = await fetch(`${TELEGRAM_API}/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.ok !== true) {
    throw new Error(String(data?.description || "Telegram message failed"));
  }
  return { sent: true, messageId: data?.result?.message_id ?? null };
}
