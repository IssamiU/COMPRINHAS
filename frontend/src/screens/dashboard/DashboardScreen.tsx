import React, { useCallback } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { useFocusEffect } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";

import { RootState } from "../../store";
import { setRecipes } from "../../store/slices/recipesSlice";
import { normalizeRecipe } from "../../utils/normalizeRecipe";
import { API_URL } from "../../services/api";
import { getAuth } from "../../storage/authStorage";
import { colors } from "../../theme/colors";

export default function DashboardScreen({ navigation }: any) {
  const dispatch = useDispatch();

  const user          = useSelector((s: RootState) => s.auth.user);
  const recipes       = useSelector((s: RootState) => s.recipes.recipes);
  const plannedMeals  = useSelector((s: RootState) => s.planner.plannedMeals);
  const userId        = String(user?.id ?? "");
  const shoppingLists = useSelector((s: RootState) => s.shoppingList.listsByUser[userId] ?? []);

  const recipesCount       = recipes.length;
  const favoritesCount     = recipes.filter((r) => r.isFavorite).length;
  const plannedMealsCount  = plannedMeals.length;
  const shoppingItemsCount = shoppingLists.reduce(
    (acc, list) => acc + list.items.filter((i) => !i.checked).length, 0
  );

  const loadRecipes = useCallback(async () => {
    try {
      const auth = await getAuth();
      if (!auth) return;
      const response = await fetch(`${API_URL}/recipes`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erro ao carregar receitas");
      dispatch(setRecipes(data.map(normalizeRecipe)));
    } catch (error) {
      console.log("Erro ao carregar receitas no dashboard:", error);
    }
  }, [dispatch]);

  useFocusEffect(useCallback(() => { loadRecipes(); }, [loadRecipes]));

  function firstName(name?: string | null) {
    return name?.split(" ")[0] ?? "usuário";
  }

  const quickActions = [
    { icon: "add-circle-outline" as const, label: "Nova receita", color: colors.primary, bg: colors.primaryLight, onPress: () => navigation.navigate("RecipesTab", { screen: "CreateRecipe" }) },
    { icon: "search-outline"     as const, label: "O que tenho?", color: "#3B82F6",       bg: "#DBEAFE",           onPress: () => navigation.navigate("RecipesTab", { screen: "SuggestByIngredients" }) },
    { icon: "time-outline"       as const, label: "Histórico",    color: "#F59E0B",       bg: "#FEF3C7",           onPress: () => navigation.navigate("RecipesTab", { screen: "History" }) },
    { icon: "cart-outline"       as const, label: "Compras",      color: "#8B5CF6",       bg: "#EDE9FE",           onPress: () => navigation.navigate("ShoppingTab") },
  ];

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá, {firstName(user?.name)} 👋</Text>
            <Text style={styles.headerSub}>O que vamos cozinhar?</Text>
          </View>
        </View>

        {/* Métricas */}
        <View style={styles.metricsGrid}>
          <View style={[styles.metricCard, { backgroundColor: "#DCFCE7" }]}>
            <Text style={[styles.metricNumber, { color: colors.primaryDark }]}>{recipesCount}</Text>
            <Text style={styles.metricLabel}>Receitas</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: "#FEF3C7" }]}>
            <Text style={[styles.metricNumber, { color: "#B45309" }]}>{favoritesCount}</Text>
            <Text style={styles.metricLabel}>Favoritas</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: "#DBEAFE" }]}>
            <Text style={[styles.metricNumber, { color: "#1D4ED8" }]}>{plannedMealsCount}</Text>
            <Text style={styles.metricLabel}>Planejadas</Text>
          </View>
          <View style={[styles.metricCard, { backgroundColor: "#EDE9FE" }]}>
            <Text style={[styles.metricNumber, { color: "#6D28D9" }]}>{shoppingItemsCount}</Text>
            <Text style={styles.metricLabel}>A comprar</Text>
          </View>
        </View>

        {/* Acesso rápido */}
        <Text style={styles.sectionTitle}>Acesso Rápido</Text>
        <View style={styles.quickGrid}>
          {quickActions.map((action) => (
            <Pressable key={action.label} style={[styles.quickCard, { backgroundColor: action.bg }]} onPress={action.onPress}>
              <Ionicons name={action.icon} size={28} color={action.color} />
              <Text style={[styles.quickLabel, { color: action.color }]}>{action.label}</Text>
            </Pressable>
          ))}
        </View>

        {/* Plano Semanal */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Plano Semanal</Text>
          <Pressable onPress={() => navigation.navigate("PlannerTab")}>
            <Text style={styles.seeAll}>Ver tudo →</Text>
          </Pressable>
        </View>

        {plannedMeals.length === 0 ? (
          <Pressable style={styles.emptyPlanCard} onPress={() => navigation.navigate("PlannerTab")}>
            <Ionicons name="calendar-outline" size={32} color={colors.primary} />
            <Text style={styles.emptyPlanTitle}>Nenhuma refeição planejada</Text>
            <Text style={styles.emptyPlanSub}>Toque para organizar sua semana</Text>
          </Pressable>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.planRow}>
            {plannedMeals.slice(0, 7).map((meal) => (
              <View key={meal.id} style={styles.planChip}>
                <Text style={styles.planChipDay}>{meal.day.slice(0, 3)}</Text>
                <Text style={styles.planChipType} numberOfLines={1}>{meal.mealType}</Text>
              </View>
            ))}
          </ScrollView>
        )}

        {/* Receitas Recentes */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Receitas Recentes</Text>
          <Pressable onPress={() => navigation.navigate("RecipesTab")}>
            <Text style={styles.seeAll}>Ver mais →</Text>
          </Pressable>
        </View>

        {recipes.length === 0 ? (
          <Pressable
            style={styles.emptyRecipeCard}
            onPress={() => navigation.navigate("RecipesTab", { screen: "CreateRecipe" })}
          >
            <Ionicons name="restaurant-outline" size={32} color={colors.primary} />
            <Text style={styles.emptyPlanTitle}>Nenhuma receita ainda</Text>
            <Text style={styles.emptyPlanSub}>Toque para criar sua primeira receita</Text>
          </Pressable>
        ) : (
          recipes.slice(0, 3).map((recipe) => (
            <Pressable
              key={recipe.id}
              style={styles.recipeRow}
              onPress={() => navigation.navigate("RecipesTab", { screen: "RecipeDetails", params: { recipeId: recipe.id } })}
            >
              {/* Ícone ou imagem real */}
              <View style={styles.recipeRowIcon}>
                {recipe.imageUrl ? (
                  <Image
                    source={{ uri: recipe.imageUrl }}
                    style={styles.recipeRowImage}
                    resizeMode="cover"
                  />
                ) : (
                  <Ionicons name="restaurant" size={20} color={colors.primary} />
                )}
              </View>

              <View style={styles.recipeRowInfo}>
                <Text style={styles.recipeRowTitle} numberOfLines={1}>{recipe.title}</Text>
                <Text style={styles.recipeRowMeta}>{recipe.prepTimeMinutes} min · {recipe.category}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { paddingHorizontal: 20, paddingBottom: 32 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingTop: 16, marginBottom: 24 },
  greeting: { fontSize: 14, color: colors.textSecondary, marginBottom: 2 },
  headerSub: { fontSize: 24, fontWeight: "700", color: colors.textPrimary },
  metricsGrid: { flexDirection: "row", gap: 10, marginBottom: 28 },
  metricCard: { flex: 1, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 10, alignItems: "center" },
  metricNumber: { fontSize: 22, fontWeight: "700", marginBottom: 2 },
  metricLabel: { fontSize: 11, color: colors.textSecondary, fontWeight: "600" },
  sectionTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary, marginBottom: 12 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12, marginTop: 8 },
  seeAll: { fontSize: 13, color: colors.primary, fontWeight: "600" },
  quickGrid: { flexDirection: "row", flexWrap: "wrap", gap: 12, marginBottom: 28 },
  quickCard: { width: "47%", borderRadius: 16, padding: 16, alignItems: "center", gap: 8 },
  quickLabel: { fontSize: 13, fontWeight: "700" },
  planRow: { marginBottom: 28 },
  planChip: { backgroundColor: colors.primaryLight, borderRadius: 14, paddingVertical: 10, paddingHorizontal: 14, marginRight: 10, alignItems: "center", minWidth: 72 },
  planChipDay: { fontSize: 12, fontWeight: "700", color: colors.primaryDark, marginBottom: 2 },
  planChipType: { fontSize: 11, color: colors.primaryDark, maxWidth: 64, textAlign: "center" },
  emptyPlanCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, borderStyle: "dashed", padding: 24, alignItems: "center", marginBottom: 28, gap: 8 },
  emptyRecipeCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, borderStyle: "dashed", padding: 24, alignItems: "center", gap: 8 },
  emptyPlanTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
  emptyPlanSub: { fontSize: 13, color: colors.textSecondary },
  recipeRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 14, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.border },
  recipeRowIcon: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: colors.primaryLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    overflow: "hidden",
  },
  // Imagem ocupa todo o ícone quando disponível
  recipeRowImage: { width: 44, height: 44 },
  recipeRowInfo: { flex: 1 },
  recipeRowTitle: { fontSize: 15, fontWeight: "600", color: colors.textPrimary, marginBottom: 2 },
  recipeRowMeta: { fontSize: 12, color: colors.textSecondary },
});