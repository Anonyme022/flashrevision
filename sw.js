const CACHE = 'flashrevision-v1';
const ASSETS = ['/'];

// Install
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch — network first, cache fallback
self.addEventListener('fetch', e => {
  if(e.request.method !== 'GET') return;
  e.respondWith(
    fetch(e.request)
      .then(res => {
        const clone = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, clone));
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// Messages from app
self.addEventListener('message', e => {
  if(e.data?.type === 'SCHEDULE_REMINDER'){
    scheduleDaily(e.data);
  }
});

// Schedule daily notification
function scheduleDaily(data){
  const now = new Date();
  const target = new Date();
  target.setHours(data.hour || 18, 0, 0, 0);
  if(target <= now) target.setDate(target.getDate() + 1);
  const delay = target - now;
  setTimeout(() => {
    self.registration.showNotification(data.title || 'FlashRévision', {
      body: data.body || 'Tu as des mots à réviser ! 📚',
      icon: '/icon-192.png',
      badge: '/icon-192.png',
      tag: 'daily-reminder',
      renotify: true,
      data: { url: self.location.origin }
    });
    // Re-schedule for next day
    setTimeout(() => scheduleDaily(data), 24 * 60 * 60 * 1000);
  }, delay);
}

// Notification click
self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(
    clients.matchAll({type:'window'}).then(cs => {
      if(cs.length) return cs[0].focus();
      return clients.openWindow(e.notification.data?.url || '/');
    })
  );
});
