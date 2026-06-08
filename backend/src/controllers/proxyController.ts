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

const SHOP_TYPE_LABELS: Record<string, string> = {
  supermarket: "Supermercado", wholesale: "Atacadista",
  grocery: "Mercearia", convenience: "Conveniência",
  hypermarket: "Hipermercado", department_store: "Loja de Departamento",
  food: "Alimentação", general: "Mercado Geral",
};

// RF19 — Nominatim reverse geocode: dado lat/lng retorna "Rua X, Bairro Y"
function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  return new Promise((resolve) => {
    const path = `/reverse?lat=${lat}&lon=${lng}&format=json&zoom=17&addressdetails=1&accept-language=pt-BR`;
    const options: https.RequestOptions = {
      hostname: "nominatim.openstreetmap.org",
      path,
      method: "GET",
      headers: {
        "User-Agent": "MealSync/1.0 contact:issami.umeoka@gmail.com",
        "Accept": "application/json",
      },
    };
    const req = https.request(options, (apiRes) => {
      let raw = "";
      apiRes.on("data", (chunk: Buffer) => { raw += chunk.toString("utf8"); });
      apiRes.on("end", () => {
        try {
          const json = JSON.parse(raw);
          const a = json.address ?? {};
          const road   = a.road || a.pedestrian || a.path || a.footway || a.cycleway || "";
          const suburb = a.suburb || a.neighbourhood || a.city_district || a.quarter || a.town || "";
          const parts  = [road, suburb].filter(Boolean);
          resolve(parts.length > 0 ? parts.join(", ") : null);
        } catch { resolve(null); }
      });
    });
    req.setTimeout(6000, () => { req.destroy(); resolve(null); });
    req.on("error", () => resolve(null));
    req.end();
  });
}

// Geocodifica em paralelo (grupos de 8) apenas lojas sem endereço
async function enrichWithAddresses(markets: any[]): Promise<void> {
  const noAddr = markets.filter((m: any) => !m.address);
  if (noAddr.length === 0) return;
  console.log(`[RF19] Geocodificando ${noAddr.length} lojas sem endereço via Nominatim...`);
  const CONCURRENCY = 8;
  for (let i = 0; i < noAddr.length; i += CONCURRENCY) {
    await Promise.all(
      noAddr.slice(i, i + CONCURRENCY).map(async (m: any) => {
        const addr = await reverseGeocode(m.lat, m.lng);
        if (addr) m.address = addr;
      })
    );
  }
}

// Servidores Overpass em ordem de preferência
const OVERPASS_SERVERS = [
  "overpass-api.de",
  "overpass.kumi.systems",
  "overpass.openstreetmap.fr",
];

function overpassPost(query: string, hostname: string): Promise<{ elements: any[]; err?: string }> {
  return new Promise((resolve) => {
    const body = `data=${encodeURIComponent(query)}`;
    const options: https.RequestOptions = {
      hostname,
      path: "/api/interpreter",
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Content-Length": Buffer.byteLength(body),
        // User-Agent obrigatório pela política de uso do Overpass
        "User-Agent": "MealSync/1.0 contact:issami.umeoka@gmail.com",
      },
    };

    const req = https.request(options, (apiRes) => {
      let raw = "";
      apiRes.on("data", (chunk: Buffer) => { raw += chunk.toString("utf8"); });
      apiRes.on("end", () => {
        if (apiRes.statusCode && apiRes.statusCode >= 400) {
          resolve({ elements: [], err: `HTTP ${apiRes.statusCode}` });
          return;
        }
        try {
          const json = JSON.parse(raw);
          resolve({ elements: Array.isArray(json.elements) ? json.elements : [] });
        } catch {
          // Overpass às vezes retorna XML de erro — capturar trecho para diagnóstico
          resolve({ elements: [], err: `parse_error: ${raw.slice(0, 120)}` });
        }
      });
    });

    req.setTimeout(10000, () => { req.destroy(); resolve({ elements: [], err: "timeout" }); });
    req.on("error", (e: Error) => resolve({ elements: [], err: e.message }));
    req.write(body);
    req.end();
  });
}

// Tenta cada servidor Overpass até obter resultado
async function overpassQuery(query: string): Promise<any[]> {
  for (const server of OVERPASS_SERVERS) {
    const { elements, err } = await overpassPost(query, server);
    console.log(`[RF19] ${server}: ${elements.length} elementos${err ? ` | err: ${err}` : ""}`);
    if (elements.length > 0) return elements;
    if (!err) return []; // sem erro mas sem resultados = não há dados no OSM
  }
  return [];
}

function buildAddress(tags: Record<string, string>): string | null {
  // 1ª opção: endereço completo em campo único
  if (tags["addr:full"]) return tags["addr:full"];

  // 2ª opção: rua + número
  const street = tags["addr:street"] || tags["contact:street"] || tags["addr:place"] || "";
  const number = tags["addr:housenumber"] || "";
  if (street) return [street, number].filter(Boolean).join(", ");

  // 3ª opção: bairro / cidade como referência
  const suburb = tags["addr:suburb"] || tags["addr:neighbourhood"] || tags["addr:quarter"] || tags["addr:district"] || "";
  const city   = tags["addr:city"] || tags["addr:town"] || tags["addr:village"] || "";
  if (suburb || city) return [suburb, city].filter(Boolean).join(", ");

  // 4ª opção: logradouro de contato
  if (tags["contact:full_address"]) return tags["contact:full_address"];

  return null;
}

function parseOverpassElements(elements: any[]): any[] {
  const seen = new Set<string>();
  return elements
    .map((el: any) => {
      const elLat = el.type === "node" ? el.lat : el.center?.lat;
      const elLng = el.type === "node" ? el.lon : el.center?.lon;
      if (!elLat || !elLng) return null;
      const key = `${parseFloat(elLat).toFixed(4)},${parseFloat(elLng).toFixed(4)}`;
      if (seen.has(key)) return null;
      seen.add(key);
      const tags: Record<string, string> = el.tags ?? {};
      const shopType = tags.shop ?? "";
      return {
        id: String(el.id),
        name: tags.name || tags["name:pt"] || SHOP_TYPE_LABELS[shopType] || "Comércio",
        type: SHOP_TYPE_LABELS[shopType] ?? "Comércio",
        lat: elLat,
        lng: elLng,
        address: buildAddress(tags),
      };
    })
    .filter(Boolean);
}

// RF19 — GET /proxy/supermarkets?lat=&lng= → supermercados próximos via Overpass API
export async function supermarketsProxy(req: Request, res: Response): Promise<void> {
  const { lat, lng } = req.query as { lat?: string; lng?: string };

  if (!lat || !lng || isNaN(parseFloat(lat)) || isNaN(parseFloat(lng))) {
    res.status(400).json({ error: "Parâmetros lat e lng obrigatórios" });
    return;
  }

  console.log(`[RF19] Buscando supermercados em lat=${lat} lng=${lng}`);

  // Q1: por tipo de loja — inclui shop=supermarket, wholesale (Atacadão/Assaí), grocery, etc.
  const shopTypes = "supermarket|wholesale|grocery|convenience|hypermarket|department_store|food|general";
  const q1 = `[out:json][timeout:20];(node["shop"~"${shopTypes}"](around:5000,${lat},${lng});way["shop"~"${shopTypes}"](around:5000,${lat},${lng}););out center;`;

  // Q2: por nome das redes brasileiras — sem acentos para evitar bug no regex do Overpass
  // (Atacadao=Atacadão, Assai=Assaí, etc)
  const chains = "Atacad|Assai|Carrefour|Extra|Makro|Condor|Muffato|Walmart|Hiper|BIG|Stix|Leve";
  const q2 = `[out:json][timeout:20];(node["name"~"${chains}",i](around:5000,${lat},${lng});way["name"~"${chains}",i](around:5000,${lat},${lng}););out center;`;

  // Q3: rede ampla — qualquer tag shop dentro de 3km (fallback para dados escassos como interior do Brasil)
  const q3 = `[out:json][timeout:20];(node["shop"](around:3000,${lat},${lng});way["shop"](around:3000,${lat},${lng}););out center;`;

  try {
    // Inicia Q1 e Q2 em paralelo, mas retorna assim que Q1 tiver resultado
    const q1Promise = overpassQuery(q1);
    const q2Promise = overpassQuery(q2); // começa em background

    const els1 = await q1Promise;
    if (els1.length > 0) {
      // Q1 trouxe resultados — não espera Q2 (evita 60s de timeout desnecessário)
      const markets = parseOverpassElements(els1);
      await enrichWithAddresses(markets);
      console.log(`[RF19] Total final: ${markets.length} supermercados (via q1)`);
      res.json(markets);
      return;
    }

    // Q1 vazio — aguarda Q2 (busca por nome de rede)
    const els2 = await q2Promise;
    if (els2.length > 0) {
      const markets = parseOverpassElements(els2);
      await enrichWithAddresses(markets);
      console.log(`[RF19] Total final: ${markets.length} supermercados (via q2)`);
      res.json(markets);
      return;
    }

    // Ambas vazias — query ampla como último recurso
    console.log("[RF19] Q1 e Q2 vazias, tentando query ampla...");
    const els3 = await overpassQuery(q3);
    const markets = parseOverpassElements(els3);
    await enrichWithAddresses(markets);
    console.log(`[RF19] Total final: ${markets.length} supermercados (via q3 fallback)`);
    res.json(markets);
  } catch (e: any) {
    console.error("[RF19] Erro inesperado:", e?.message);
    res.json([]);
  }
}

// RF18 — Tabela de conversão culinária (ml = base de volume, g = base de peso)
const VOLUME_ML: Record<string, number> = {
  ml: 1,
  l: 1000,
  litro: 1000,
  litros: 1000,
  "xcara": 240,
  "xícara": 240,
  copo: 200,
  "colher de sopa": 15,
  "colher de cha": 5,
  "colher de chá": 5,
};

const WEIGHT_G: Record<string, number> = {
  g: 1,
  grama: 1,
  gramas: 1,
  kg: 1000,
  quilograma: 1000,
  quilogramas: 1000,
  oz: 28.35,
  lb: 453.59,
  libra: 453.59,
};

// RF18 — GET /proxy/convert?value=&from=&to=
export function convertProxy(req: Request, res: Response): void {
  const { value, from, to } = req.query as { value?: string; from?: string; to?: string };

  if (!value || !from || !to) {
    res.status(400).json({ error: "Parâmetros obrigatórios: value, from, to" });
    return;
  }

  const num = parseFloat(value);
  if (isNaN(num)) {
    res.status(400).json({ error: "Valor inválido" });
    return;
  }

  const fromKey = from.toLowerCase().trim();
  const toKey   = to.toLowerCase().trim();

  if (VOLUME_ML[fromKey] !== undefined && VOLUME_ML[toKey] !== undefined) {
    const ml     = num * VOLUME_ML[fromKey];
    const result = Math.round((ml / VOLUME_ML[toKey]) * 100) / 100;
    res.json({ result, from, to, original: num });
    return;
  }

  if (WEIGHT_G[fromKey] !== undefined && WEIGHT_G[toKey] !== undefined) {
    const g      = num * WEIGHT_G[fromKey];
    const result = Math.round((g / WEIGHT_G[toKey]) * 100) / 100;
    res.json({ result, from, to, original: num });
    return;
  }

  res.status(400).json({ error: "Unidades incompatíveis ou não suportadas" });
}
