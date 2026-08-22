import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDQftTyFCnSE3Iaen3GTe2MhPstRAMI024",
  authDomain: "perfect-buttress-4dzcr.firebaseapp.com",
  projectId: "perfect-buttress-4dzcr",
  storageBucket: "perfect-buttress-4dzcr.firebasestorage.app",
  messagingSenderId: "728098967577",
  appId: "1:728098967577:web:7a8813c17a72b34fcada88"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, "ai-studio-primecommerce-f59766ab-326b-40a2-bcc8-eae7f46dfe5f");
export const auth = getAuth(app);
export const storage = getStorage(app);
