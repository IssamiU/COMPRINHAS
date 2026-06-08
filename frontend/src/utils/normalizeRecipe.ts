import { Recipe, RecipeCategory } from "../types/recipe";

const validCategories: RecipeCategory[] = [
  "Café da manhã",
  "Almoço",
  "Jantar",
  "Lanche",
  "Sobremesa",
  "Outro",
];

function normalizeCategory(category: string): RecipeCategory {
  if (validCategories.includes(category as RecipeCategory)) {
    return category as RecipeCategory;
  }
  return "Outro";
}

export function normalizeRecipe(data: any): Recipe {
  const recipeId = data.id || data._id || "";

  return {
    id: String(recipeId),
    title: data.title ?? "",
    category: normalizeCategory(data.category ?? "Outro"),
    prepTimeMinutes: data.prepTimeMinutes ?? 0,
    servings: data.servings ?? 1,
    imageUrl: data.imageUrl ?? "",
    isFavorite: data.isFavorite ?? false,
    isPublic: data.isPublic ?? false,
    authorName: data.authorName ?? "",
    userId: data.userId ? String(data.userId) : "",
    ingredients: (data.ingredients ?? []).map((item: any, index: number) => ({
      id: item.id ?? `${recipeId}-ingredient-${index}`,
      name: item.name ?? "",
      quantity: item.quantity ?? 0,
      unit: item.unit ?? "",
    })),
    steps: (data.steps ?? []).map((step: any, index: number) => ({
      id: step.id ?? `${recipeId}-step-${index}`,
      description: step.description ?? "",
      hasTimer: step.hasTimer ?? false, 
      duration: step.duration ?? null,
    })),
  };
}