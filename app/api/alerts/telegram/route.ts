import { NextResponse } from "next/server";

type TelegramAlertPayload = {
  chatId?: string;
  token?: string;
  message?: string;
};

export async function POST(request: Request) {
  const payload = (await request.json().catch(() => ({}))) as TelegramAlertPayload;
  const token = payload.token ?? process.env.TELEGRAM_BOT_TOKEN;
  const chatId = payload.chatId ?? process.env.TELEGRAM_CHAT_ID;
  const message =
    payload.message ??
    "New ArbiCards signal: review the latest US to UK spread before the market catches up.";

  if (!token || !chatId) {
    return NextResponse.json(
      {
        ok: false,
        mode: "preview",
        message,
        reason: "Set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID to deliver Telegram alerts."
      },
      { status: 202 }
    );
  }

  const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    body: JSON.stringify({
      chat_id: chatId,
      text: message
    }),
    headers: {
      "Content-Type": "application/json"
    },
    method: "POST"
  });

  if (!response.ok) {
    return NextResponse.json(
      {
        ok: false,
        reason: "Telegram rejected the alert request."
      },
      { status: 502 }
    );
  }

  return NextResponse.json({ ok: true });
}
