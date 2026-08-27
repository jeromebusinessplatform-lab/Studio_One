// Compatibility module retained temporarily so legacy imports do not break during
// the final cutover. It contains no Firebase SDK initialization or network calls.
export { storage, ref, uploadBytes, getDownloadURL } from "./supabaseStorageShim";
export const db = null;
export const auth = null;
