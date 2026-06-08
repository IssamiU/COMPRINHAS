import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
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
import * as Location from "expo-location";

import { RootState } from "../../store";
import { setRecipes } from "../../store/slices/recipesSlice";
import { normalizeRecipe } from "../../utils/normalizeRecipe";
import { API_URL } from "../../services/api";
import { getAuth } from "../../storage/authStorage";
// RF23 — cores reativas ao tema claro/escuro
import { useTheme } from "../../theme/ThemeContext";

// RF28 — tipos e constantes de clima
type WeatherCondition = "quente" | "frio" | "chuvoso" | "normal";

interface WeatherData {
  temp: number;
  condition: WeatherCondition;
  description: string;
  icon: string;
  message: string;
  hint: string;
}

const WEATHER_STYLE: Record<WeatherCondition, { bg: string; iconName: React.ComponentProps<typeof Ionicons>["name"]; iconColor: string }> = {
  quente:  { bg: "#FEF9C3", iconName: "sunny",        iconColor: "#F59E0B" },
  frio:    { bg: "#DBEAFE", iconName: "snow",          iconColor: "#3B82F6" },
  chuvoso: { bg: "#EDE9FE", iconName: "rainy",         iconColor: "#7C3AED" },
  normal:  { bg: "#DCFCE7", iconName: "partly-sunny",  iconColor: "#16A34A" },
};

export default function DashboardScreen({ navigation }: any) {
  // RF23 — tema reativo
  const { colors } = useTheme();
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

  // RF28 — estado do clima
  const [weather, setWeather]         = useState<WeatherData | null>(null);
  const [weatherLoading, setWeatherLoading] = useState(false);

  useEffect(() => { loadWeather(); }, []);

  async function loadWeather() {
    try {
      setWeatherLoading(true);
      const { status } = await Location.getForegroundPermissionsAsync();
      if (status !== "granted") return;
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const auth = await getAuth();
      if (!auth) return;
      const res = await fetch(
        `${API_URL}/proxy/weather?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`,
        { headers: { Authorization: `Bearer ${auth.accessToken}` } }
      );
      if (!res.ok) return;
      const data = await res.json();
      if (data.condition) setWeather(data as WeatherData);
    } catch {
      // clima é opcional — não mostrar erro
    } finally {
      setWeatherLoading(false);
    }
  }

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

  const styles = useMemo(() => StyleSheet.create({
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
    recipeRowIcon: { width: 44, height: 44, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", marginRight: 12, overflow: "hidden" },
    recipeRowImage: { width: 44, height: 44 },
    recipeRowInfo: { flex: 1 },
    recipeRowTitle: { fontSize: 15, fontWeight: "600", color: colors.textPrimary, marginBottom: 2 },
    recipeRowMeta: { fontSize: 12, color: colors.textSecondary },
    // RF28 — card de clima
    weatherCard:    { flexDirection: "row", alignItems: "center", borderRadius: 16, padding: 14, marginBottom: 20, gap: 12 },
    weatherLeft:    { flexDirection: "row", alignItems: "center", gap: 10, flex: 0 },
    weatherTemp:    { fontSize: 22, fontWeight: "700" },
    weatherDesc:    { fontSize: 11, color: colors.textSecondary, textTransform: "capitalize", maxWidth: 80 },
    weatherRight:   { flex: 1 },
    weatherMessage: { fontSize: 13, fontWeight: "600", color: colors.textPrimary, marginBottom: 4 },
    weatherHint:    { fontSize: 12, fontWeight: "700" },
  }), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Olá, {firstName(user?.name)} 👋</Text>
            <Text style={styles.headerSub}>O que vamos cozinhar?</Text>
          </View>
        </View>

        {/* RF28 — Card de clima */}
        {weatherLoading && (
          <View style={[styles.weatherCard, { backgroundColor: colors.surface, justifyContent: "center", alignItems: "center" }]}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        )}
        {!weatherLoading && weather && (() => {
          const ws = WEATHER_STYLE[weather.condition];
          return (
            <Pressable
              style={[styles.weatherCard, { backgroundColor: ws.bg }]}
              onPress={() => navigation.navigate("RecipesTab", { screen: "RecipesList" })}
              accessibilityLabel="Sugestão de receita baseada no clima"
              accessibilityRole="button"
            >
              <View style={styles.weatherLeft}>
                <Ionicons name={ws.iconName} size={36} color={ws.iconColor} />
                <View>
                  <Text style={[styles.weatherTemp, { color: ws.iconColor }]}>{weather.temp}°C</Text>
                  <Text style={styles.weatherDesc} numberOfLines={1}>{weather.description}</Text>
                </View>
              </View>
              <View style={styles.weatherRight}>
                <Text style={styles.weatherMessage}>{weather.message}</Text>
                <Text style={[styles.weatherHint, { color: ws.iconColor }]}>{weather.hint} →</Text>
              </View>
            </Pressable>
          );
        })()}

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
              <View style={styles.recipeRowIcon}>
                {recipe.imageUrl ? (
                  <Image source={{ uri: recipe.imageUrl }} style={styles.recipeRowImage} resizeMode="cover" />
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
