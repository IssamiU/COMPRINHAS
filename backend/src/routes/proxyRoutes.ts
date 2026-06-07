import { Router } from "express";
import { barcodeProxy, convertProxy } from "../controllers/proxyController";

const router = Router();

// RF11 — GET /proxy/barcode/:code → consulta Open Food Facts
router.get("/barcode/:code", barcodeProxy);

// RF18 — GET /proxy/convert?value=&from=&to= → conversão de unidades culinárias
router.get("/convert", convertProxy);

export default router;
