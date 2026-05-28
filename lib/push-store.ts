export type StoredPushSubscription = {
  endpoint: string;
  expirationTime?: number | null;
  keys: {
    auth: string;
    p256dh: string;
  };
};

const globalStore = globalThis as typeof globalThis & {
  pushSubscriptions?: Map<string, StoredPushSubscription>;
};

export function getPushSubscriptions() {
  if (!globalStore.pushSubscriptions) {
    globalStore.pushSubscriptions = new Map<string, StoredPushSubscription>();
  }

  return globalStore.pushSubscriptions;
}
