import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import { RootState } from "../../store";
import { setRecipes, updateRecipe } from "../../store/slices/recipesSlice";
import { normalizeRecipe } from "../../utils/normalizeRecipe";
import { API_URL } from "../../services/api";
import { getAuth } from "../../storage/authStorage";
import { colors } from "../../theme/colors";

const CATEGORIES = ["Todas", "Favoritas", "Café da manhã", "Almoço", "Lanche", "Jantar", "Sobremesa", "Outro"];

export default function RecipesListScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const recipes  = useSelector((state: RootState) => state.recipes.recipes);

  const [search,           setSearch]           = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");

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
      console.log("Erro ao carregar receitas:", error);
      Alert.alert("Erro", "Erro ao carregar receitas");
    }
  }, [dispatch]);

  useFocusEffect(useCallback(() => { loadRecipes(); }, [loadRecipes]));

  const filtered = useMemo(() => {
    return recipes.filter((r) => {
      const matchSearch   = r.title.toLowerCase().includes(search.toLowerCase());
      const matchCategory =
        selectedCategory === "Todas" ||
        (selectedCategory === "Favoritas" && r.isFavorite) ||
        r.category === selectedCategory;
      return matchSearch && matchCategory;
    });
  }, [recipes, search, selectedCategory]);

  async function toggleFavorite(id: string) {
    try {
      const auth = await getAuth();
      if (!auth) return;
      const response = await fetch(`${API_URL}/recipes/${id}/favorite`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erro ao atualizar favorito");
      dispatch(updateRecipe(normalizeRecipe(data)));
    } catch {
      Alert.alert("Erro", "Erro ao atualizar favorito");
    }
  }

  function handleDelete(id: string) {
    Alert.alert("Excluir receita", "Deseja excluir esta receita?", [
      { text: "Cancelar", style: "cancel" },
      {
        text: "Excluir",
        style: "destructive",
        onPress: async () => {
          try {
            const auth = await getAuth();
            if (!auth) return;
            const response = await fetch(`${API_URL}/recipes/${id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${auth.accessToken}` },
            });
            if (!response.ok) throw new Error("Erro ao excluir");
            await loadRecipes();
          } catch {
            Alert.alert("Erro", "Erro ao excluir receita");
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Receitas</Text>
        <Pressable style={styles.addButton} onPress={() => navigation.navigate("CreateRecipe")}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {/* Busca */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar por nome..."
          placeholderTextColor={colors.textMuted}
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
        />
        {search.length > 0 && (
          <Pressable onPress={() => setSearch("")} hitSlop={8}>
            <Ionicons name="close-circle" size={18} color={colors.textMuted} />
          </Pressable>
        )}
      </View>

      {/* Filtros */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filtersContent}
        style={styles.filtersScroll}
      >
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[styles.chip, selectedCategory === cat && styles.chipActive]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Contador */}
      <Text style={styles.counter}>
        {filtered.length} receita{filtered.length !== 1 ? "s" : ""} encontrada{filtered.length !== 1 ? "s" : ""}
      </Text>

      {/* Lista */}
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrapper}>
            <Ionicons name="restaurant-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>
              {selectedCategory === "Favoritas" ? "Nenhuma receita favorita" : "Nenhuma receita encontrada"}
            </Text>
            <Text style={styles.emptyText}>
              {recipes.length === 0
                ? "Crie sua primeira receita tocando no +"
                : selectedCategory === "Favoritas"
                ? "Favorite uma receita para vê-la aqui"
                : "Tente outro filtro ou busca"}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate("RecipeDetails", { recipeId: item.id })}
          >
            {/* Imagem real ou placeholder */}
            <View style={styles.cardImage}>
              {item.imageUrl ? (
                <Image
                  source={{ uri: item.imageUrl }}
                  style={styles.cardImageReal}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="restaurant" size={28} color={colors.primary} />
              )}
            </View>

            <View style={styles.cardContent}>
              <View style={styles.cardTop}>
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                <Pressable onPress={() => toggleFavorite(item.id)} hitSlop={8}>
                  <Ionicons
                    name={item.isFavorite ? "heart" : "heart-outline"}
                    size={20}
                    color={item.isFavorite ? colors.danger : colors.textMuted}
                  />
                </Pressable>
              </View>

              <View style={styles.badge}>
                <Text style={styles.badgeText}>{item.category}</Text>
              </View>

              <View style={styles.cardMeta}>
                <Ionicons name="time-outline" size={13} color={colors.textMuted} />
                <Text style={styles.cardMetaText}>{item.prepTimeMinutes} min</Text>
                <Text style={styles.dot}>·</Text>
                <Ionicons name="people-outline" size={13} color={colors.textMuted} />
                <Text style={styles.cardMetaText}>{item.servings} porções</Text>
              </View>

              <View style={styles.cardFooter}>
                <Pressable style={styles.deleteBtn} onPress={() => handleDelete(item.id)}>
                  <Ionicons name="trash-outline" size={13} color={colors.danger} />
                  <Text style={styles.deleteBtnText}>Excluir</Text>
                </Pressable>
              </View>
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12 },
  headerTitle: { fontSize: 28, fontWeight: "700", color: colors.textPrimary },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  searchContainer: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surface, borderRadius: 14, marginHorizontal: 20, marginBottom: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: 15, color: colors.textPrimary, padding: 0 },
  filtersScroll: { flexGrow: 0, marginBottom: 8 },
  filtersContent: { paddingHorizontal: 20, paddingVertical: 4, gap: 8, flexDirection: "row", alignItems: "center" },
  chip: { paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignSelf: "flex-start" },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  chipTextActive: { color: "#fff" },
  counter: { fontSize: 13, color: colors.textMuted, paddingHorizontal: 20, marginBottom: 8 },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  card: {
  flexDirection: "row",
  backgroundColor: colors.surface,
  borderRadius: 16,
  marginBottom: 12,
  overflow: "hidden",
  borderWidth: 1,
  borderColor: colors.border,
  minHeight: 110,
},

  // Imagem do card — largura fixa, altura 100% automática
  cardImage: {
  width: 90,
  height: 120,
  backgroundColor: colors.primaryLight,
  alignItems: "center",
  justifyContent: "center",
},
  cardImageReal: {
  width: 90,
  height: 120,
},

  cardContent: { flex: 1, padding: 12 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 },
  cardTitle: { flex: 1, fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginRight: 8 },
  badge: { alignSelf: "flex-start", backgroundColor: colors.primaryLight, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8, marginBottom: 6 },
  badgeText: { fontSize: 11, fontWeight: "700", color: colors.primaryDark },
  cardMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 8 },
  cardMetaText: { fontSize: 12, color: colors.textMuted },
  dot: { fontSize: 12, color: colors.textMuted },
  cardFooter: { flexDirection: "row", justifyContent: "flex-end" },
  deleteBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 4, paddingHorizontal: 8, borderRadius: 8, backgroundColor: "#FEE2E2" },
  deleteBtnText: { fontSize: 12, color: colors.danger, fontWeight: "600" },
  emptyWrapper: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle: { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: "center", paddingHorizontal: 20 },
});