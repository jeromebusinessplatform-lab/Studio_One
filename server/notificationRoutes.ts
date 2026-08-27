// Compose the legacy notification routes with the new Supabase-backed product and logistics APIs.
import type { Application } from "express";
import { installNotificationRoutes as installLegacyNotificationRoutes } from "./notificationRoutesLegacy.js";
import { installProductRoutes } from "./productRoutes.js";
import { installLogisticsRoutes } from "./logisticsRoutes.js";

export function installNotificationRoutes(app: Application) {
  installLegacyNotificationRoutes(app);
  installProductRoutes(app);
  installLogisticsRoutes(app);
}
