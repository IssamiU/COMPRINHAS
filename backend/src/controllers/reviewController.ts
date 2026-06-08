// RF21 — Avaliações de receitas (PostgreSQL)
import { Request, Response } from "express";
import { pool } from "../config/database";

function getUserId(req: Request): string {
  return (req as any).userId;
}

// RF21 — POST /reviews
export async function createReview(req: Request, res: Response) {
  try {
    const userId = getUserId(req);
    const { recipeId, rating, comment, authorName } = req.body;

    if (!recipeId || !rating || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "recipeId e rating (1–5) são obrigatórios" });
    }

    const result = await pool.query(
      `INSERT INTO recipe_reviews (recipe_id, user_id, author_name, rating, comment)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (recipe_id, user_id)
       DO UPDATE SET rating = $4, comment = $5, author_name = $3, created_at = NOW()
       RETURNING *`,
      [recipeId, userId, authorName || "Usuário", Number(rating), comment || ""]
    );

    return res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Erro ao criar avaliação:", error);
    return res.status(500).json({ message: "Erro ao criar avaliação" });
  }
}

// RF21 — GET /reviews?recipeId=
export async function getReviews(req: Request, res: Response) {
  try {
    const { recipeId } = req.query;
    if (!recipeId || typeof recipeId !== "string") {
      return res.status(400).json({ message: "recipeId é obrigatório" });
    }

    const result = await pool.query(
      `SELECT id, recipe_id, user_id, author_name, rating, comment, created_at
       FROM recipe_reviews WHERE recipe_id = $1 ORDER BY created_at DESC`,
      [recipeId]
    );

    const reviews = result.rows;
    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum: number, r: any) => sum + Number(r.rating), 0) / reviews.length
        : 0;

    return res.json({
      reviews,
      avgRating: Math.round(avgRating * 10) / 10,
      count: reviews.length,
    });
  } catch (error) {
    console.error("Erro ao buscar avaliações:", error);
    return res.status(500).json({ message: "Erro ao buscar avaliações" });
  }
}
