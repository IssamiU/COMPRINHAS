import { Router } from "express";
import { barcodeProxy } from "../controllers/proxyController";

const router = Router();

// RF11 — GET /proxy/barcode/:code → consulta Open Food Facts
router.get("/barcode/:code", barcodeProxy);

export default router;
