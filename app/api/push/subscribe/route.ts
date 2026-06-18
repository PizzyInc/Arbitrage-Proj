import { NextResponse } from "next/server";
import { getPushSubscriptions, StoredPushSubscription } from "@/lib/push-store";

export async function POST(request: Request) {
  const subscription = (await request.json().catch(() => null)) as StoredPushSubscription | null;

  if (!subscription?.endpoint || !subscription.keys?.auth || !subscription.keys?.p256dh) {
    return NextResponse.json({ ok: false, error: "Invalid push subscription" }, { status: 400 });
  }

  getPushSubscriptions().set(subscription.endpoint, subscription);

  return NextResponse.json({
    ok: true,
    subscriptionCount: getPushSubscriptions().size
  });
}
