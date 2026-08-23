import type { Application } from "express";
import { verifyTelegramInitData } from "./telegramAuth.js";
import { firestoreService } from "./firestoreService.js";

export function installTelegramAvatarRoutes(app: Application) {
  app.post("/api/auth/telegram/avatar-sync", async (req, res) => {
    try {
      const initData = typeof req.body?.initData === "string" ? req.body.initData : "";
      const result = verifyTelegramInitData(initData, process.env.TELEGRAM_BOT_TOKEN || "");
      const customerId = String(result.user.id);
      const photoUrl = typeof result.user.photo_url === "string" ? result.user.photo_url.trim() : "";
      if (!photoUrl) return res.json({ synced: false, reason: "Telegram did not provide a profile photo" });

      const existing = await firestoreService.getDocument("customers", customerId);
      if (!existing) return res.status(404).json({ synced: false, error: "Customer profile not found" });
      if (existing.manualAvatarOverride === true) return res.json({ synced: false, skipped: true, reason: "Manual avatar override is active", avatarUrl: existing.avatarUrl || null });

      await firestoreService.updateDocument("customers", customerId, {
        avatarUrl: photoUrl,
        telegramPhotoUrl: photoUrl,
        avatarSource: "telegram",
        avatarSyncedAt: Date.now(),
      });
      return res.json({ synced: true, avatarUrl: photoUrl });
    } catch (error: any) {
      console.error("Telegram avatar sync error:", error);
      return res.status(401).json({ synced: false, error: "Unable to synchronize Telegram avatar" });
    }
  });
}
