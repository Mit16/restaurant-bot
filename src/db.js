import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// Run this once to create tables
export async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS sessions (
    chat_id BIGINT PRIMARY KEY,
    history JSONB NOT NULL DEFAULT '[]',
    updated_at TIMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    chat_id BIGINT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    total_price INT NOT NULL,
    created_at IMESTAMP DEFAULT NOW()
    );

    CREATE TABLE IF NOT EXISTS order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES orders(id),
    item_name VARCHAR(100),
    qty INT,
    price INT
    );
    
    
    `);
  console.log("Database tables intitalized");
}

export async function getHistory(chatId) {
  const res = await pool.query(
    "SELECT history FROM sessions WHERE chat_id = $1",
    [chatId],
  );
  return res.rows[0]?.history || [];
}

export async function saveHistory(chatId, history) {
  await pool.query(
    `
        INSERT INTO sessions (chat_id, history, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (chat_id)
        DO UPDATE SET history = $2, updated_at = NOW()
        `,
    [chatId, JSON.stringify(history)],
  );
}

export async function saveOrder(chatId, orderData) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    const orderRes = await client.query(
      `
            INSERT INTO orders (chat_id, total_price)
            VALUES ($1, $2) RETURNING id
            `,
      [chatId, orderData.total],
    );

    const orderId = orderRes.rows[0].id;

    for (const item of orderData.order) {
      await client.query(
        `
                INSERT INTO order_items (order_id, item_name, qty, price)
                VALUES ($1, $2, $3, $4)
                `,
        [orderId, item.item, item.qty, item.price],
      );
    }

    await client.query("COMMIT");
    return orderId;
  } catch (err) {
    await client.query("ROLLBACK");
    throw err;
  } finally {
    client.release();
  }
}

export async function getRecentOrders(limit = 20) {
  const res = await pool.query(
    `
    SELECT o.id, o.chat_id, o.status, o.total_price, o.created_at,
           json_agg(json_build_object(
             'item', oi.item_name, 'qty', oi.qty, 'price', oi.price
           )) AS items
    FROM orders o
    JOIN order_items oi ON oi.order_id = o.id
    GROUP BY o.id
    ORDER BY o.created_at DESC
    LIMIT $1
  `,
    [limit],
  );
  return res.rows;
}

export async function updateOrderStatus(orderId, status) {
  await pool.query("UPDATE orders SET status = $1 WHERE id = $2", [
    status,
    orderId,
  ]);
}
