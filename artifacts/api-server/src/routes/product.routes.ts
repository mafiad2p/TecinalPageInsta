import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import { pool } from "@workspace/db";
import { childLogger } from "../core/logger.js";
import { getOpenAI } from "../integrations/openai/client.js";

const router = Router();
const log = childLogger({ module: "product-routes" });

const uploadsDir = path.resolve(process.cwd(), "uploads/products");

async function ensureUploadsDir() {
  await fs.mkdir(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: async (_req, _file, cb) => {
    await ensureUploadsDir();
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.fieldname === "image") {
      const allowed = /\.(jpg|jpeg|png|gif|webp)$/i;
      if (!allowed.test(file.originalname)) {
        cb(new Error("Chỉ chấp nhận file ảnh (jpg, png, gif, webp)"));
        return;
      }
    }
    if (file.fieldname === "document") {
      const allowed = /\.(txt|pdf|doc|docx|md|csv)$/i;
      if (!allowed.test(file.originalname)) {
        cb(new Error("Chỉ chấp nhận file tài liệu (txt, pdf, doc, docx, md, csv)"));
        return;
      }
    }
    cb(null, true);
  },
});

const productUpload = upload.fields([
  { name: "image", maxCount: 1 },
  { name: "document", maxCount: 1 },
]);

async function generateAISummary(productData: {
  name: string;
  description: string;
  price: string;
  buyLink: string;
  shippingRules: string;
  returnPolicy: string;
  documentContent: string;
}): Promise<string> {
  try {
    const openai = getOpenAI();
    const prompt = `Bạn là trợ lý AI cho cửa hàng online. Hãy đọc tất cả thông tin sản phẩm bên dưới và tạo một BẢN TÓM TẮT TỔNG QUÁT bằng tiếng Việt, bao gồm:
- Tên và mô tả ngắn gọn về sản phẩm
- Giá bán và link mua hàng
- Thông tin vận chuyển quan trọng
- Chính sách đổi trả
- Những điểm nổi bật mà khách hàng cần biết

Hãy viết ngắn gọn, rõ ràng, dễ hiểu để bạn có thể dùng làm tài liệu tham khảo khi tư vấn khách hàng.

=== THÔNG TIN SẢN PHẨM ===
Tên: ${productData.name}
Mô tả: ${productData.description || "Không có"}
Giá: ${productData.price}
Link mua: ${productData.buyLink || "Không có"}

=== QUY ĐỊNH VẬN CHUYỂN ===
${productData.shippingRules || "Không có thông tin"}

=== CHÍNH SÁCH ĐỔI TRẢ ===
${productData.returnPolicy || "Không có thông tin"}

=== TÀI LIỆU SẢN PHẨM ===
${productData.documentContent || "Không có tài liệu đính kèm"}`;

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages: [{ role: "user", content: prompt }],
      max_tokens: 1500,
      temperature: 0.3,
    });

    return response.choices[0]?.message?.content || "Không thể tạo tóm tắt.";
  } catch (err) {
    log.error({ err }, "Failed to generate AI summary");
    return "Lỗi khi tạo tóm tắt AI. Vui lòng thử lại.";
  }
}

async function readDocumentContent(filePath: string, originalName: string): Promise<string> {
  try {
    const ext = path.extname(originalName).toLowerCase();
    if ([".txt", ".md", ".csv"].includes(ext)) {
      return await fs.readFile(filePath, "utf-8");
    }
    return `[File đính kèm: ${originalName}]`;
  } catch (err) {
    log.error({ err }, "Failed to read document");
    return "";
  }
}

router.get("/products", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY id");
    res.json({ success: true, data: result.rows });
  } catch (err) {
    log.error({ err }, "Failed to fetch products");
    res.status(500).json({ success: false, error: "Failed to fetch products" });
  }
});

router.get("/products/:id", async (req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM products WHERE id = $1", [req.params.id]);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: "Không tìm thấy sản phẩm" });
      return;
    }
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    log.error({ err }, "Failed to fetch product");
    res.status(500).json({ success: false, error: "Failed to fetch product" });
  }
});

router.post("/products", (req: Request, res: Response) => {
  productUpload(req, res, async (err: any) => {
    if (err) {
      res.status(400).json({ success: false, error: err.message });
      return;
    }

    try {
      const { sku, name, description, price, currency, buyLink, shippingRules, returnPolicy, keywords } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      let imageUrl = "";
      if (files?.image?.[0]) {
        imageUrl = `/api/uploads/products/${files.image[0].filename}`;
      }

      let documentContent = "";
      let productDocs = "";
      if (files?.document?.[0]) {
        const docFile = files.document[0];
        productDocs = `/api/uploads/products/${docFile.filename}`;
        documentContent = await readDocumentContent(docFile.path, docFile.originalname);
      }

      const result = await pool.query(
        `INSERT INTO products (sku, name, description, price, currency, buy_link, shipping_info, keywords, image_url, shipping_rules, return_policy, product_docs, ai_summary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
        [
          sku, name, description || "", parseFloat(price) || 0, currency || "VND",
          buyLink || "", JSON.stringify({}), keywords ? (typeof keywords === "string" ? keywords.split(",").map((k: string) => k.trim()) : keywords) : [],
          imageUrl, shippingRules || "", returnPolicy || "", productDocs, ""
        ]
      );

      const product = result.rows[0];
      log.info({ productId: product.id, name }, "Product created, generating AI summary...");

      const aiSummary = await generateAISummary({
        name,
        description: description || "",
        price: `${price} ${currency || "VND"}`,
        buyLink: buyLink || "",
        shippingRules: shippingRules || "",
        returnPolicy: returnPolicy || "",
        documentContent,
      });

      await pool.query(
        "UPDATE products SET ai_summary = $1, updated_at = NOW() WHERE id = $2",
        [aiSummary, product.id]
      );

      product.ai_summary = aiSummary;
      log.info({ productId: product.id }, "AI summary generated successfully");

      res.status(201).json({ success: true, data: product });
    } catch (err) {
      log.error({ err }, "Failed to create product");
      res.status(500).json({ success: false, error: "Failed to create product" });
    }
  });
});

router.put("/products/:id", (req: Request, res: Response) => {
  productUpload(req, res, async (err: any) => {
    if (err) {
      res.status(400).json({ success: false, error: err.message });
      return;
    }

    try {
      const { id } = req.params;
      const { name, description, price, buyLink, shippingRules, returnPolicy, keywords, isActive, regenerateSummary } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      let imageUrl: string | null = null;
      if (files?.image?.[0]) {
        imageUrl = `/api/uploads/products/${files.image[0].filename}`;
      }

      let productDocs: string | null = null;
      let documentContent = "";
      if (files?.document?.[0]) {
        const docFile = files.document[0];
        productDocs = `/api/uploads/products/${docFile.filename}`;
        documentContent = await readDocumentContent(docFile.path, docFile.originalname);
      }

      await pool.query(
        `UPDATE products SET
          name = COALESCE($1, name),
          description = COALESCE($2, description),
          price = COALESCE($3, price),
          buy_link = COALESCE($4, buy_link),
          shipping_rules = COALESCE($5, shipping_rules),
          return_policy = COALESCE($6, return_policy),
          keywords = COALESCE($7, keywords),
          is_active = COALESCE($8, is_active),
          image_url = COALESCE($9, image_url),
          product_docs = COALESCE($10, product_docs),
          updated_at = NOW()
         WHERE id = $11`,
        [
          name || null, description || null, price ? parseFloat(price) : null,
          buyLink || null, shippingRules || null, returnPolicy || null,
          keywords ? (typeof keywords === "string" ? keywords.split(",").map((k: string) => k.trim()) : keywords) : null,
          isActive !== undefined ? isActive === "true" || isActive === true : null,
          imageUrl, productDocs, id
        ]
      );

      if (regenerateSummary === "true" || regenerateSummary === true) {
        const current = await pool.query("SELECT * FROM products WHERE id = $1", [id]);
        if (current.rows.length > 0) {
          const p = current.rows[0];
          let docContent = documentContent;
          if (!docContent && p.product_docs) {
            const docPath = path.resolve(process.cwd(), p.product_docs.replace("/api/", ""));
            try {
              docContent = await fs.readFile(docPath, "utf-8");
            } catch { docContent = ""; }
          }

          const aiSummary = await generateAISummary({
            name: name || p.name,
            description: description || p.description,
            price: `${price || p.price} ${p.currency}`,
            buyLink: buyLink || p.buy_link,
            shippingRules: shippingRules || p.shipping_rules,
            returnPolicy: returnPolicy || p.return_policy,
            documentContent: docContent,
          });

          await pool.query("UPDATE products SET ai_summary = $1, updated_at = NOW() WHERE id = $2", [aiSummary, id]);
        }
      }

      const updated = await pool.query("SELECT * FROM products WHERE id = $1", [id]);
      res.json({ success: true, data: updated.rows[0] });
    } catch (err) {
      log.error({ err }, "Failed to update product");
      res.status(500).json({ success: false, error: "Failed to update product" });
    }
  });
});

router.post("/products/:id/regenerate-summary", async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const result = await pool.query("SELECT * FROM products WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      res.status(404).json({ success: false, error: "Không tìm thấy sản phẩm" });
      return;
    }

    const p = result.rows[0];
    let docContent = "";
    if (p.product_docs) {
      const docPath = path.resolve(process.cwd(), p.product_docs.replace("/api/", ""));
      try {
        docContent = await fs.readFile(docPath, "utf-8");
      } catch { docContent = ""; }
    }

    const aiSummary = await generateAISummary({
      name: p.name,
      description: p.description,
      price: `${p.price} ${p.currency}`,
      buyLink: p.buy_link,
      shippingRules: p.shipping_rules,
      returnPolicy: p.return_policy,
      documentContent: docContent,
    });

    await pool.query("UPDATE products SET ai_summary = $1, updated_at = NOW() WHERE id = $2", [aiSummary, id]);
    res.json({ success: true, data: { ai_summary: aiSummary } });
  } catch (err) {
    log.error({ err }, "Failed to regenerate summary");
    res.status(500).json({ success: false, error: "Failed to regenerate summary" });
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
