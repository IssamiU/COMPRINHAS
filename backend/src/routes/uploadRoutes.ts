import { Router } from "express";
import multer from "multer";
import { uploadImage } from "../controllers/uploadController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

// Armazena em memória (buffer) — não salva em disco
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB máximo
  fileFilter: (_req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (allowed.includes(file.mimetype)) cb(null, true);
    else cb(new Error("Apenas imagens JPEG, PNG ou WebP são permitidas."));
  },
});

router.use(authMiddleware);
router.post("/image", upload.single("image"), uploadImage);

export default router;