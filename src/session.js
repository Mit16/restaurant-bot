import { getHistory, saveHistory } from "./db.js";

const MAX_HISTORY = 20; // Keep last 20 messages, prevent toekn bloat

export async function appendAndSave(chatId, userMsg, assistantReply) {
  let history = await getHistory(chatId);

  history.push({ role: "user", content: userMsg });
  history.push({ role: "assistant", content: assistantReply });

  // trim oldest message if too long
  if (history.length > MAX_HISTORY) {
    history = history.slice(history.length - MAX_HISTORY);
  }

  await saveHistory(chatId, history);
  return history;
}

export async function clearSession(chatId) {
  await saveHistory(chatId, []);
}
