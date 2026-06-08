export type RecipeIngredient = {
  id: string;
  name: string;
  quantity: number;
  unit: string;
};

export type RecipeStep = {
  id: string;
  description: string;
  hasTimer: boolean; 
  duration?: number | null;
};

export type RecipeCategory =
  | "Café da manhã"
  | "Almoço"
  | "Jantar"
  | "Lanche"
  | "Sobremesa"
  | "Outro";

export type Recipe = {
  id: string;
  title: string;
  ingredients: RecipeIngredient[];
  steps: RecipeStep[];
  prepTimeMinutes: number;
  servings: number;
  category: RecipeCategory;
  imageUrl?: string;
  isFavorite: boolean;
  isPublic?: boolean;
  authorName?: string;
  userId?: string;
};