self.addEventListener("push", (event) => {
  let payload = {
    title: "ArbiCards alert",
    body: "New arbitrage signal available.",
    url: "/"
  };

  if (event.data) {
    try {
      payload = { ...payload, ...event.data.json() };
    } catch {
      payload.body = event.data.text();
    }
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      badge: "/icon.svg",
      body: payload.body,
      data: {
        url: payload.url || "/"
      },
      icon: "/icon.svg",
      tag: "arbicards-alert"
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ includeUncontrolled: true, type: "window" }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(url);
          return client.focus();
        }
      }

      return self.clients.openWindow(url);
    })
  );
});
