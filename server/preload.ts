import express from "express";
import { installReleaseRoutes } from "./releaseRoutes.js";
import { installProductComparisonRoutes } from "./productComparisonRoutes.js";
import { installTelegramAvatarRoutes } from "./telegramAvatarRoutes.js";
import { installAdminComparisonRoutes } from "./adminComparisonRoutes.js";

const proto: any = (express.application as any);
const originalListen = proto.listen;
if (!(proto as any).__primeReleaseRoutesInstalled) {
  proto.__primeReleaseRoutesInstalled = true;
  proto.listen = function patchedListen(this: any, ...args: any[]) {
    installReleaseRoutes(this);
    installProductComparisonRoutes(this);
    installTelegramAvatarRoutes(this);
    installAdminComparisonRoutes(this);
    return originalListen.apply(this, args);
  };
}
