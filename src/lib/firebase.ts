import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";
import { registerPushToken } from "@/API/routes";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyAADskT4XvF_D3YO17T0qZsEvHoSgG2pM0",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "crafthive-1e22f.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "crafthive-1e22f",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "crafthive-1e22f.firebasestorage.app",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "846798392106",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:846798392106:web:b32237b48e0d515c2eec53",
};

export const initFirebase = () => {
  if (typeof window === "undefined") return null;
  if (!getApps().length && firebaseConfig.apiKey) {
    return initializeApp(firebaseConfig);
  }
  return getApps()[0] || null;
};

export async function requestNotificationPermission(): Promise<string | null> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    console.log("Notifications are not supported in this browser.");
    return null;
  }

  const supported = await isSupported().catch(() => false);
  if (!supported) {
    console.log("Firebase messaging is not supported in this environment.");
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.log("Notification permission not granted:", permission);
    return null;
  }

  try {
    const app = initFirebase();
    if (!app) return null;

    const messaging = getMessaging(app);
    const vapidKey = process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY;

    const registration = await navigator.serviceWorker.register(
      "/firebase-messaging-sw.js"
    );

    const currentToken = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (currentToken) {
      localStorage.setItem("fcm_token", currentToken);
      await registerPushToken(currentToken, "web").catch((e) =>
        console.warn("Failed to register push token with server:", e)
      );
      return currentToken;
    }
  } catch (err) {
    console.error("An error occurred while retrieving token:", err);
  }

  return null;
}

export function listenToForegroundMessages(callback: (payload: any) => void) {
  if (typeof window === "undefined") return () => {};

  try {
    const app = initFirebase();
    if (!app) return () => {};

    const messaging = getMessaging(app);
    return onMessage(messaging, (payload) => {
      callback(payload);
    });
  } catch {
    return () => {};
  }
}
