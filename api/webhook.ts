import type { VercelRequest, VercelResponse } from "@vercel/node"; import { Redis } from "@upstash/redis";
const redis = new Redis({ url: process.env.UPSTASH_REDIS_REST_URL!, token: process.env.UPSTASH_REDIS_REST_TOKEN!, });
const telegram = https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN};
async function sendMessage(chatId: number, text: string, replyTo?: number) { await fetch(${telegram}/sendMessage, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text: text.slice(0, 4000), reply_to_message_id: replyTo, allow_sending_without_reply: true, }), }); }
export default async function handler( req: VercelRequest, res: VercelResponse ) { if (req.method !== "POST") { return res.status(200).send("Telegram bot is running"); }
const secret = process.env.TELEGRAM_WEBHOOK_SECRET; if ( !secret || req.headers["x-telegram-bot-api-secret-token"] !== secret ) { return res.status(401).send("Unauthorized"); }
try { const update = req.body; const msg = update?.message;
if (!msg?.chat?.id || !msg?.from || msg.from.is_bot) {
  return res.status(200).send("OK");
}

const chatId = msg.chat.id;
const userId = msg.from.id;
const text = msg.text  msg.caption  
"";

if (!text.trim()) return res.status(200).send("OK");

const admins = (process.env.ADMIN_IDS || "")
  .split(",").map(x => x.trim());

const isAdmin = admins.includes(String(userId));
const command = text.trim().split(/\s+/)[0].split("@")[0];

const chatKey =org/bot${process.env.TELEGRAM_B
const offKey = ai_off:${chatId};
const updateKey = update:${update.update_id};
const seen = await redis.get(updateKey);
if (seen) return res.status(200).send("OK");
await redis.set(updateKey, "1", { ex: 86400 });

if (command === "/start" || command === "/help") {
  await sendMessage(
    chatId,
    "你好！我是中文、English、မြန်မာ语三语 AI 助手。\n直接发送消息，我会自动识别语言并回复。"
  );
  return res.status(200).send("OK");
}

if (command === "/ai_off" && isAdmin) {
  await redis.set(offKey, "1");
  await sendMessage(chatId, "AI 自动回复已关闭。");
  return res.status(200).send("OK");
}

if (command === "/ai_on" && isAdmin) {
  await redis.del(offKey);
  await sendMessage(chatId, "AI 自动回复已开启。");
  return res.status(200).send("OK");
}

if (command === "/clear") {
  await redis.del(chatKey);
  await sendMessage(chatId, "本次聊天上下文已清除。");
  return res.status(200).send("OK");
}

if (text.startsWith("/")) return res.status(200).send("OK");

if (await redis.get(offKey)) {
  return res.status(200).send("OK");
}

const history =
  (await redis.get<Array<{ role: string; content: string }>>(chatKey)) || [];

const response = await fetch("https://api.openai.com/v1/responses", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization:onst userId = msg.from.id;
const text = 
  },
  body: JSON.stringify({
    model: process.env.OPENAI_MODEL || "gpt-4.1-mini",
    instructions:
      "你是一个友善、准确的三语助手。自动识别用户使用的中文、英文或缅甸语，并使用相同语言回复。用户混合使用语言时，优先使用其主要语言。回答自然、简洁，不要随意切换语言。",
    input: [
      ...history,
      { role: "user", content: text },
    ],
    max_output_tokens: 700,
  }),
});

if (!response.ok) {
  console.error("OpenAI error:", await response.text());
  await sendMessage(chatId, "暂时无法回答，请稍后再试。");
  return res.status(200).send("OK");
}

const data = await response.json();
const answer = data.output_text || "暂时没有生成回复，请再试一次。";

history.push(
  { role: "user", content: text },
  { role: "assistant", content: answer }
);

const recentHistory = history.slice(-12);
await redis.set(chatKey, recentHistory, { ex: 604800 });

await sendMessage(chatId, answer, msg.message_id);

return res.status(200).send("OK");} catch (error) { console.error(error); return res.status(200).send("OK"); } }
