import { Router } from "express";
import { barcodeProxy, convertProxy, supermarketsProxy, weatherProxy } from "../controllers/proxyController";

const router = Router();

// RF11 — GET /proxy/barcode/:code → consulta Open Food Facts
router.get("/barcode/:code", barcodeProxy);

// RF18 — GET /proxy/convert?value=&from=&to= → conversão de unidades culinárias
router.get("/convert", convertProxy);

// RF19 — GET /proxy/supermarkets?lat=&lng= → supermercados próximos via Overpass API
router.get("/supermarkets", supermarketsProxy);

// RF28 — GET /proxy/weather?lat=&lng= → clima atual via OpenWeatherMap
router.get("/weather", weatherProxy);

export default router;
