importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.1/firebase-messaging-compat.js');

// REPLACE THESE WITH YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyBKmuE4Xwp7NuZNv49KdtzqISuPynsmsrA",
  authDomain: "liveclassroomandquizplatform.firebaseapp.com",
  projectId: "liveclassroomandquizplatform",
  storageBucket: "liveclassroomandquizplatform.firebasestorage.app",
  messagingSenderId: "1071306864803",
  appId: "1:1071306864803:web:58dd16266127db8ec56716",
  measurementId: "G-QEWDPBP9V3"
};

try {
  firebase.initializeApp(firebaseConfig);
  const messaging = firebase.messaging();

  messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);
    const notificationTitle = payload.notification?.title || 'New Notification';
    const notificationOptions = {
      body: payload.notification?.body || 'You have a new message.',
      icon: '/favicon.ico',
      data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
  });
} catch (e) {
  console.log("Failed to initialize Firebase Messaging Service Worker. Did you replace the firebaseConfig? ", e);
}
