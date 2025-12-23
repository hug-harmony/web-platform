// public/custom-sw.js
// This will be imported by the main service worker

self.addEventListener("push", function (event) {
  console.log("[Service Worker] Push Received:", event);

  let data = {
    title: "Hug Harmony",
    body: "You have a new notification",
    icon: "/hh-icon.png",
    badge: "/hh-icon.png",
    tag: "default",
    data: { url: "/dashboard/notifications" },
  };

  try {
    if (event.data) {
      const payload = event.data.json();
      data = {
        title: payload.title || data.title,
        body: payload.body || data.body,
        icon: payload.icon || data.icon,
        badge: payload.badge || data.badge,
        tag: payload.tag || payload.type || data.tag,
        data: {
          url: payload.url || payload.data?.url || data.data.url,
          ...payload.data,
        },
      };
    }
  } catch (e) {
    console.error("[Service Worker] Error parsing push data:", e);
  }

  const options = {
    body: data.body,
    icon: data.icon,
    badge: data.badge,
    tag: data.tag,
    renotify: true,
    requireInteraction: true,
    vibrate: [200, 100, 200],
    data: data.data,
    actions: [
      { action: "open", title: "Open" },
      { action: "dismiss", title: "Dismiss" },
    ],
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

self.addEventListener("notificationclick", function (event) {
  console.log("[Service Worker] Notification clicked:", event);

  event.notification.close();

  if (event.action === "dismiss") {
    return;
  }

  const urlToOpen = event.notification.data?.url || "/dashboard/notifications";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (clientList) {
        // Check if there's already a window open
        for (let i = 0; i < clientList.length; i++) {
          const client = clientList[i];
          if (client.url.includes(self.location.origin) && "focus" in client) {
            client.focus();
            client.navigate(urlToOpen);
            return;
          }
        }
        // If no window open, open a new one
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

self.addEventListener("pushsubscriptionchange", function (event) {
  console.log("[Service Worker] Push subscription changed");

  event.waitUntil(
    self.registration.pushManager
      .subscribe({
        userVisibleOnly: true,
        applicationServerKey: self.VAPID_PUBLIC_KEY,
      })
      .then(function (subscription) {
        // Send new subscription to server
        return fetch("/api/push/subscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(subscription),
        });
      })
  );
});
