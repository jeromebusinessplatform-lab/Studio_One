type StorageHandle = {
  path: string;
  bucket?: string;
  file?: File;
};

const uploadedUrls = new Map<string, string>();

const SUPABASE_URL = String((import.meta as any).env?.VITE_SUPABASE_URL || "").replace(/\/$/, "");
const SUPABASE_KEY = String((import.meta as any).env?.VITE_SUPABASE_PUBLISHABLE_KEY || (import.meta as any).env?.VITE_SUPABASE_ANON_KEY || "");

function bucketForPath(path: string): string {
  if (path.startsWith("couriers/")) return "courier-logos";
  if (path.startsWith("avatars/")) return "member-uploads";
  if (path.startsWith("products/")) return "product-images";
  return "member-uploads";
}

export const storage = {};

export function ref(_storage: unknown, path: string): StorageHandle {
  return { path, bucket: bucketForPath(path) };
}

export async function uploadBytes(handle: StorageHandle, file: File): Promise<{ ref: StorageHandle }> {
  if (!(file instanceof File)) throw new Error("A file is required.");
  if (!SUPABASE_URL || !SUPABASE_KEY) throw new Error("Supabase client storage configuration is missing.");
  const bucket = handle.bucket || bucketForPath(handle.path);
  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${encodeURIComponent(bucket)}/${handle.path}`, {
    method: "POST",
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": file.type || "application/octet-stream",
      "x-upsert": "true",
    },
    body: file,
  });
  if (!response.ok) {
    const message = await response.text().catch(() => "");
    throw new Error(message || `Supabase Storage upload failed (${response.status}).`);
  }
  const url = `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(bucket)}/${handle.path}`;
  uploadedUrls.set(`${bucket}/${handle.path}`, url);
  return { ref: { ...handle, bucket, file } };
}

export async function getDownloadURL(handle: StorageHandle): Promise<string> {
  const bucket = handle.bucket || bucketForPath(handle.path);
  const key = `${bucket}/${handle.path}`;
  const known = uploadedUrls.get(key);
  if (known) return known;
  if (!SUPABASE_URL) throw new Error("Supabase URL is missing.");
  return `${SUPABASE_URL}/storage/v1/object/public/${encodeURIComponent(bucket)}/${handle.path}`;
}
