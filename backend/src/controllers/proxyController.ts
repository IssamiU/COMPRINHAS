import { Request, Response } from "express";
import https from "https";

// RF11 — Mapeamento de categorias do Open Food Facts para categorias do app
const CATEGORY_MAP: Array<{ key: string; keywords: string[] }> = [
  {
    key: "Hortifruti",
    keywords: ["fruit", "vegetable", "legume", "fruta", "verdura", "hortifruti", "salad", "green", "produce", "vegetal"],
  },
  {
    key: "Laticínios",
    keywords: ["dairy", "milk", "leite", "queijo", "cheese", "yogurt", "iogurte", "butter", "manteiga", "cream", "creme", "lacticinio", "lacteo"],
  },
  {
    key: "Padaria",
    keywords: ["bread", "pao", "bakery", "padaria", "biscuit", "biscoito", "cake", "bolo", "pastry", "cookie", "cracker", "brioche"],
  },
  {
    key: "Açougue",
    keywords: ["meat", "carne", "beef", "chicken", "frango", "pork", "porco", "fish", "peixe", "seafood", "poultry", "aves", "sausage", "salami"],
  },
  {
    key: "Mercearia",
    keywords: ["cereal", "grain", "rice", "arroz", "bean", "feijao", "pasta", "macarrao", "flour", "farinha", "sugar", "acucar", "salt", "sal", "oil", "oleo", "sauce", "molho", "condiment", "tempero", "snack", "chocolate", "candy", "doce", "conserva", "canned", "jam", "honey", "mel"],
  },
  {
    key: "Bebidas",
    keywords: ["beverage", "drink", "water", "agua", "juice", "suco", "soda", "refrigerante", "coffee", "cafe", "tea", "cha", "beer", "cerveja", "wine", "vinho", "alcohol", "bebida", "cola", "energy"],
  },
  {
    key: "Congelados",
    keywords: ["frozen", "congelado", "ice cream", "sorvete"],
  },
];

function mapToAppCategory(rawTag: string): string {
  const clean = rawTag
    .replace(/^[a-z]{2}:/, "")
    .replace(/-/g, " ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  for (const { key, keywords } of CATEGORY_MAP) {
    if (keywords.some((kw) => clean.includes(kw))) return key;
  }
  return "Outros";
}

// RF11 — Proxy para Open Food Facts (barcode lookup)
export function barcodeProxy(req: Request, res: Response): void {
  const code = String(req.params.code);
  const url = `https://world.openfoodfacts.org/api/v0/product/${encodeURIComponent(code)}.json`;

  const request = https.get(url, (apiRes) => {
    let raw = "";
    apiRes.on("data", (chunk: string) => { raw += chunk; });
    apiRes.on("end", () => {
      try {
        const json = JSON.parse(raw);
        if (json.status !== 1 || !json.product) {
          res.json({ name: "", category: "Outros" });
          return;
        }
        const p = json.product;
        const name: string = (p.product_name_pt || p.product_name || "").trim();

        const tags: string[] = Array.isArray(p.categories_tags) ? p.categories_tags : [];
        let category = "Outros";
        for (const tag of tags) {
          const mapped = mapToAppCategory(String(tag));
          if (mapped !== "Outros") { category = mapped; break; }
        }

        res.json({ name, category });
      } catch {
        res.json({ name: "", category: "Outros" });
      }
    });
  });

  request.on("error", () => res.json({ name: "", category: "Outros" }));
}
