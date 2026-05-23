import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// ─── EDIT THIS MENU TO MATCH YOUR RESTAURANT ───────────────────────────
const MENU = `
STARTERS
- Paneer Tikka        ₹220
- Veg Spring Rolls    ₹160
- Soup of the Day     ₹120

MAINS
- Paneer Butter Masala  ₹280
- Dal Makhani           ₹220
- Chole Bhature         ₹180
- Veg Biryani           ₹250

BREADS
- Butter Naan    ₹40
- Garlic Naan    ₹50
- Tandoori Roti  ₹30

DRINKS
- Mango Lassi    ₹80
- Masala Chaas   ₹60
- Cold Drink     ₹40
`;
// ────────────────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a friendly order-taking assistant for "Spice Garden" restaurant on Telegram.

MENU:
${MENU}

RULES:
1. Greet new customers warmly on their first message.
2. Help customers browse the menu if they ask.
3. When a customer orders something, confirm the item and price before adding.
4. Keep a running summary of what they've ordered so far if they order multiple items.
5. When the customer says "confirm", "done", "place order", or "yes" to finalize:
   - Output their complete order as a JSON block in this EXACT format (nothing else after it):
   {"order":[{"item":"Paneer Butter Masala","qty":1,"price":280}],"total":280}
6. After the JSON, add a short friendly confirmation message.
7. Reply in the same language the customer uses (Hindi, English, or Hinglish).
8. Keep replies SHORT — 2 to 4 lines max. No long paragraphs.
9. If a customer asks for something not on the menu, politely say it's unavailable.
10. If a customer types "/menu", show the full menu cleanly.
11. If a customer types "/clear", tell them their order has been reset.

PERSONALITY: Warm, helpful, slightly casual. Like a friendly waiter, not a robot.`;

export async function callClaude(userMessage, history) {
  const messages = [...history, { role: "user", content: userMessage }];

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 400,
    system: SYSTEM_PROMPT,
    messages,
  });

  return response.content[0].text;
}

// Detect if Claude's reply contains a confirmed order JSON block
export function extractOrder(replyText) {
  try {
    const match = replyText.match(/\{[\s\S]*?"order"[\s\S]*?\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    if (!parsed.order || !Array.isArray(parsed.order)) return null;
    return parsed;
  } catch {
    return null;
  }
}
