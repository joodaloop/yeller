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
  let msg = `*${escapeMarkdown(n.title)}*`;

  if (n.from) {
    msg += `\n_From: ${escapeMarkdown(n.from)}_`;
  }

  if (n.description) {
    msg += `\n\n${escapeMarkdown(n.description)}`;
  }

  if (n.url) {
    msg += `\n\n[Open Link](${escapeUrl(n.url)})`;
  }

  return msg;
}

function escapeMarkdown(text: string): string {
  return text.replace(/([_*\[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}

function escapeUrl(url: string): string {
  return url.replace(/([)\\])/g, "\\$1");
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
      parse_mode: "MarkdownV2",
    }),
  });

  return response.json();
}
