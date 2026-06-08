// RNF9 — testes unitários para generateShoppingListFromPlanner
import { generateShoppingListFromPlanner } from "../generateShoppingList";
import type { Recipe } from "../../types/recipe";
import type { PlannedMeal } from "../../types/planner";

const mockRecipe: Recipe = {
  id: "r1",
  title: "Omelete",
  servings: 2,
  prepTimeMinutes: 10,
  ingredients: [
    { name: "Ovo", quantity: 2, unit: "unidade" },
    { name: "Sal", quantity: 1, unit: "pitada" },
  ],
  steps: [],
  category: "Café da manhã",
  isFavorite: false,
};

const mockMeal: PlannedMeal = {
  id: "m1",
  recipeId: "r1",
  day: "Segunda",
  mealType: "Café da manhã",
  reminderTime: null,
};

describe("generateShoppingListFromPlanner", () => {
  it("gera lista vazia quando não há refeições planejadas", () => {
    const result = generateShoppingListFromPlanner([], [mockRecipe]);
    expect(result).toHaveLength(0);
  });

  it("gera lista vazia quando receita não é encontrada", () => {
    const result = generateShoppingListFromPlanner([mockMeal], []);
    expect(result).toHaveLength(0);
  });

  it("gera itens corretos a partir de uma refeição planejada", () => {
    const result = generateShoppingListFromPlanner([mockMeal], [mockRecipe]);
    expect(result).toHaveLength(2);
    expect(result.find((i) => i.name === "Ovo")).toBeDefined();
    expect(result.find((i) => i.name === "Sal")).toBeDefined();
  });

  it("agrega ingredientes repetidos de refeições diferentes", () => {
    const meal2: PlannedMeal = { ...mockMeal, id: "m2", day: "Terça" };
    const result = generateShoppingListFromPlanner([mockMeal, meal2], [mockRecipe]);
    const ovo = result.find((i) => i.name === "Ovo");
    expect(ovo?.quantity).toBe(4); // 2 refeições × 2 ovos
  });

  it("itens são retornados ordenados alfabeticamente", () => {
    const result = generateShoppingListFromPlanner([mockMeal], [mockRecipe]);
    const names = result.map((i) => i.name);
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b, "pt-BR")));
  });

  it("novos itens têm checked = false por padrão", () => {
    const result = generateShoppingListFromPlanner([mockMeal], [mockRecipe]);
    expect(result.every((i) => i.checked === false)).toBe(true);
  });
});
