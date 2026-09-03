import { installActivityLogger } from "./activityLogger.js";
import { installOrderNumberEnforcer } from "./orderNumberEnforcer.js";

export const STUDIO_ONE_SYNC_REVISION = "2026-08-25-order-queue-workflow-v2";

installActivityLogger();
installOrderNumberEnforcer();
