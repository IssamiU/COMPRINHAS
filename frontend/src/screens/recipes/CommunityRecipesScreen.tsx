// RF21 — Tela de receitas públicas da comunidade com filtros e paginação
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
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
import { Ionicons } from "@expo/vector-icons";

import { API_URL } from "../../services/api";
import { getAuth } from "../../storage/authStorage";
import { normalizeRecipe } from "../../utils/normalizeRecipe";
import { colors } from "../../theme/colors";

const CATEGORIES = ["Todas", "Café da manhã", "Almoço", "Lanche", "Jantar", "Sobremesa", "Outro"];

export default function CommunityRecipesScreen({ navigation }: any) {
  const [recipes, setRecipes]           = useState<any[]>([]);
  const [loading, setLoading]           = useState(true);
  const [loadingMore, setLoadingMore]   = useState(false);
  const [search, setSearch]             = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todas");
  const [favoritesOnly, setFavoritesOnly]       = useState(false);
  const [page, setPage]     = useState(1);
  const [hasMore, setHasMore] = useState(false);

  async function fetchPage(pg: number, append: boolean, cat: string, fav: boolean) {
    try {
      if (pg === 1) setLoading(true); else setLoadingMore(true);
      const auth = await getAuth();
      if (!auth) return;

      const params = new URLSearchParams({ page: String(pg) });
      if (cat !== "Todas") params.set("category", cat);
      if (fav) params.set("favoritesOnly", "true");

      const res = await fetch(`${API_URL}/recipes/community?${params}`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        const normalized = (data.recipes ?? []).map(normalizeRecipe);
        setRecipes(append ? (prev) => [...prev, ...normalized] : normalized);
        setHasMore(data.hasMore ?? false);
        setPage(pg);
      }
    } catch {}
    finally { setLoading(false); setLoadingMore(false); }
  }

  useFocusEffect(
    useCallback(() => {
      fetchPage(1, false, selectedCategory, favoritesOnly);
    }, [selectedCategory, favoritesOnly])
  );

  function handleCategoryChange(cat: string) {
    setSelectedCategory(cat);
  }

  function handleFavoritesToggle() {
    setFavoritesOnly((prev) => !prev);
  }

  async function toggleFavorite(id: string) {
    try {
      const auth = await getAuth();
      if (!auth) return;
      const res = await fetch(`${API_URL}/recipes/${id}/favorite`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        const updated = normalizeRecipe(data);
        if (favoritesOnly && !updated.isFavorite) {
          setRecipes((prev) => prev.filter((r) => r.id !== id));
        } else {
          setRecipes((prev) => prev.map((r) => r.id === id ? updated : r));
        }
      }
    } catch {}
  }

  const filtered = search
    ? recipes.filter(
        (r) =>
          r.title.toLowerCase().includes(search.toLowerCase()) ||
          (r.authorName ?? "").toLowerCase().includes(search.toLowerCase())
      )
    : recipes;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Voltar" accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Comunidade</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Busca */}
      <View style={styles.searchContainer}>
        <Ionicons name="search-outline" size={18} color={colors.textMuted} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar receitas ou autores..."
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
        <Pressable
          style={[styles.chip, favoritesOnly && styles.chipFav]}
          onPress={handleFavoritesToggle}
        >
          <Ionicons
            name={favoritesOnly ? "heart" : "heart-outline"}
            size={13}
            color={favoritesOnly ? "#EF4444" : colors.textSecondary}
          />
          <Text style={[styles.chipText, favoritesOnly && styles.chipTextFav]}>Favoritas</Text>
        </Pressable>
        {CATEGORIES.map((cat) => (
          <Pressable
            key={cat}
            style={[styles.chip, selectedCategory === cat && styles.chipActive]}
            onPress={() => handleCategoryChange(cat)}
          >
            <Text style={[styles.chipText, selectedCategory === cat && styles.chipTextActive]}>
              {cat}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyWrapper}>
              <Ionicons name="earth-outline" size={48} color={colors.textMuted} />
              <Text style={styles.emptyTitle}>
                {favoritesOnly ? "Nenhuma receita favorita" : "Nenhuma receita pública ainda"}
              </Text>
              <Text style={styles.emptyText}>
                {favoritesOnly
                  ? "Favorite receitas da comunidade para vê-las aqui"
                  : "Compartilhe suas receitas marcando-as como públicas ao criar"}
              </Text>
            </View>
          }
          ListFooterComponent={
            hasMore ? (
              <Pressable
                style={styles.loadMoreBtn}
                onPress={() => fetchPage(page + 1, true, selectedCategory, favoritesOnly)}
                disabled={loadingMore}
                accessibilityLabel="Carregar mais receitas"
                accessibilityRole="button"
              >
                {loadingMore ? (
                  <ActivityIndicator color={colors.primary} size="small" />
                ) : (
                  <Text style={styles.loadMoreText}>Carregar mais</Text>
                )}
              </Pressable>
            ) : null
          }
          renderItem={({ item }) => (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate("RecipeDetails", { recipeId: item.id })}
              accessibilityLabel={`Receita ${item.title}`}
              accessibilityRole="button"
            >
              <View style={styles.cardImage}>
                {item.imageUrl ? (
                  <Image source={{ uri: item.imageUrl }} style={styles.cardImageReal} resizeMode="cover" />
                ) : (
                  <Ionicons name="restaurant" size={28} color={colors.primary} />
                )}
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
                  <Pressable onPress={() => toggleFavorite(item.id)} hitSlop={8} accessibilityLabel="Favoritar">
                    <Ionicons
                      name={item.isFavorite ? "heart" : "heart-outline"}
                      size={20}
                      color={item.isFavorite ? colors.danger : colors.textMuted}
                    />
                  </Pressable>
                </View>
                <Text style={styles.cardAuthor}>Por {item.authorName || "Usuário"}</Text>
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
              </View>
            </Pressable>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  header:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12 },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 22, fontWeight: "700", color: colors.textPrimary },
  searchContainer: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surface, borderRadius: 14, marginHorizontal: 20, marginBottom: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: 15, color: colors.textPrimary, padding: 0 },
  filtersScroll: { flexGrow: 0, marginBottom: 8 },
  filtersContent: { paddingHorizontal: 20, paddingVertical: 4, gap: 8, flexDirection: "row", alignItems: "center" },
  chip: { flexDirection: "row", alignItems: "center", gap: 4, paddingVertical: 7, paddingHorizontal: 14, borderRadius: 999, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipFav: { backgroundColor: "#FEE2E2", borderColor: "#EF4444" },
  chipText: { fontSize: 13, fontWeight: "600", color: colors.textSecondary },
  chipTextActive: { color: "#fff" },
  chipTextFav: { color: "#EF4444" },
  center:  { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  card: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 16, marginBottom: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.border, minHeight: 110 },
  cardImage: { width: 90, height: 120, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  cardImageReal: { width: 90, height: 120 },
  cardContent: { flex: 1, padding: 12 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 2 },
  cardTitle:  { flex: 1, fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginRight: 8 },
  cardAuthor: { fontSize: 12, color: colors.textMuted, marginBottom: 6 },
  badge:     { alignSelf: "flex-start", backgroundColor: colors.primaryLight, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8, marginBottom: 6 },
  badgeText: { fontSize: 11, fontWeight: "700", color: colors.primaryDark },
  cardMeta:  { flexDirection: "row", alignItems: "center", gap: 4 },
  cardMetaText: { fontSize: 12, color: colors.textMuted },
  dot: { fontSize: 12, color: colors.textMuted },
  emptyWrapper: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle:   { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
  emptyText:    { fontSize: 14, color: colors.textSecondary, textAlign: "center", paddingHorizontal: 20 },
  loadMoreBtn: { marginHorizontal: 20, marginBottom: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  loadMoreText: { fontSize: 14, fontWeight: "700", color: colors.primary },
});
