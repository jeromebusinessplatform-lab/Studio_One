import express from "express";
import { installReleaseRoutes } from "./releaseRoutes.js";

const proto: any = (express.application as any);
const originalListen = proto.listen;
if (!(proto as any).__primeReleaseRoutesInstalled) {
  proto.__primeReleaseRoutesInstalled = true;
  proto.listen = function patchedListen(this: any, ...args: any[]) {
    installReleaseRoutes(this);
    return originalListen.apply(this, args);
  };
}
