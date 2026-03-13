import { Router, type Request, type Response } from "express";
import { pool } from "@workspace/db";
import { childLogger } from "../core/logger.js";

const router = Router();
const log = childLogger({ module: "product-routes" });

router.get("/products", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY id");
    res.json({ success: true, data: result.rows });
  } catch (err) {
    log.error({ err }, "Failed to fetch products");
    res.status(500).json({ success: false, error: "Failed to fetch products" });
  }
});

router.post("/products", async (req: Request, res: Response) => {
  const { sku, name, description, price, currency, buyLink, shippingInfo, keywords } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO products (sku, name, description, price, currency, buy_link, shipping_info, keywords)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [sku, name, description, price, currency ?? "VND", buyLink, JSON.stringify(shippingInfo ?? {}), keywords ?? []]
    );
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
    await pool.query(
      `UPDATE products SET
        name = COALESCE($1, name),
        description = COALESCE($2, description),
        price = COALESCE($3, price),
        buy_link = COALESCE($4, buy_link),
        shipping_info = COALESCE($5::jsonb, shipping_info),
        keywords = COALESCE($6, keywords),
        is_active = COALESCE($7, is_active),
        updated_at = NOW()
       WHERE id = $8`,
      [name, description, price, buyLink, shippingInfo ? JSON.stringify(shippingInfo) : null, keywords, isActive, id]
    );
    res.json({ success: true });
  } catch (err) {
    log.error({ err }, "Failed to update product");
    res.status(500).json({ success: false, error: "Failed to update product" });
  }
});

router.delete("/products/:id", async (req: Request, res: Response) => {
  const { id } = req.params;
  try {
    await pool.query("UPDATE products SET is_active = false WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    log.error({ err }, "Failed to delete product");
    res.status(500).json({ success: false, error: "Failed to delete product" });
  }
});

export default router;
