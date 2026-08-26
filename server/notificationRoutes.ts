// Compose the legacy notification routes with the new Supabase-backed product read API.
import type { Application } from "express";
import { installNotificationRoutes as installLegacyNotificationRoutes } from "./notificationRoutesLegacy.js";
import { installProductRoutes } from "./productRoutes.js";

export function installNotificationRoutes(app: Application) {
  installLegacyNotificationRoutes(app);
  installProductRoutes(app);
}
