// RNF9 — testes unitários para scaleIngredient
import { scaleIngredient } from "../scaleIngredient";

describe("scaleIngredient", () => {
  it("escala proporcionalmente para mais porções", () => {
    expect(scaleIngredient(2, 4, 8)).toBe(4);
  });

  it("escala proporcionalmente para menos porções", () => {
    expect(scaleIngredient(3, 6, 2)).toBe(1);
  });

  it("mantém a quantidade quando baseServings === targetServings", () => {
    expect(scaleIngredient(5, 4, 4)).toBe(5);
  });

  it("retorna a quantidade original quando baseServings é 0", () => {
    expect(scaleIngredient(2, 0, 4)).toBe(2);
  });

  it("arredonda em 2 casas decimais", () => {
    expect(scaleIngredient(1, 3, 2)).toBe(0.67);
  });

  it("funciona com targetServings = 1", () => {
    expect(scaleIngredient(4, 4, 1)).toBe(1);
  });

  it("retorna 0 quando quantity é 0", () => {
    expect(scaleIngredient(0, 4, 8)).toBe(0);
  });
});
