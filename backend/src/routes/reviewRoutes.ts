import { Router } from "express";
import { createReview, getReviews } from "../controllers/reviewController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

router.use(authMiddleware);

// RF21 — GET /reviews?recipeId= e POST /reviews
router.get("/", getReviews);
router.post("/", createReview);

export default router;
