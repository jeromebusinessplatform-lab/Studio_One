// Compatibility shim during the Supabase cutover.
// Existing server modules still import `firestoreService`; the implementation
// now lives in server/supabaseService.ts and persists to Supabase/Postgres.
export {
  supabaseService as firestoreService,
  supabaseService,
  toFirestoreValue,
  fromFirestoreValue,
  documentToPlain,
} from "./supabaseService.js";
