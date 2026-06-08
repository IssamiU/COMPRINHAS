import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { API_URL } from "../../services/api";
import { getAuth } from "../../storage/authStorage";
import { normalizeRecipe } from "../../utils/normalizeRecipe";
// RF23 — cores reativas ao tema claro/escuro
import { useTheme } from "../../theme/ThemeContext";

interface SuggestedRecipe {
  id: string;
  title: string;
  category: string;
  prepTimeMinutes: number;
  servings: number;
  matchCount: number;
  totalIngredients: number;
  authorName?: string;
}

type Scope = "mine" | "community" | "all";

const SCOPES: { key: Scope; label: string }[] = [
  { key: "mine",      label: "Minhas receitas" },
  { key: "community", label: "Comunidade" },
  { key: "all",       label: "Ambas" },
];

export default function SuggestByIngredientsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [input, setInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [results, setResults] = useState<SuggestedRecipe[]>([]);
  const [searched, setSearched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [scope, setScope] = useState<Scope>("mine");

  function handleAddTag() {
    const trimmed = input.trim().toLowerCase();
    if (!trimmed) return;
    if (tags.includes(trimmed)) { setInput(""); return; }
    setTags((prev) => [...prev, trimmed]);
    setInput("");
  }

  function handleRemoveTag(tag: string) {
    setTags((prev) => prev.filter((t) => t !== tag));
  }

  async function handleSearch() {
    if (tags.length === 0) {
      Alert.alert("Atenção", "Adicione pelo menos um ingrediente.");
      return;
    }

    try {
      setLoading(true);
      setSearched(false);
      const auth = await getAuth();
      if (!auth) return;

      const query = tags.join(",");
      const scopeParam = scope !== "mine" ? `&scope=${scope}` : "";
      const response = await fetch(
        `${API_URL}/recipes/suggest?ingredients=${encodeURIComponent(query)}${scopeParam}`,
        { headers: { Authorization: `Bearer ${auth.accessToken}` } }
      );

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erro ao buscar sugestões");

      setResults(
        data.map((item: any) => ({
          ...normalizeRecipe(item),
          matchCount: item.matchCount,
          totalIngredients: item.totalIngredients,
        }))
      );
      setSearched(true);
    } catch (error) {
      Alert.alert("Erro", "Não foi possível buscar sugestões.");
    } finally {
      setLoading(false);
    }
  }

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
    backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
    container: { flex: 1, backgroundColor: colors.background },
    listContent: { padding: 20, paddingBottom: 40 },
    headerCard: { marginBottom: 20, alignItems: "center" },
    title: { fontSize: 26, fontWeight: "700", marginBottom: 8, color: colors.textPrimary, textAlign: "center" },
    subtitle: { fontSize: 15, color: colors.textSecondary, lineHeight: 22, textAlign: "center" },
    inputRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
    input: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, color: colors.textPrimary, fontSize: 15 },
    addTagButton: { backgroundColor: colors.primary, borderRadius: 12, width: 52, alignItems: "center", justifyContent: "center" },
    addTagButtonText: { color: "#fff", fontSize: 24, fontWeight: "700" },
    tagsContainer: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 16 },
    tag: { flexDirection: "row", alignItems: "center", backgroundColor: colors.primaryLight, borderRadius: 999, paddingVertical: 6, paddingHorizontal: 14 },
    tagText: { color: colors.primaryDark, fontWeight: "700", fontSize: 13 },
    tagRemove: { color: colors.primaryDark, fontWeight: "700", fontSize: 13 },
    scopeLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted, marginBottom: 8, letterSpacing: 0.5 },
    scopeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
    scopeBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center" },
    scopeBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
    scopeText: { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
    scopeTextActive: { color: colors.primaryDark, fontWeight: "700" },
    searchButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: "center", marginBottom: 20 },
    searchButtonDisabled: { opacity: 0.5 },
    searchButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    resultsHeader: { fontSize: 15, fontWeight: "600", color: colors.textSecondary, marginBottom: 12 },
    emptyCard: { backgroundColor: colors.surfaceAlt, borderRadius: 16, padding: 24, alignItems: "center" },
    emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary, marginBottom: 8 },
    emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
    card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 14 },
    cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 4, gap: 8 },
    cardTitle: { flex: 1, fontSize: 17, fontWeight: "700", color: colors.textPrimary },
    cardAuthor: { fontSize: 12, color: colors.textMuted, marginBottom: 6 },
    matchBadge: { backgroundColor: colors.primaryLight, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 10 },
    matchBadgeText: { color: colors.primaryDark, fontWeight: "700", fontSize: 11 },
    categoryBadge: { alignSelf: "flex-start", backgroundColor: colors.surfaceAlt, borderRadius: 999, paddingVertical: 3, paddingHorizontal: 10, marginBottom: 8 },
    categoryBadgeText: { color: colors.textSecondary, fontWeight: "600", fontSize: 12 },
    cardMeta: { fontSize: 13, color: colors.textSecondary, marginBottom: 10 },
    progressBar: { height: 4, backgroundColor: colors.border, borderRadius: 99, overflow: "hidden" },
    progressFill: { height: 4, backgroundColor: colors.primary, borderRadius: 99 },
  }), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Voltar" accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>O que tenho em casa?</Text>
        <View style={{ width: 36 }} />
      </View>
      <FlatList
        data={results}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <>
            <View style={styles.headerCard}>
              <Text style={styles.title}>O que tenho em casa?</Text>
              <Text style={styles.subtitle}>
                Digite os ingredientes que você tem disponíveis e veja quais receitas pode preparar.
              </Text>
            </View>

            {/* Input de ingredientes */}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Ex: ovo, farinha, leite..."
                placeholderTextColor={colors.textSecondary}
                value={input}
                onChangeText={setInput}
                onSubmitEditing={handleAddTag}
                returnKeyType="done"
                autoCapitalize="none"
              />
              <Pressable style={styles.addTagButton} onPress={handleAddTag}>
                <Text style={styles.addTagButtonText}>+</Text>
              </Pressable>
            </View>

            {/* Tags de ingredientes */}
            {tags.length > 0 && (
              <View style={styles.tagsContainer}>
                {tags.map((tag) => (
                  <Pressable key={tag} style={styles.tag} onPress={() => handleRemoveTag(tag)}>
                    <Text style={styles.tagText}>{tag}</Text>
                    <Text style={styles.tagRemove}> ✕</Text>
                  </Pressable>
                ))}
              </View>
            )}

            {/* Seletor de escopo */}
            <Text style={styles.scopeLabel}>Buscar em:</Text>
            <View style={styles.scopeRow}>
              {SCOPES.map((s) => (
                <Pressable
                  key={s.key}
                  style={[styles.scopeBtn, scope === s.key && styles.scopeBtnActive]}
                  onPress={() => setScope(s.key)}
                >
                  <Text style={[styles.scopeText, scope === s.key && styles.scopeTextActive]}>
                    {s.label}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              style={[styles.searchButton, (loading || tags.length === 0) && styles.searchButtonDisabled]}
              onPress={handleSearch}
              disabled={loading || tags.length === 0}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.searchButtonText}>Buscar receitas</Text>
              )}
            </Pressable>

            {searched && (
              <Text style={styles.resultsHeader}>
                {results.length === 0
                  ? "Nenhuma receita encontrada com esses ingredientes."
                  : `${results.length} receita${results.length !== 1 ? "s" : ""} encontrada${results.length !== 1 ? "s" : ""}`}
              </Text>
            )}
          </>
        }
        ListEmptyComponent={
          searched ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>Nenhuma receita encontrada</Text>
              <Text style={styles.emptyText}>
                Tente adicionar mais ingredientes ou explore outra fonte de busca.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <Pressable
            style={styles.card}
            onPress={() => navigation.navigate("RecipeDetails", { recipeId: item.id })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>{item.title}</Text>
              <View style={styles.matchBadge}>
                <Text style={styles.matchBadgeText}>
                  {item.matchCount}/{item.totalIngredients} ingredientes
                </Text>
              </View>
            </View>

            {item.authorName ? (
              <Text style={styles.cardAuthor}>Por {item.authorName}</Text>
            ) : null}

            <View style={styles.categoryBadge}>
              <Text style={styles.categoryBadgeText}>{item.category}</Text>
            </View>

            <Text style={styles.cardMeta}>
              {item.prepTimeMinutes} min · {item.servings} porções
            </Text>

            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${Math.min(100, Math.round((item.matchCount / item.totalIngredients) * 100))}%` },
                ]}
              />
            </View>
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}
