import TelegramBot from "node-telegram-bot-api";
import { callClaude, extractOrder } from "./claude.js";
import { appendAndSave, clearSession } from "./session.js";
import { getHistory, saveOrder } from "./db.js";

export default function createBot(io) {
  // io = socket.io instance, passes in for kitchen dashboard
  const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, {
    polling: true,
  });

  console.log("Telegram bot started");

  // /start command
  bot.onText(/\/start/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      `Welcome to *Spice Garden* 🍛\n\nI'm your order assistant. Tell me what you'd like, or type /menu to see what we have.`,
      { parse_mode: "Markdown" },
    );
  });

  // /menu command
  bot.onText(/\/menu/, (msg) => {
    bot.sendMessage(
      msg.chat.id,
      `Here's our menu — just tell me what you'd like!\n\n*STARTERS*\nPaneer Tikka ₹220 | Veg Spring Rolls ₹160 | Soup ₹120\n\n*MAINS*\nPaneer Butter Masala ₹280 | Dal Makhani ₹220 | Chole Bhature ₹180 | Veg Biryani ₹250\n\n*BREADS*\nButter Naan ₹40 | Garlic Naan ₹50 | Tandoori Roti ₹30\n\n*DRINKS*\nMango Lassi ₹80 | Masala Chaas ₹60 | Cold Drink ₹40`,
      { parse_mode: "Markdown" },
    );
  });

  // /clear command - reset session
  bot.onText(/\/clear/, async (msg) => {
    await clearSession(msg.chat.id);
    bot.sendMessage(msg.chat.id, "Your order has been cleared. Start fresh!");
  });

  // All regular message
  bot.on("message", async (msg) => {
    if (!msg.text || msg.text.startsWith("/")) return; // skip commands

    const chatId = msg.chat.id;
    const userMsg = msg.text;

    try {
      // Show typing indicator
      bot.sendChatAction(chatId, "typing");

      // Get session history
      const history = await getHistory(chatId);

      // Call Claude
      const reply = await callClaude(userMsg, history);

      // Save to session
      await appendAndSave(chatId, userMsg, reply);

      // Check if an order was confirmed
      const order = extractOrder(reply);
      if (order) {
        const orderId = await saveOrder(chatId, order);
        console.log("New order saved: ${orderId");

        // Emit to kitchen dashboard if socket.io is connected
        if (io) {
          io.emit("new_order", {
            orderId,
            chatId,
            items: order.order,
            total: order.total,
            time: new Date().toLocaleTimeString(),
          });
        }
      }

      // Send reply to customer
      // Strip the JSON block from the customer-facing message
      const cleanReply = reply
        .replace(/\{[\s\S]*?"order"[\s\S]*?\}/, "")
        .trim();
      bot.sendMessage(chatId, cleanReply || "Your order has been placed!");
    } catch (err) {
      console.error("Error processing message:", err);
      bot.sendMessage(chatId, "Sorry, something went wrong. Please try again.");
    }
  });

  return bot;
}
