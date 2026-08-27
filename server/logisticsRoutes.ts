import crypto from "node:crypto";
import type { Application, Request } from "express";

const SUPABASE_URL = String(process.env.SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_SECRET_KEY = String(process.env.SUPABASE_SECRET_KEY || "");
const ADMIN_COOKIE = "prime_admin_session";

function cookie(req: Request, name: string) {
  const value = req.headers.cookie || "";
  const found = value.split(";").map((x) => x.trim()).find((x) => x.startsWith(`${name}=`));
  return found ? decodeURIComponent(found.slice(name.length + 1)) : null;
}

function adminSession(req: Request) {
  const token = cookie(req, ADMIN_COOKIE);
  const secret = process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_ACCESS_CODE || "";
  if (!token || !secret) return false;
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return false;
  try {
    const payload = Buffer.from(encoded, "base64url").toString("utf8");
    const match = payload.match(/^admin:(\d+)$/);
    if (!match || Number(match[1]) < Date.now()) return false;
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  } catch {
    return false;
  }
}

function number(value: unknown, fallback = 0) {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

async function supabaseFetch(path: string, init: RequestInit = {}) {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error("Supabase server configuration is missing");
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    ...init,
    headers: {
      apikey: SUPABASE_SECRET_KEY,
      Authorization: `Bearer ${SUPABASE_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
  });
}

function cleanHub(body: any) {
  const name = String(body?.name || "").trim();
  const address = String(body?.address || "").trim();
  const latitude = number(body?.latitude ?? body?.lat, NaN);
  const longitude = number(body?.longitude ?? body?.lon, NaN);
  if (!name || name.length > 120 || !address || address.length > 500 || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    throw new Error("Invalid hub location configuration");
  }
  return {
    name,
    address,
    latitude,
    longitude,
    active: body?.active !== false,
    is_default: body?.isDefault === true || body?.is_default === true,
    metadata: body?.metadata && typeof body.metadata === "object" ? body.metadata : {},
    updated_at: new Date().toISOString(),
  };
}

async function listHubs() {
  const response = await supabaseFetch("hub_locations?select=*&order=is_default.desc,name.asc");
  if (!response.ok) throw new Error(`Supabase list hub_locations returned ${response.status}: ${await response.text()}`);
  const rows = await response.json();
  return (Array.isArray(rows) ? rows : []).map((row: any) => ({
    id: String(row.id),
    name: String(row.name),
    address: String(row.address),
    latitude: number(row.latitude),
    longitude: number(row.longitude),
    active: row.active !== false,
    isDefault: row.is_default === true,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    metadata: row.metadata || {},
  }));
}

export function installLogisticsRoutes(app: Application) {
  app.get("/api/logistics/hubs", async (_req, res) => {
    try {
      return res.json({ hubs: await listHubs() });
    } catch (error: any) {
      console.error("Hub locations load error:", error);
      return res.status(500).json({ error: error?.message || "Unable to load hub locations" });
    }
  });

  app.get("/api/logistics/default-hub", async (_req, res) => {
    try {
      const response = await supabaseFetch("hub_locations?select=*&active=eq.true&is_default=eq.true&limit=1");
      if (!response.ok) throw new Error(`Supabase default hub lookup returned ${response.status}: ${await response.text()}`);
      const rows = await response.json();
      const row = Array.isArray(rows) && rows.length ? rows[0] : null;
      if (!row) return res.json({ hub: null });
      return res.json({ hub: { id: String(row.id), name: String(row.name), address: String(row.address), lat: number(row.latitude), lon: number(row.longitude) } });
    } catch (error: any) {
      console.error("Default hub load error:", error);
      return res.status(500).json({ error: error?.message || "Unable to load default hub" });
    }
  });

  app.post("/api/admin/logistics/hubs", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    try {
      const payload = cleanHub(req.body);
      if (payload.is_default) {
        const reset = await supabaseFetch("hub_locations?is_default=eq.true", { method: "PATCH", body: JSON.stringify({ is_default: false }) });
        if (!reset.ok) throw new Error(`Unable to clear previous default hub: ${await reset.text()}`);
      }
      const response = await supabaseFetch("hub_locations", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) });
      if (!response.ok) throw new Error(`Supabase create hub returned ${response.status}: ${await response.text()}`);
      const rows = await response.json();
      return res.status(201).json({ success: true, hub: Array.isArray(rows) ? rows[0] : rows });
    } catch (error: any) {
      console.error("Hub create error:", error);
      return res.status(400).json({ error: error?.message || "Unable to create hub location" });
    }
  });

  app.patch("/api/admin/logistics/hubs/:id", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    try {
      const id = String(req.params.id || "");
      if (!id || id.length > 80) return res.status(400).json({ error: "Invalid hub id" });
      const payload = cleanHub(req.body);
      if (payload.is_default) {
        const reset = await supabaseFetch(`hub_locations?id=neq.${encodeURIComponent(id)}&is_default=eq.true`, { method: "PATCH", body: JSON.stringify({ is_default: false }) });
        if (!reset.ok) throw new Error(`Unable to clear previous default hub: ${await reset.text()}`);
      }
      delete (payload as any).is_default;
      const response = await supabaseFetch(`hub_locations?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ ...payload, ...(req.body?.isDefault !== undefined ? { is_default: req.body.isDefault === true } : {}) }) });
      if (!response.ok) throw new Error(`Supabase update hub returned ${response.status}: ${await response.text()}`);
      const rows = await response.json();
      return res.json({ success: true, hub: Array.isArray(rows) ? rows[0] : rows });
    } catch (error: any) {
      console.error("Hub update error:", error);
      return res.status(400).json({ error: error?.message || "Unable to update hub location" });
    }
  });

  app.post("/api/admin/logistics/hubs/:id/default", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    try {
      const id = String(req.params.id || "");
      if (!id || id.length > 80) return res.status(400).json({ error: "Invalid hub id" });
      const reset = await supabaseFetch("hub_locations?is_default=eq.true", { method: "PATCH", body: JSON.stringify({ is_default: false }) });
      if (!reset.ok) throw new Error(`Unable to clear previous default hub: ${await reset.text()}`);
      const response = await supabaseFetch(`hub_locations?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ is_default: true, active: true, updated_at: new Date().toISOString() }) });
      if (!response.ok) throw new Error(`Unable to set default hub: ${await response.text()}`);
      const rows = await response.json();
      return res.json({ success: true, hub: Array.isArray(rows) ? rows[0] : rows });
    } catch (error: any) {
      console.error("Set default hub error:", error);
      return res.status(400).json({ error: error?.message || "Unable to set default hub" });
    }
  });

  app.delete("/api/admin/logistics/hubs/:id", async (req, res) => {
    if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" });
    try {
      const id = String(req.params.id || "");
      if (!id || id.length > 80) return res.status(400).json({ error: "Invalid hub id" });
      const response = await supabaseFetch(`hub_locations?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error(`Supabase delete hub returned ${response.status}: ${await response.text()}`);
      return res.json({ success: true });
    } catch (error: any) {
      console.error("Hub delete error:", error);
      return res.status(500).json({ error: error?.message || "Unable to delete hub location" });
    }
  });
}
