import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { childLogger } from "../core/logger.js";

const router = Router();
const log = childLogger({ module: "product-routes" });

router.get("/products", async (_req: Request, res: Response) => {
  try {
    const rows = await db.execute(sql`SELECT * FROM products ORDER BY id`);
    res.json({ success: true, data: rows.rows });
  } catch (err) {
    log.error({ err }, "Failed to fetch products");
    res.status(500).json({ success: false, error: "Failed to fetch products" });
  }
});

router.post("/products", async (req: Request, res: Response) => {
  const { sku, name, description, price, currency, buyLink, shippingInfo, keywords } = req.body;
  try {
    const result = await db.execute(sql`
      INSERT INTO products (sku, name, description, price, currency, buy_link, shipping_info, keywords)
      VALUES (${sku}, ${name}, ${description}, ${price}, ${currency ?? "USD"}, ${buyLink}, ${JSON.stringify(shippingInfo ?? {})}::jsonb, ${keywords ?? []})
      RETURNING *
    `);
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (err) {
    log.error({ err }, "Failed to create product");
    res.status(500).json({ success: false, error: "Failed to create product" });
  }
});

router.put("/products/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description, price, buyLink, shippingInfo, keywords, isActive } = req.body;
  try {
    await db.execute(sql`
      UPDATE products SET
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        price = COALESCE(${price}, price),
        buy_link = COALESCE(${buyLink}, buy_link),
        shipping_info = COALESCE(${JSON.stringify(shippingInfo)}::jsonb, shipping_info),
        keywords = COALESCE(${keywords}, keywords),
        is_active = COALESCE(${isActive}, is_active),
        updated_at = NOW()
      WHERE id = ${id}
    `);
    res.json({ success: true });
  } catch (err) {
    log.error({ err }, "Failed to update product");
    res.status(500).json({ success: false, error: "Failed to update product" });
  }
});

router.delete("/products/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await db.execute(sql`UPDATE products SET is_active = false WHERE id = ${id}`);
    res.json({ success: true });
  } catch (err) {
    log.error({ err }, "Failed to delete product");
    res.status(500).json({ success: false, error: "Failed to delete product" });
  }
});

export default router;
