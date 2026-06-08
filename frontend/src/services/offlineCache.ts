// RNF3 + RNF6 — Cache offline via AsyncStorage para receitas e lista de compras
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { Recipe } from "../types/recipe";
import type { ShoppingListItem } from "../types/shopping";

const KEYS = {
  RECIPES: "@mealsync:cachedRecipes",
  SHOPPING: "@mealsync:cachedShoppingList",
};

export async function cacheRecipes(recipes: Recipe[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.RECIPES, JSON.stringify(recipes));
  } catch {}
}

export async function getCachedRecipes(): Promise<Recipe[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.RECIPES);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export async function cacheShoppingList(items: ShoppingListItem[]): Promise<void> {
  try {
    await AsyncStorage.setItem(KEYS.SHOPPING, JSON.stringify(items));
  } catch {}
}

export async function getCachedShoppingList(): Promise<ShoppingListItem[]> {
  try {
    const data = await AsyncStorage.getItem(KEYS.SHOPPING);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}
