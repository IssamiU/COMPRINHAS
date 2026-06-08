import { Request, Response } from "express";
import mongoose from "mongoose";
import { Recipe } from "../models/Recipe";
import { pool } from "../config/database";

function formatRecipe(recipe: any) {
  const obj = recipe.toObject ? recipe.toObject() : recipe;
  return { ...obj, id: String(obj._id) };
}

// Formata receita computando isFavorite do ponto de vista do usuário solicitante
function formatRecipeForUser(recipe: any, userId: string) {
  const obj = recipe.toObject ? recipe.toObject() : recipe;
  const isOwner = String(obj.userId) === String(userId);
  const isFavorite = isOwner
    ? Boolean(obj.isFavorite)
    : (obj.savedBy ?? []).includes(userId);
  return { ...obj, id: String(obj._id), isFavorite };
}

function getParamId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value) && typeof value[0] === "string") return value[0];
  return null;
}

function getUserId(req: Request): string {
  return (req as any).userId;
}

export async function createRecipe(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    // RF21 — buscar nome do autor no PostgreSQL para exibição na comunidade
    let authorName = req.body.authorName || "";
    if (!authorName) {
      try {
        const result = await pool.query("SELECT name FROM users WHERE id = $1", [userId]);
        authorName = result.rows[0]?.name || "Usuário";
      } catch {}
    }
    const recipe = new Recipe({ ...req.body, userId, authorName });
    await recipe.save();
    return res.status(201).json(formatRecipe(recipe));
  } catch (error) {
    console.error("Erro ao criar receita:", error);
    return res.status(500).json({ message: "Erro ao criar receita" });
  }
}

export async function getRecipes(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const recipes = await Recipe.find({ userId }).sort({ createdAt: -1 });
    return res.json(recipes.map(formatRecipe));
  } catch (error) {
    console.error("Erro ao buscar receitas:", error);
    return res.status(500).json({ message: "Erro ao buscar receitas" });
  }
}

// RF16 — Sugestão de receitas por ingredientes disponíveis
// Query: GET /recipes/suggest?ingredients=ovo,farinha,leite
export async function suggestRecipes(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const raw = req.query.ingredients;

    if (!raw || typeof raw !== "string" || !raw.trim()) {
      return res.status(400).json({ message: "Informe ao menos um ingrediente." });
    }

    // Normaliza: minúsculo, sem espaços extras, remove vazios
    const inputIngredients = raw
      .split(",")
      .map((i) => i.trim().toLowerCase())
      .filter(Boolean);

    if (inputIngredients.length === 0) {
      return res.status(400).json({ message: "Informe ao menos um ingrediente." });
    }

    // scope: "mine" (padrão) | "community" | "all"
    const scope = req.query.scope as string | undefined;
    let baseQuery: any;
    if (scope === "community") {
      baseQuery = { isPublic: true };
    } else if (scope === "all") {
      baseQuery = { $or: [{ userId }, { isPublic: true }] };
    } else {
      baseQuery = { userId };
    }

    const recipes = await Recipe.find(baseQuery).lean();

    // Para cada receita calcula quantos ingredientes batem com os informados
    const scored = recipes
      .map((recipe: any) => {
        const recipeIngredientNames = (recipe.ingredients ?? []).map(
          (i: any) => (i.name ?? "").trim().toLowerCase()
        );

        const matchCount = inputIngredients.filter((ing) =>
          recipeIngredientNames.some(
            (name: string) => name.includes(ing) || ing.includes(name)
          )
        ).length;

        return { recipe, matchCount };
      })
      .filter(({ matchCount }) => matchCount > 0) // só receitas com ao menos 1 match
      .sort((a, b) => b.matchCount - a.matchCount); // mais matches primeiro

    const result = scored.map(({ recipe, matchCount }) => ({
      ...formatRecipe(recipe),
      matchCount,
      totalIngredients: (recipe.ingredients ?? []).length,
    }));

    return res.json(result);
  } catch (error) {
    console.error("Erro ao sugerir receitas:", error);
    return res.status(500).json({ message: "Erro ao sugerir receitas" });
  }
}

export async function getRecipeById(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const id = getParamId(req.params.id);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de receita inválido" });
    }
        // RF21 — permite visualizar receita própria OU pública de outro usuário
    const recipe = await Recipe.findOne({
      _id: id,
      $or: [{ userId }, { isPublic: true }],
    });
    if (!recipe) return res.status(404).json({ message: "Receita não encontrada" });
    return res.json(formatRecipeForUser(recipe, userId));
  } catch (error) {
    console.error("Erro ao buscar receita por ID:", error);
    return res.status(500).json({ message: "Erro ao buscar receita" });
  }
}

// RF21 — lista todas as receitas públicas da comunidade
export async function getCommunityRecipes(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const recipes = await Recipe.find({ isPublic: true }).sort({ createdAt: -1 });
    return res.json(recipes.map((r) => formatRecipeForUser(r, userId)));
  } catch (error) {
    console.error("Erro ao buscar receitas da comunidade:", error);
    return res.status(500).json({ message: "Erro ao buscar receitas da comunidade" });
  }
}

export async function updateRecipe(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const id = getParamId(req.params.id);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de receita inválido" });
    }
    const recipe = await Recipe.findOneAndUpdate(
      { _id: id, userId },
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!recipe) return res.status(404).json({ message: "Receita não encontrada" });
    return res.json(formatRecipe(recipe));
  } catch (error) {
    console.error("Erro ao atualizar receita:", error);
    return res.status(500).json({ message: "Erro ao atualizar receita" });
  }
}

export async function toggleFavorite(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const id = getParamId(req.params.id);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de receita inválido" });
    }
    // Permite favoritar receita própria OU pública de outro usuário
    const recipe = await Recipe.findOne({ _id: id, $or: [{ userId }, { isPublic: true }] });
    if (!recipe) return res.status(404).json({ message: "Receita não encontrada" });

    if (String(recipe.userId) === String(userId)) {
      // Dono: toggle campo isFavorite
      recipe.isFavorite = !recipe.isFavorite;
    } else {
      // Outro usuário em receita pública: toggle no array savedBy
      const idx = (recipe.savedBy ?? []).indexOf(userId);
      if (idx === -1) recipe.savedBy.push(userId);
      else recipe.savedBy.splice(idx, 1);
    }

    await recipe.save();
    return res.json(formatRecipeForUser(recipe, userId));
  } catch (error) {
    console.error("Erro ao atualizar favorito:", error);
    return res.status(500).json({ message: "Erro ao atualizar favorito" });
  }
}

export async function deleteRecipe(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const id = getParamId(req.params.id);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de receita inválido" });
    }
    const recipe = await Recipe.findOneAndDelete({ _id: id, userId });
    if (!recipe) return res.status(404).json({ message: "Receita não encontrada" });
    return res.json({ message: "Receita removida com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar receita:", error);
    return res.status(500).json({ message: "Erro ao deletar receita" });
  }
}

export async function duplicateRecipe(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const id = getParamId(req.params.id);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: "ID de receita inválido" });
    }

    // Permite duplicar receita própria OU pública de outro usuário
    const original = await Recipe.findOne({ _id: id, $or: [{ userId }, { isPublic: true }] });
    if (!original) return res.status(404).json({ message: "Receita não encontrada" });

    const originalObj = original.toObject();

    const duplicate = new Recipe({
      ...originalObj,
      _id: new mongoose.Types.ObjectId(),
      userId,
      title: `${originalObj.title} (cópia)`,
      isFavorite: false,
      isPublic: false,
      savedBy: [],
      createdAt: new Date(),
      ingredients: originalObj.ingredients.map((i: any) => ({
        ...i,
        _id: new mongoose.Types.ObjectId(),
      })),
      steps: originalObj.steps.map((s: any) => ({
        ...s,
        _id: new mongoose.Types.ObjectId(),
      })),
    });

    await duplicate.save();
    return res.status(201).json(formatRecipe(duplicate));
  } catch (error) {
    console.error("Erro ao duplicar receita:", error);
    return res.status(500).json({ message: "Erro ao duplicar receita" });
  }
}