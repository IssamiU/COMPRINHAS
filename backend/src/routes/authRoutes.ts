import { Router } from "express";
import {
  login,
  register,
  forgotPassword,
  resetPassword,
  getMe,
  updateMe,
} from "../controllers/authController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword); // RF29
router.post("/reset-password", resetPassword);   // RF29
router.get("/me", authMiddleware, getMe);
router.put("/me", authMiddleware, updateMe);

export default router;