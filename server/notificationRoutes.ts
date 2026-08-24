import type { Application, Request, Response } from "express";
import { firestoreService } from "./firestoreService.js";
import { migratePrimeMemberIds } from "./primeIdentity.js";
import { installCommerceRepairRoutes } from "./commerceRepairRoutes.js";
import "./orderIdentityPatch.js";

const VISIT_LOG_THROTTLE_MS = 30 * 60 * 1000;

export async function createNotification(data: {
  telegramUserId: string;
  title: string;
  message: string;
  type?: string;
  iconName?: string;
  color?: string;
  eventKey?: string | null;
}) {
  const telegramUserId = String(data.telegramUserId || "");
  const eventKey = data.eventKey ? String(data.eventKey) : null;

  if (eventKey) {
    const existing = await firestoreService.getDocuments("notifications");
    const duplicate = existing.some((n: any) =>
      String(n.telegramUserId || "") === telegramUserId && String(n.eventKey || "") === eventKey,
    );
    if (duplicate) return existing.find((n: any) => String(n.telegramUserId || "") === telegramUserId && String(n.eventKey || "") === eventKey);
  }

  const notification = {
    telegramUserId,
    title: String(data.title || "Activity"),
    message: String(data.message || ""),
    type: String(data.type || "activity"),
    iconName: String(data.iconName || "Activity"),
    color: String(data.color || "#2563eb"),
    eventKey,
    read: false,
    createdAt: Date.now(),
  };
  return await firestoreService.addDocument("notifications", notification);
}

async function logVisit(telegramUserId: string) {
  if (!telegramUserId || telegramUserId.startsWith("guest_")) return;
  const all = await firestoreService.getDocuments("notifications");
  const lastVisit = all
    .filter((n: any) => String(n.telegramUserId) === telegramUserId && String(n.type) === "visit")
    .sort((a: any, b: any) => Number(b.createdAt || 0) - Number(a.createdAt || 0))[0];
  if (lastVisit && Date.now() - Number(lastVisit.createdAt || 0) < VISIT_LOG_THROTTLE_MS) return;

  await createNotification({
    telegramUserId,
    title: "PRIME account visited",
    message: `Your PRIME membership account was accessed on ${new Date().toLocaleString("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" })}. Your VIP tier, points, spending history and PRIME Member ID remain on the same account.`,
    type: "visit",
    iconName: "LogIn",
    color: "#2563eb",
    eventKey: `visit:${telegramUserId}:${Math.floor(Date.now() / VISIT_LOG_THROTTLE_MS)}`,
  });
}

export function installNotificationRoutes(app: Application) {
  void migratePrimeMemberIds();
  installCommerceRepairRoutes(app);

  app.get("/api/notifications", async (req: Request, res: Response) => {
    try {
      const telegramUserId = String(req.query.telegramUserId || "");
      if (telegramUserId) await logVisit(telegramUserId);

      const all = await firestoreService.getDocuments("notifications");
      const userList = all
        .filter((n: any) => !telegramUserId || String(n.telegramUserId) === telegramUserId || !n.telegramUserId)
        .sort((a: any, b: any) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

      return res.json({ notifications: userList });
    } catch (error) {
      console.error("Get notifications error:", error);
      return res.status(500).json({ error: "Unable to load notifications" });
    }
  });

  app.patch("/api/notifications/:id", async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      const { read } = req.body;
      const updated = await firestoreService.updateDocument("notifications", id, { read: Boolean(read) });
      return res.json(updated);
    } catch (error) {
      console.error("Update notification error:", error);
      return res.status(500).json({ error: "Unable to update notification" });
    }
  });

  app.delete("/api/notifications/:id", async (req: Request, res: Response) => {
    try {
      const id = String(req.params.id);
      await firestoreService.deleteDocument("notifications", id);
      return res.json({ success: true });
    } catch (error) {
      console.error("Delete notification error:", error);
      return res.status(500).json({ error: "Unable to delete notification" });
    }
  });

  app.post("/api/notifications/batch", async (req: Request, res: Response) => {
    try {
      const { action, ids, read } = req.body;
      if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: "No notification IDs provided" });
      if (action === "mark_read") {
        await firestoreService.batchUpdate("notifications", ids.map(String), { read: Boolean(read) });
        return res.json({ success: true });
      }
      if (action === "delete") {
        await firestoreService.batchDelete("notifications", ids.map(String));
        return res.json({ success: true });
      }
      return res.status(400).json({ error: "Invalid batch action" });
    } catch (error) {
      console.error("Batch notification error:", error);
      return res.status(500).json({ error: "Batch operation failed" });
    }
  });
}
