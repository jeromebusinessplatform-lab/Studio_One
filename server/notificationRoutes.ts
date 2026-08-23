import type { Application, Request, Response } from "express";
import { firestoreService } from "./firestoreService.js";
import { migratePrimeMemberIds } from "./primeIdentity.js";

export async function createNotification(data: {
  telegramUserId: string;
  title: string;
  message: string;
  type?: string;
  iconName?: string;
  color?: string;
}) {
  const notification = {
    telegramUserId: String(data.telegramUserId || ""),
    title: String(data.title || "Notification"),
    message: String(data.message || ""),
    type: String(data.type || "system"),
    iconName: String(data.iconName || "Bell"),
    color: String(data.color || "#2563eb"),
    read: false,
    createdAt: Date.now(),
  };
  return await firestoreService.addDocument("notifications", notification);
}

export function installNotificationRoutes(app: Application) {
  // Run the one-time customer MID migration in the server process. The migration
  // is guarded by a persistent systemConfig marker, so restarts do not repeat it.
  void migratePrimeMemberIds();

  app.get("/api/notifications", async (req: Request, res: Response) => {
    try {
      const telegramUserId = String(req.query.telegramUserId || "");
      const all = await firestoreService.getDocuments("notifications");
      const userList = all
        .filter((n: any) => !telegramUserId || String(n.telegramUserId) === telegramUserId || !n.telegramUserId)
        .sort((a: any, b: any) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

      if (userList.length === 0 && telegramUserId) {
        const welcome = await createNotification({
          telegramUserId,
          title: "Welcome to PRIME Commerce",
          message: "Your secured Telegram handshake and membership profile have been activated successfully.",
          type: "system",
          iconName: "ShieldAlert",
          color: "#16a34a",
        });
        userList.unshift(welcome);
      }

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
      if (!Array.isArray(ids) || !ids.length) {
        return res.status(400).json({ error: "No notification IDs provided" });
      }

      if (action === "mark_read") {
        await firestoreService.batchUpdate("notifications", ids.map(String), { read: Boolean(read) });
        return res.json({ success: true });
      } else if (action === "delete") {
        await firestoreService.batchDelete("notifications", ids.map(String));
        return res.json({ success: true });
      } else {
        return res.status(400).json({ error: "Invalid batch action" });
      }
    } catch (error) {
      console.error("Batch notification error:", error);
      return res.status(500).json({ error: "Batch operation failed" });
    }
  });
}
