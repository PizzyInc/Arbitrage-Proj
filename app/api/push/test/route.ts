import { NextResponse } from "next/server";
import webpush from "web-push";
import { getPushSubscriptions, StoredPushSubscription } from "@/lib/push-store";

export const runtime = "nodejs";

type PushTestPayload = {
  body?: string;
  subscription?: StoredPushSubscription;
  title?: string;
  url?: string;
};

function configureWebPush() {
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT ?? "mailto:alerts@arbicards.app";

  if (!publicKey || !privateKey) {
    return false;
  }

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as PushTestPayload;

  if (!configureWebPush()) {
    return NextResponse.json(
      {
        ok: false,
        error: "Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in Vercel to send push notifications."
      },
      { status: 202 }
    );
  }

  const subscriptions = payload.subscription
    ? [payload.subscription]
    : [...getPushSubscriptions().values()];

  if (!subscriptions.length) {
    return NextResponse.json(
      {
        ok: false,
        error: "No push subscriptions are registered yet."
      },
      { status: 202 }
    );
  }

  const message = JSON.stringify({
    body: payload.body ?? "Push notifications are enabled for arbitrage alerts.",
    title: payload.title ?? "ArbiCards test alert",
    url: payload.url ?? "/"
  });

  const results = await Promise.allSettled(
    subscriptions.map((subscription) => webpush.sendNotification(subscription, message))
  );

  return NextResponse.json({
    ok: results.some((result) => result.status === "fulfilled"),
    sent: results.filter((result) => result.status === "fulfilled").length,
    failed: results.filter((result) => result.status === "rejected").length
  });
}
