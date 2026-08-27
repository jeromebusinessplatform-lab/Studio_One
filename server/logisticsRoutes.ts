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
  } catch { return false; }
}
function number(value: unknown, fallback = 0) { const n = Number(value); return Number.isFinite(n) ? n : fallback; }
async function supabaseFetch(path: string, init: RequestInit = {}) {
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) throw new Error("Supabase server configuration is missing");
  return fetch(`${SUPABASE_URL}/rest/v1/${path}`, { ...init, headers: { apikey: SUPABASE_SECRET_KEY, Authorization: `Bearer ${SUPABASE_SECRET_KEY}`, "Content-Type": "application/json", ...(init.headers || {}) } });
}

function normalizeProvider(provider: any, config: any = null) {
  const metadata = config?.metadata && typeof config.metadata === "object" ? config.metadata : {};
  const deliveryType = String(config?.delivery_type ?? metadata.deliveryType ?? provider?.metadata?.deliveryType ?? "STANDARD").toUpperCase();
  return {
    id: String(provider.id),
    name: String(provider.name),
    deliveryType: ["STANDARD", "EXPRESS", "PRIORITY"].includes(deliveryType) ? deliveryType : "STANDARD",
    tier: ["STANDARD", "EXPRESS", "PRIORITY"].includes(deliveryType) ? deliveryType : "STANDARD",
    logoUrl: String(metadata.logoUrl ?? provider?.logo_storage_path ?? ""),
    isAvailable: provider?.active !== false && config?.active !== false,
    baseFare: number(config?.base_fare ?? metadata.baseFare, 0),
    minimumDistanceKm: number(config?.minimum_distance_km ?? metadata.minimumDistanceKm ?? config?.base_distance_km, 0),
    minimumFare: number(config?.minimum_fare ?? metadata.minimumFare, 0),
    excessPerKm: number(config?.excess_per_km ?? metadata.excessPerKm ?? config?.per_km_charge, 0),
    platformFeeEnabled: Boolean(config?.platform_fee_enabled ?? metadata.platformFeeEnabled),
    platformFee: number(config?.platform_fee ?? metadata.platformFee, 0),
    surchargeEnabled: Boolean(config?.surcharge_fee_enabled ?? metadata.surchargeEnabled),
    surchargeFee: number(config?.surcharge_fee ?? metadata.surchargeFee, 0),
    createdAt: provider.created_at,
    updatedAt: config?.updated_at ?? provider.updated_at,
  };
}
function cleanProvider(body: any) {
  const name = String(body?.name || "").trim();
  const deliveryType = String(body?.deliveryType || body?.tier || "STANDARD").toUpperCase();
  const baseFare = number(body?.baseFare, NaN);
  const minimumDistanceKm = number(body?.minimumDistanceKm ?? body?.baseDistanceKm, NaN);
  const minimumFare = number(body?.minimumFare, NaN);
  const excessPerKm = number(body?.excessPerKm ?? body?.perKmCharge, NaN);
  const platformFee = Math.max(0, number(body?.platformFee, 0));
  const surchargeFee = Math.max(0, number(body?.surchargeFee, 0));
  if (!name || name.length > 120 || !["STANDARD", "EXPRESS", "PRIORITY"].includes(deliveryType) || !Number.isFinite(baseFare) || baseFare < 0 || !Number.isFinite(minimumDistanceKm) || minimumDistanceKm < 0 || !Number.isFinite(minimumFare) || minimumFare < 0 || !Number.isFinite(excessPerKm) || excessPerKm < 0) throw new Error("Invalid logistics provider pricing configuration");
  return { name, deliveryType, baseFare, minimumDistanceKm, minimumFare, excessPerKm, platformFeeEnabled: body?.platformFeeEnabled === true, platformFee, surchargeEnabled: body?.surchargeEnabled === true, surchargeFee, isAvailable: body?.isAvailable !== false, logoUrl: String(body?.logoUrl || "").slice(0, 2000) };
}
async function providerRows() {
  const providersResponse = await supabaseFetch("couriers?select=*&order=name.asc");
  if (!providersResponse.ok) throw new Error(`Supabase list couriers returned ${providersResponse.status}: ${await providersResponse.text()}`);
  const providers = await providersResponse.json();
  const configResponse = await supabaseFetch("courier_configs?select=*");
  if (!configResponse.ok) throw new Error(`Supabase list courier_configs returned ${configResponse.status}: ${await configResponse.text()}`);
  const configs = await configResponse.json();
  return (Array.isArray(providers) ? providers : []).map((provider: any) => normalizeProvider(provider, (Array.isArray(configs) ? configs : []).find((c: any) => String(c.courier_id) === String(provider.id))));
}
async function writeProvider(body: any, id?: string) {
  const clean = cleanProvider(body); const now = new Date().toISOString(); let provider: any;
  if (id) {
    const existingResponse = await supabaseFetch(`couriers?id=eq.${encodeURIComponent(id)}&select=*&limit=1`);
    if (!existingResponse.ok) throw new Error(`Supabase courier lookup returned ${existingResponse.status}: ${await existingResponse.text()}`);
    const existingRows = await existingResponse.json(); if (!Array.isArray(existingRows) || !existingRows.length) throw new Error("Delivery provider not found");
    const providerResponse = await supabaseFetch(`couriers?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ name: clean.name, active: clean.isAvailable, logo_storage_path: null, metadata: { logoUrl: clean.logoUrl }, updated_at: now }) });
    if (!providerResponse.ok) throw new Error(`Supabase courier update returned ${providerResponse.status}: ${await providerResponse.text()}`);
    const rows = await providerResponse.json(); provider = Array.isArray(rows) ? rows[0] : rows;
  } else {
    const providerResponse = await supabaseFetch("couriers", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ name: clean.name, active: clean.isAvailable, logo_storage_path: null, metadata: { logoUrl: clean.logoUrl }, created_at: now, updated_at: now }) });
    if (!providerResponse.ok) throw new Error(`Supabase courier create returned ${providerResponse.status}: ${await providerResponse.text()}`);
    const rows = await providerResponse.json(); provider = Array.isArray(rows) ? rows[0] : rows;
  }
  const courierId = String(provider.id);
  const existingConfigResponse = await supabaseFetch(`courier_configs?courier_id=eq.${encodeURIComponent(courierId)}&select=*&limit=1`);
  if (!existingConfigResponse.ok) throw new Error(`Supabase courier config lookup returned ${existingConfigResponse.status}: ${await existingConfigResponse.text()}`);
  const existingConfigRows = await existingConfigResponse.json();
  const configPayload = { courier_id: courierId, delivery_type: clean.deliveryType, base_fare: clean.baseFare, minimum_distance_km: clean.minimumDistanceKm, minimum_fare: clean.minimumFare, excess_per_km: clean.excessPerKm, platform_fee_enabled: clean.platformFeeEnabled, platform_fee: clean.platformFee, surcharge_fee_enabled: clean.surchargeEnabled, surcharge_fee: clean.surchargeFee, active: clean.isAvailable, metadata: { logoUrl: clean.logoUrl }, updated_at: now };
  let config: any;
  if (Array.isArray(existingConfigRows) && existingConfigRows.length) {
    const configResponse = await supabaseFetch(`courier_configs?id=eq.${encodeURIComponent(existingConfigRows[0].id)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(configPayload) });
    if (!configResponse.ok) throw new Error(`Supabase courier config update returned ${configResponse.status}: ${await configResponse.text()}`);
    const rows = await configResponse.json(); config = Array.isArray(rows) ? rows[0] : rows;
  } else {
    const configResponse = await supabaseFetch("courier_configs", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ ...configPayload, created_at: now }) });
    if (!configResponse.ok) throw new Error(`Supabase courier config create returned ${configResponse.status}: ${await configResponse.text()}`);
    const rows = await configResponse.json(); config = Array.isArray(rows) ? rows[0] : rows;
  }
  return normalizeProvider(provider, config);
}
function cleanHub(body: any) {
  const name = String(body?.name || "").trim(); const address = String(body?.address || "").trim(); const latitude = number(body?.latitude ?? body?.lat, NaN); const longitude = number(body?.longitude ?? body?.lon, NaN);
  if (!name || name.length > 120 || !address || address.length > 500 || !Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) throw new Error("Invalid hub location configuration");
  return { name, address, latitude, longitude, active: body?.active !== false, is_default: body?.isDefault === true || body?.is_default === true, metadata: body?.metadata && typeof body.metadata === "object" ? body.metadata : {}, updated_at: new Date().toISOString() };
}
async function listHubs() {
  const response = await supabaseFetch("hub_locations?select=*&order=is_default.desc,name.asc");
  if (!response.ok) throw new Error(`Supabase list hub_locations returned ${response.status}: ${await response.text()}`);
  const rows = await response.json();
  return (Array.isArray(rows) ? rows : []).map((row: any) => ({ id: String(row.id), name: String(row.name), address: String(row.address), latitude: number(row.latitude), longitude: number(row.longitude), active: row.active !== false, isDefault: row.is_default === true, createdAt: row.created_at, updatedAt: row.updated_at, metadata: row.metadata || {} }));
}

export function installLogisticsRoutes(app: Application) {
  app.get("/api/logistics/providers", async (_req, res) => { try { return res.json({ providers: await providerRows() }); } catch (error: any) { console.error("Logistics providers load error:", error); return res.status(500).json({ error: error?.message || "Unable to load delivery providers" }); } });
  app.post("/api/admin/logistics/providers", async (req, res) => { if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" }); try { return res.status(201).json({ success: true, provider: await writeProvider(req.body) }); } catch (error: any) { console.error("Logistics provider create error:", error); return res.status(400).json({ error: error?.message || "Unable to create delivery provider" }); } });
  app.patch("/api/admin/logistics/providers/:id", async (req, res) => { if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" }); try { return res.json({ success: true, provider: await writeProvider(req.body, String(req.params.id || "")) }); } catch (error: any) { console.error("Logistics provider update error:", error); return res.status(400).json({ error: error?.message || "Unable to update delivery provider" }); } });
  app.delete("/api/admin/logistics/providers/:id", async (req, res) => { if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" }); try { const id = String(req.params.id || ""); const configResponse = await supabaseFetch(`courier_configs?courier_id=eq.${encodeURIComponent(id)}`, { method: "DELETE" }); if (!configResponse.ok) throw new Error(`Unable to delete provider pricing configuration: ${await configResponse.text()}`); const providerResponse = await supabaseFetch(`couriers?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" }); if (!providerResponse.ok) throw new Error(`Unable to delete delivery provider: ${await providerResponse.text()}`); return res.json({ success: true }); } catch (error: any) { console.error("Logistics provider delete error:", error); return res.status(500).json({ error: error?.message || "Unable to delete delivery provider" }); } });
  app.get("/api/logistics/hubs", async (_req, res) => { try { return res.json({ hubs: await listHubs() }); } catch (error: any) { console.error("Hub locations load error:", error); return res.status(500).json({ error: error?.message || "Unable to load hub locations" }); } });
  app.get("/api/logistics/default-hub", async (_req, res) => { try { const response = await supabaseFetch("hub_locations?select=*&active=eq.true&is_default=eq.true&limit=1"); if (!response.ok) throw new Error(`Supabase default hub lookup returned ${response.status}: ${await response.text()}`); const rows = await response.json(); const row = Array.isArray(rows) && rows.length ? rows[0] : null; if (!row) return res.json({ hub: null }); return res.json({ hub: { id: String(row.id), name: String(row.name), address: String(row.address), lat: number(row.latitude), lon: number(row.longitude) } }); } catch (error: any) { console.error("Default hub load error:", error); return res.status(500).json({ error: error?.message || "Unable to load default hub" }); } });
  app.post("/api/admin/logistics/hubs", async (req, res) => { if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" }); try { const payload = cleanHub(req.body); if (payload.is_default) { const reset = await supabaseFetch("hub_locations?is_default=eq.true", { method: "PATCH", body: JSON.stringify({ is_default: false }) }); if (!reset.ok) throw new Error(`Unable to clear previous default hub: ${await reset.text()}`); } const response = await supabaseFetch("hub_locations", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) }); if (!response.ok) throw new Error(`Supabase create hub returned ${response.status}: ${await response.text()}`); const rows = await response.json(); return res.status(201).json({ success: true, hub: Array.isArray(rows) ? rows[0] : rows }); } catch (error: any) { console.error("Hub create error:", error); return res.status(400).json({ error: error?.message || "Unable to create hub location" }); } });
  app.patch("/api/admin/logistics/hubs/:id", async (req, res) => { if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" }); try { const id = String(req.params.id || ""); if (!id || id.length > 80) return res.status(400).json({ error: "Invalid hub id" }); const payload = cleanHub(req.body); if (payload.is_default) { const reset = await supabaseFetch(`hub_locations?id=neq.${encodeURIComponent(id)}&is_default=eq.true`, { method: "PATCH", body: JSON.stringify({ is_default: false }) }); if (!reset.ok) throw new Error(`Unable to clear previous default hub: ${await reset.text()}`); } const response = await supabaseFetch(`hub_locations?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(payload) }); if (!response.ok) throw new Error(`Supabase update hub returned ${response.status}: ${await response.text()}`); const rows = await response.json(); return res.json({ success: true, hub: Array.isArray(rows) ? rows[0] : rows }); } catch (error: any) { console.error("Hub update error:", error); return res.status(400).json({ error: error?.message || "Unable to update hub location" }); } });
  app.post("/api/admin/logistics/hubs/:id/default", async (req, res) => { if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" }); try { const id = String(req.params.id || ""); if (!id || id.length > 80) return res.status(400).json({ error: "Invalid hub id" }); const reset = await supabaseFetch("hub_locations?is_default=eq.true", { method: "PATCH", body: JSON.stringify({ is_default: false }) }); if (!reset.ok) throw new Error(`Unable to clear previous default hub: ${await reset.text()}`); const response = await supabaseFetch(`hub_locations?id=eq.${encodeURIComponent(id)}`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ is_default: true, active: true, updated_at: new Date().toISOString() }) }); if (!response.ok) throw new Error(`Unable to set default hub: ${await response.text()}`); const rows = await response.json(); return res.json({ success: true, hub: Array.isArray(rows) ? rows[0] : rows }); } catch (error: any) { console.error("Set default hub error:", error); return res.status(400).json({ error: error?.message || "Unable to set default hub" }); } });
  app.delete("/api/admin/logistics/hubs/:id", async (req, res) => { if (!adminSession(req)) return res.status(401).json({ error: "Admin authentication required" }); try { const id = String(req.params.id || ""); if (!id || id.length > 80) return res.status(400).json({ error: "Invalid hub id" }); const currentResponse = await supabaseFetch(`hub_locations?id=eq.${encodeURIComponent(id)}&select=is_default&limit=1`); if (!currentResponse.ok) throw new Error(`Unable to verify hub: ${await currentResponse.text()}`); const currentRows = await currentResponse.json(); if (Array.isArray(currentRows) && currentRows[0]?.is_default) return res.status(409).json({ error: "Set another hub as default before removing the current default hub" }); const response = await supabaseFetch(`hub_locations?id=eq.${encodeURIComponent(id)}`, { method: "DELETE" }); if (!response.ok) throw new Error(`Supabase delete hub returned ${response.status}: ${await response.text()}`); return res.json({ success: true }); } catch (error: any) { console.error("Hub delete error:", error); return res.status(500).json({ error: error?.message || "Unable to delete hub location" }); } });
}
