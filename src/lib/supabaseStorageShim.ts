type StorageHandle = {
  path: string;
  file?: File;
};

const uploaded = new Map<string, string>();

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = typeof reader.result === "string" ? reader.result : "";
      if (!value) reject(new Error("Unable to read selected image."));
      else resolve(value);
    };
    reader.onerror = () => reject(reader.error || new Error("Unable to read selected image."));
    reader.readAsDataURL(file);
  });
}

export const storage = {};

export function ref(_storage: unknown, path: string): StorageHandle {
  return { path };
}

export async function uploadBytes(handle: StorageHandle, file: File): Promise<{ ref: StorageHandle }> {
  if (!(file instanceof File)) throw new Error("A file is required.");
  const dataUrl = await fileToDataUrl(file);
  uploaded.set(handle.path, dataUrl);
  return { ref: { ...handle, file } };
}

export async function getDownloadURL(handle: StorageHandle): Promise<string> {
  const dataUrl = uploaded.get(handle.path);
  if (!dataUrl) throw new Error("Uploaded asset is unavailable.");
  return dataUrl;
}
