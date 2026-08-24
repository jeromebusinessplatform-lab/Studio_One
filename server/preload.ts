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

export const STUDIO_ONE_SYNC_REVISION = "2026-08-24-prime-commerce-fixes";

installActivityLogger();
installOrderNumberEnforcer();

const proto: any = (express.application as any);
const originalListen = proto.listen;
if (!(proto as any).__primeReleaseRoutesInstalled) {
  proto.__primeReleaseRoutesInstalled = true;
  proto.listen = function patchedListen(this: any, ...args: any[]) {
    // Register the advanced coupon/checkout routes first so legacy handlers cannot shadow them.
    installCouponAdminRoutes(this);
    installCheckoutRoutesV2(this);

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
