interface Env {
  TELEGRAM_BOT_TOKEN: string;
  TELEGRAM_CHAT_ID: string;
}

interface Notification {
  title: string;
  description?: string;
  url?: string;
  from?: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== "POST") {
      return new Response("Send a POST request with JSON: { title, description?, url?, from? }", {
        status: 405,
      });
    }

    try {
      const notification: Notification = await request.json();

      if (!notification.title) {
        return new Response("Missing required field: title", { status: 400 });
      }

      const message = formatMessage(notification);
      const result = await sendTelegram(env, message);

      if (!result.ok) {
        return new Response(`Telegram error: ${result.description}`, { status: 500 });
      }

      return new Response("Notification sent", { status: 200 });
    } catch (e) {
      return new Response(`Error: ${e instanceof Error ? e.message : "Unknown error"}`, {
        status: 400,
      });
    }
  },
};

function formatMessage(n: Notification): string {
  let msg = `<b>${escapeHtml(n.title)}</b>`;

  if (n.from) {
    msg += `\n<i>From: ${escapeHtml(n.from)}</i>`;
  }

  if (n.description) {
    msg += `\n\n${escapeHtml(n.description)}`;
  }

  if (n.url) {
    msg += `\n\n<a href="${n.url}">Open Link</a>`;
  }

  return msg;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

async function sendTelegram(
  env: Env,
  text: string
): Promise<{ ok: boolean; description?: string }> {
  const url = `https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`;

  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: text,
      parse_mode: "HTML",
    }),
  });

  const body = await response.text();
  try {
    return JSON.parse(body);
  } catch {
    return { ok: false, description: body };
  }
}
