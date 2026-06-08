// RF21 — Tela de receitas públicas da comunidade
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
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

export default function CommunityRecipesScreen({ navigation }: any) {
  const [recipes, setRecipes] = useState<any[]>([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState("");

  const loadRecipes = useCallback(async () => {
    try {
      setLoading(true);
      const auth = await getAuth();
      if (!auth) return;
      const res = await fetch(`${API_URL}/recipes/community`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      const data = await res.json();
      if (res.ok) setRecipes(data.map(normalizeRecipe));
    } catch {}
    finally { setLoading(false); }
  }, []);

  useFocusEffect(useCallback(() => { loadRecipes(); }, [loadRecipes]));

  const filtered = recipes.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase()) ||
    (r.authorName ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Voltar" accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Comunidade</Text>
        <View style={{ width: 40 }} />
      </View>

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
              <Text style={styles.emptyTitle}>Nenhuma receita pública ainda</Text>
              <Text style={styles.emptyText}>
                Compartilhe suas receitas marcando-as como públicas ao criar
              </Text>
            </View>
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
                <Text style={styles.cardTitle} numberOfLines={1}>{item.title}</Text>
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
  searchContainer: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: colors.surface, borderRadius: 14, marginHorizontal: 20, marginBottom: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: colors.border },
  searchInput: { flex: 1, fontSize: 15, color: colors.textPrimary, padding: 0 },
  center:  { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: 20, paddingBottom: 24 },
  card: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 16, marginBottom: 12, overflow: "hidden", borderWidth: 1, borderColor: colors.border, minHeight: 110 },
  cardImage: { width: 90, height: 120, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  cardImageReal: { width: 90, height: 120 },
  cardContent: { flex: 1, padding: 12 },
  cardTitle:  { fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginBottom: 2 },
  cardAuthor: { fontSize: 12, color: colors.textMuted, marginBottom: 6 },
  badge:     { alignSelf: "flex-start", backgroundColor: colors.primaryLight, borderRadius: 999, paddingVertical: 2, paddingHorizontal: 8, marginBottom: 6 },
  badgeText: { fontSize: 11, fontWeight: "700", color: colors.primaryDark },
  cardMeta:  { flexDirection: "row", alignItems: "center", gap: 4 },
  cardMetaText: { fontSize: 12, color: colors.textMuted },
  dot: { fontSize: 12, color: colors.textMuted },
  emptyWrapper: { alignItems: "center", paddingTop: 60, gap: 8 },
  emptyTitle:   { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
  emptyText:    { fontSize: 14, color: colors.textSecondary, textAlign: "center", paddingHorizontal: 20 },
});
