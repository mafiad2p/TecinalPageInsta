import { Router, type Request, type Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs/promises";
import axios from "axios";
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

async function fetchPageContent(url: string): Promise<string> {
  try {
    const response = await axios.get(url, {
      timeout: 10000,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; OpenClaw/1.0)" },
      maxContentLength: 500000,
    });
    const html = response.data as string;
    const textContent = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .substring(0, 5000);
    return textContent;
  } catch (err) {
    log.warn({ url, err }, "Failed to fetch product page content");
    return "";
  }
}

async function generateAISummary(productData: {
  name: string;
  description: string;
  price: string;
  buyLink: string;
  shippingRules: string;
  returnPolicy: string;
  documentContent: string;
  pageContent: string;
  imageUrl: string;
}): Promise<string> {
  try {
    const openai = getOpenAI();

    const messages: any[] = [];
    const textParts: string[] = [];

    textParts.push(`Bạn là trợ lý AI cho cửa hàng online. Hãy đọc tất cả thông tin sản phẩm bên dưới và tạo một BẢN TÓM TẮT TỔNG QUÁT bằng tiếng Việt, bao gồm:
- Tên và mô tả ngắn gọn về sản phẩm
- Giá bán (nếu có) và link mua hàng
- Thông tin vận chuyển quan trọng
- Chính sách đổi trả
- Những điểm nổi bật mà khách hàng cần biết
- Thông tin thu thập được từ trang sản phẩm (nếu có)

Hãy viết ngắn gọn, rõ ràng, dễ hiểu để bạn có thể dùng làm tài liệu tham khảo khi tư vấn khách hàng.

=== THÔNG TIN SẢN PHẨM ===
Tên: ${productData.name}
Mô tả: ${productData.description || "Không có"}
Giá: ${productData.price || "Chưa cung cấp"}
Link mua: ${productData.buyLink || "Không có"}`);

    if (productData.shippingRules) {
      textParts.push(`\n=== QUY ĐỊNH VẬN CHUYỂN ===\n${productData.shippingRules}`);
    }
    if (productData.returnPolicy) {
      textParts.push(`\n=== CHÍNH SÁCH ĐỔI TRẢ ===\n${productData.returnPolicy}`);
    }
    if (productData.documentContent) {
      textParts.push(`\n=== TÀI LIỆU SẢN PHẨM ===\n${productData.documentContent}`);
    }
    if (productData.pageContent) {
      textParts.push(`\n=== NỘI DUNG TRANG SẢN PHẨM (tự động thu thập từ link) ===\n${productData.pageContent}`);
    }

    const contentParts: any[] = [{ type: "text", text: textParts.join("\n") }];

    if (productData.imageUrl && productData.imageUrl.startsWith("http")) {
      contentParts.push({
        type: "image_url",
        image_url: { url: productData.imageUrl, detail: "low" },
      });
    }

    messages.push({ role: "user", content: contentParts });

    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      messages,
      max_tokens: 2000,
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

async function attachProductPages(productId: number, pageIds: string[]) {
  await pool.query("DELETE FROM product_pages WHERE product_id = $1", [productId]);
  if (!pageIds || pageIds.length === 0) return;
  for (const pageId of pageIds) {
    await pool.query(
      "INSERT INTO product_pages (product_id, page_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
      [productId, pageId]
    );
  }
}

async function getProductPageIds(productId: number): Promise<string[]> {
  const result = await pool.query("SELECT page_id FROM product_pages WHERE product_id = $1", [productId]);
  return result.rows.map((r: any) => r.page_id);
}

router.get("/products", async (_req: Request, res: Response) => {
  try {
    const result = await pool.query("SELECT * FROM products ORDER BY id");
    const products = [];
    for (const row of result.rows) {
      const pageIds = await getProductPageIds(row.id);
      products.push({ ...row, assigned_pages: pageIds });
    }
    res.json({ success: true, data: products });
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
    const pageIds = await getProductPageIds(result.rows[0].id);
    res.json({ success: true, data: { ...result.rows[0], assigned_pages: pageIds } });
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
      const { sku, name, description, price, currency, buyLink, shippingRules, returnPolicy, keywords, assignedPages } = req.body;
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

      const priceValue = price ? parseFloat(price) : null;

      const result = await pool.query(
        `INSERT INTO products (sku, name, description, price, currency, buy_link, shipping_info, keywords, image_url, shipping_rules, return_policy, product_docs, ai_summary)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *`,
        [
          sku, name, description || "", priceValue, currency || "VND",
          buyLink || "", JSON.stringify({}), keywords ? (typeof keywords === "string" ? keywords.split(",").map((k: string) => k.trim()) : keywords) : [],
          imageUrl, shippingRules || "", returnPolicy || "", productDocs, ""
        ]
      );

      const product = result.rows[0];

      const pageIds = assignedPages ? (typeof assignedPages === "string" ? JSON.parse(assignedPages) : assignedPages) : [];
      await attachProductPages(product.id, pageIds);

      log.info({ productId: product.id, name }, "Product created, generating AI summary...");

      let pageContent = "";
      if (buyLink) {
        pageContent = await fetchPageContent(buyLink);
      }

      const aiSummary = await generateAISummary({
        name,
        description: description || "",
        price: priceValue ? `${priceValue} ${currency || "VND"}` : "Chưa cung cấp",
        buyLink: buyLink || "",
        shippingRules: shippingRules || "",
        returnPolicy: returnPolicy || "",
        documentContent,
        pageContent,
        imageUrl: "",
      });

      await pool.query(
        "UPDATE products SET ai_summary = $1, updated_at = NOW() WHERE id = $2",
        [aiSummary, product.id]
      );

      product.ai_summary = aiSummary;
      product.assigned_pages = pageIds;
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
      const { name, description, price, buyLink, shippingRules, returnPolicy, keywords, isActive, regenerateSummary, assignedPages } = req.body;
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

      const priceValue = price !== undefined && price !== "" ? parseFloat(price) : null;

      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIdx = 1;

      if (name !== undefined) { setClauses.push(`name = $${paramIdx++}`); values.push(name); }
      if (description !== undefined) { setClauses.push(`description = $${paramIdx++}`); values.push(description); }
      setClauses.push(`price = $${paramIdx++}`); values.push(priceValue);
      if (buyLink !== undefined) { setClauses.push(`buy_link = $${paramIdx++}`); values.push(buyLink); }
      if (shippingRules !== undefined) { setClauses.push(`shipping_rules = $${paramIdx++}`); values.push(shippingRules); }
      if (returnPolicy !== undefined) { setClauses.push(`return_policy = $${paramIdx++}`); values.push(returnPolicy); }
      if (keywords) {
        setClauses.push(`keywords = $${paramIdx++}`);
        values.push(typeof keywords === "string" ? keywords.split(",").map((k: string) => k.trim()) : keywords);
      }
      if (isActive !== undefined) {
        setClauses.push(`is_active = $${paramIdx++}`);
        values.push(isActive === "true" || isActive === true);
      }
      if (imageUrl) { setClauses.push(`image_url = $${paramIdx++}`); values.push(imageUrl); }
      if (productDocs) { setClauses.push(`product_docs = $${paramIdx++}`); values.push(productDocs); }
      setClauses.push("updated_at = NOW()");
      values.push(id);

      await pool.query(
        `UPDATE products SET ${setClauses.join(", ")} WHERE id = $${paramIdx}`,
        values
      );

      if (assignedPages) {
        const pageIds = typeof assignedPages === "string" ? JSON.parse(assignedPages) : assignedPages;
        await attachProductPages(parseInt(id), pageIds);
      }

      if (regenerateSummary === "true" || regenerateSummary === true) {
        const current = await pool.query("SELECT * FROM products WHERE id = $1", [id]);
        if (current.rows.length > 0) {
          const p = current.rows[0];
          let docContent = documentContent;
          if (!docContent && p.product_docs) {
            const docPath = path.resolve(process.cwd(), p.product_docs.replace("/api/", ""));
            try { docContent = await fs.readFile(docPath, "utf-8"); } catch { docContent = ""; }
          }

          let pageContent = "";
          const link = buyLink || p.buy_link;
          if (link) {
            pageContent = await fetchPageContent(link);
          }

          const aiSummary = await generateAISummary({
            name: name || p.name,
            description: description || p.description,
            price: (priceValue || p.price) ? `${priceValue || p.price} ${p.currency}` : "Chưa cung cấp",
            buyLink: link || "",
            shippingRules: shippingRules || p.shipping_rules,
            returnPolicy: returnPolicy || p.return_policy,
            documentContent: docContent,
            pageContent,
            imageUrl: "",
          });

          await pool.query("UPDATE products SET ai_summary = $1, updated_at = NOW() WHERE id = $2", [aiSummary, id]);
        }
      }

      const updated = await pool.query("SELECT * FROM products WHERE id = $1", [id]);
      const updatedPageIds = await getProductPageIds(parseInt(id));
      res.json({ success: true, data: { ...updated.rows[0], assigned_pages: updatedPageIds } });
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
      try { docContent = await fs.readFile(docPath, "utf-8"); } catch { docContent = ""; }
    }

    let pageContent = "";
    if (p.buy_link) {
      pageContent = await fetchPageContent(p.buy_link);
    }

    const aiSummary = await generateAISummary({
      name: p.name,
      description: p.description,
      price: p.price ? `${p.price} ${p.currency}` : "Chưa cung cấp",
      buyLink: p.buy_link,
      shippingRules: p.shipping_rules,
      returnPolicy: p.return_policy,
      documentContent: docContent,
      pageContent,
      imageUrl: "",
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
