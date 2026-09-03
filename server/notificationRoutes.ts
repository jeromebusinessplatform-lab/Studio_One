import type { Application, Request, Response } from "express";
import { firestoreService } from "./firestoreService.js";
import { migratePrimeMemberIds } from "./primeIdentity.js";
import "./orderIdentityPatch.js";
import crypto from "node:crypto";

const TG_COOKIE = "prime_telegram_session";
const ADMIN_COOKIE = "prime_admin_session";
function cookie(req: Request, name: string) { const value = req.headers.cookie || ""; const found = value.split(";").map((entry) => entry.trim()).find((entry) => entry.startsWith(`${name}=`)); return found ? decodeURIComponent(found.slice(name.length + 1)) : null; }
function signedId(req: Request, prefix: "telegram" | "admin", cookieName: string, secret: string) { const token = cookie(req, cookieName); if (!token || !secret) return null; const [encoded, signature] = token.split("."); if (!encoded || !signature) return null; try { const payload = Buffer.from(encoded, "base64url").toString("utf8"); const match = prefix === "telegram" ? payload.match(/^telegram:(\d+):(\d+)$/) : payload.match(/^admin:(\d+)$/); const expiry = match?.[prefix === "telegram" ? 2 : 1]; const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex"); if (!match || !expiry || Number(expiry) < Date.now() || signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null; return prefix === "telegram" ? match[1] : "admin"; } catch { return null; } }
function telegramUserId(req: Request) { return signedId(req, "telegram", TG_COOKIE, process.env.TELEGRAM_SESSION_SECRET || process.env.TELEGRAM_BOT_TOKEN || ""); }
function isAdmin(req: Request) { return signedId(req, "admin", ADMIN_COOKIE, process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_ACCESS_CODE || "") === "admin"; }

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
    const duplicate = existing.find((n: any) =>
      String(n.telegramUserId || "") === telegramUserId && String(n.eventKey || "") === eventKey,
    );
    if (duplicate) return duplicate;
  }

  return await firestoreService.addDocument("notifications", {
    telegramUserId,
    title: String(data.title || "Activity"),
    message: String(data.message || ""),
    type: String(data.type || "activity"),
    iconName: String(data.iconName || "Activity"),
    color: String(data.color || "#2563eb"),
    eventKey,
    read: false,
    createdAt: Date.now(),
  });
}

export function installNotificationRoutes(app: Application) {
  void migratePrimeMemberIds();

  app.get("/api/notifications", async (req: Request, res: Response) => {
    try {
      const viewerId = telegramUserId(req);
      if (!viewerId && !isAdmin(req)) return res.status(401).json({ error: "Authentication required" });
      const all = await firestoreService.getDocuments("notifications");
      const userList = all
        .filter((n: any) => {
          // Visit/access notices are permanently excluded: notification center is an activity log,
          // not a login/security-alert feed.
          if (String(n.type || "") === "visit") return false;
          return isAdmin(req) || String(n.telegramUserId) === viewerId;
        })
        .sort((a: any, b: any) => Number(b.createdAt || 0) - Number(a.createdAt || 0));

      return res.json({ notifications: userList });
    } catch (error) {
      console.error("Get notifications error:", error);
      return res.status(500).json({ error: "Unable to load notifications" });
    }
  });

  app.patch("/api/notifications/:id", async (req: Request, res: Response) => {
    try {
      const ownerId = telegramUserId(req);
      if (!ownerId && !isAdmin(req)) return res.status(401).json({ error: "Authentication required" });
      const id = String(req.params.id);
      const notification = await firestoreService.getDocument("notifications", id);
      if (!notification || (!isAdmin(req) && String(notification.telegramUserId) !== ownerId)) return res.status(404).json({ error: "Notification not found" });
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
      const ownerId = telegramUserId(req);
      if (!ownerId && !isAdmin(req)) return res.status(401).json({ error: "Authentication required" });
      const id = String(req.params.id);
      const notification = await firestoreService.getDocument("notifications", id);
      if (!notification || (!isAdmin(req) && String(notification.telegramUserId) !== ownerId)) return res.status(404).json({ error: "Notification not found" });
      await firestoreService.deleteDocument("notifications", id);
      return res.json({ success: true });
    } catch (error) {
      console.error("Delete notification error:", error);
      return res.status(500).json({ error: "Unable to delete notification" });
    }
  });

  app.post("/api/notifications/batch", async (req: Request, res: Response) => {
    try {
      const ownerId = telegramUserId(req);
      if (!ownerId && !isAdmin(req)) return res.status(401).json({ error: "Authentication required" });
      const { action, ids, read } = req.body;
      if (!Array.isArray(ids) || !ids.length) return res.status(400).json({ error: "No notification IDs provided" });
      if (!isAdmin(req)) { const notifications = await Promise.all(ids.map((id) => firestoreService.getDocument("notifications", String(id)))); if (notifications.some((notification) => !notification || String(notification.telegramUserId) !== ownerId)) return res.status(403).json({ error: "Access denied" }); }
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
