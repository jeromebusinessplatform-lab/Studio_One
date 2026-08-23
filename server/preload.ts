import express from "express";
import { installIdentityOrderRepairRoutes } from "./identityOrderRepairRoutes.js";
import { installCommerceRepairRoutes } from "./commerceRepairRoutes.js";
import { installReleaseRoutes } from "./releaseRoutes.js";
import { installProductComparisonRoutes } from "./productComparisonRoutes.js";
import { installTelegramAvatarRoutes } from "./telegramAvatarRoutes.js";
import { installAdminComparisonRoutes } from "./adminComparisonRoutes.js";
import { migratePrimeMemberIds } from "./primeIdentity.js";

const proto: any = (express.application as any);
const originalListen = proto.listen;
if (!(proto as any).__primeReleaseRoutesInstalled) {
  proto.__primeReleaseRoutesInstalled = true;
  proto.listen = function patchedListen(this: any, ...args: any[]) {
    installIdentityOrderRepairRoutes(this);
    installCommerceRepairRoutes(this);
    installReleaseRoutes(this);
    installProductComparisonRoutes(this);
    installTelegramAvatarRoutes(this);
    installAdminComparisonRoutes(this);
    void migratePrimeMemberIds();
    return originalListen.apply(this, args);
  };
}
