import mongoose, { Schema, Document } from "mongoose";

interface Ingredient {
  id: string;
  name: string;
  quantity: number;
  unit: string;
}

interface Step {
  id: string;
  description: string;
  hasTimer: boolean;  // true = passo tem timer
  duration?: number;  // minutos — só relevante se hasTimer = true
}

export interface IRecipe extends Document {
  title: string;
  category: string;
  prepTimeMinutes: number;
  servings: number;
  ingredients: Ingredient[];
  steps: Step[];
  imageUrl?: string;
  isFavorite: boolean;
  isPublic: boolean;
  authorName: string;
  userId: string;
  savedBy: string[];
  createdAt: Date;
}

const IngredientSchema = new Schema<Ingredient>({
  id: String,
  name: String,
  quantity: Number,
  unit: String,
});

const StepSchema = new Schema<Step>({
  id: String,
  description: String,
  hasTimer: { type: Boolean, default: false }, 
  duration: { type: Number, default: null }, 
});

const RecipeSchema = new Schema<IRecipe>({
  title: { type: String, required: true },
  category: { type: String, required: true },
  prepTimeMinutes: { type: Number, required: true },
  servings: { type: Number, required: true },
  ingredients: [IngredientSchema],
  steps: [StepSchema],
  imageUrl: { type: String, default: "" },
  isFavorite: { type: Boolean, default: false },
  isPublic: { type: Boolean, default: false },
  authorName: { type: String, default: "" },
  userId: { type: String, required: true },
  savedBy: { type: [String], default: [] },
  createdAt: { type: Date, default: Date.now },
});

export const Recipe = mongoose.model<IRecipe>("Recipe", RecipeSchema);