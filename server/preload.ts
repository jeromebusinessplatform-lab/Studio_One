import express from "express";
import { installIdentityOrderRepairRoutes } from "./identityOrderRepairRoutes.js";
import { installCommerceRepairRoutes } from "./commerceRepairRoutes.js";
import { installReleaseRoutes } from "./releaseRoutes.js";
import { installProductComparisonRoutes } from "./productComparisonRoutes.js";
import { installTelegramAvatarRoutes } from "./telegramAvatarRoutes.js";
import { installAdminComparisonRoutes } from "./adminComparisonRoutes.js";
import { migratePrimeMemberIds } from "./primeIdentity.js";
import { installActivityLogger } from "./activityLogger.js";
import { installMemberProfileRoutes } from "./memberProfileRoutes.js";
import { installOrderNumberEnforcer } from "./orderNumberEnforcer.js";
import { installCouponAdminRoutes } from "./couponAdminRoutes.js";
import { installCheckoutRoutesV2 } from "./checkoutRoutesV2.js";
import { installReferralRoutes } from "./referralRoutes.js";
import { installReferralGuard } from "./referralGuard.js";
import { installQueueRoutes } from "./queueRoutes.js";
import { installOrderWorkflowRoutes } from "./orderWorkflowRoutes.js";
import { installOrderPatchGuardRoutes } from "./orderPatchGuardRoutes.js";

export const STUDIO_ONE_SYNC_REVISION = "2026-08-25-order-queue-workflow-v2";

installActivityLogger();
installOrderNumberEnforcer();

const proto: any = (express.application as any);
const originalListen = proto.listen;
if (!(proto as any).__primeReleaseRoutesInstalled) {
  proto.__primeReleaseRoutesInstalled = true;
  proto.listen = function patchedListen(this: any, ...args: any[]) {
    installReferralGuard(this);
    installReferralRoutes(this);
    installCouponAdminRoutes(this);
    installCheckoutRoutesV2(this);
    installOrderPatchGuardRoutes(this);
    installOrderWorkflowRoutes(this);
    installQueueRoutes(this);

    installIdentityOrderRepairRoutes(this);
    installCommerceRepairRoutes(this);
    installReleaseRoutes(this);
    installProductComparisonRoutes(this);
    installTelegramAvatarRoutes(this);
    installAdminComparisonRoutes(this);
    installMemberProfileRoutes(this);
    void migratePrimeMemberIds();
    return originalListen.apply(this, args);
  };
}
