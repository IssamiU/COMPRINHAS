import { Router } from "express";
import {
  createRecipe,
  deleteRecipe,
  duplicateRecipe,
  getCommunityRecipes,
  getRecipeById,
  getRecipes,
  suggestRecipes,
  toggleFavorite,
  updateRecipe,
} from "../controllers/recipeController";
import { authMiddleware } from "../middlewares/authMiddleware";

const router = Router();

router.use(authMiddleware);

router.post("/", createRecipe);
router.get("/", getRecipes);

// RF16 — deve ficar ANTES de /:id para não ser capturado como parâmetro
router.get("/suggest", suggestRecipes);

// RF21 — receitas públicas da comunidade (antes de /:id)
router.get("/community", getCommunityRecipes);

router.get("/:id", getRecipeById);
router.put("/:id", updateRecipe);
router.patch("/:id/favorite", toggleFavorite);
router.delete("/:id", deleteRecipe);
router.post("/:id/duplicate", duplicateRecipe);

export default router;