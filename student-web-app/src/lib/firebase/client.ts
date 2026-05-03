import { initializeApp, getApps } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export async function requestNotificationPermission() {
  const supported = await isSupported();
  if (!supported) {
    console.log("Firebase Messaging is not supported in this browser.");
    return null;
  }

  const permission = await Notification.requestPermission();
  if (permission === "granted") {
    const messaging = getMessaging(app);
    try {
      const currentToken = await getToken(messaging, {
        vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY,
      });
      if (currentToken) {
        return currentToken;
      } else {
        console.log("No registration token available. Request permission to generate one.");
        return null;
      }
    } catch (err) {
      console.log("An error occurred while retrieving token. ", err);
      return null;
    }
  }
  return null;
}

export async function onMessageListener(callback: (payload: any) => void) {
  const supported = await isSupported();
  if (!supported) return;

  const messaging = getMessaging(app);
  return onMessage(messaging, callback);
}
