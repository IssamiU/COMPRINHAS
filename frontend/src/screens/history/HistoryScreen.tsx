import React, { useCallback, useState } from "react";
import {
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import { API_URL } from "../../services/api";
import { getAuth } from "../../storage/authStorage";
import { colors } from "../../theme/colors";

interface HistoryItem {
  id: string;
  recipeId: string;
  preparedAt: string;
  recipe: {
    id: string;
    title: string;
    category: string;
    prepTimeMinutes: number;
    servings: number;
  } | null;
}

export default function HistoryScreen({ navigation }: any) {
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadHistory = useCallback(async () => {
    try {
      setLoading(true);
      const auth = await getAuth();
      if (!auth) return;

      const response = await fetch(`${API_URL}/history`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erro ao carregar histórico");
      setHistory(data);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      Alert.alert("Erro", "Não foi possível carregar o histórico.");
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [loadHistory])
  );

  function formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  function handleOpenRecipe(recipeId: string) {
    navigation.navigate("RecipeDetails", { recipeId });
  }

  function handleDeleteItem(id: string) {
    Alert.alert(
      "Remover do histórico",
      "Deseja remover este registro do histórico?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Remover",
          style: "destructive",
          onPress: async () => {
            try {
              const auth = await getAuth();
              if (!auth) return;

              const response = await fetch(`${API_URL}/history/${id}`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${auth.accessToken}` },
              });

              if (!response.ok) throw new Error("Erro ao remover");
              setHistory((prev) => prev.filter((item) => item.id !== id));
            } catch (error) {
              Alert.alert("Erro", "Não foi possível remover o registro.");
            }
          },
        },
      ]
    );
  }

  function handleClearAll() {
    Alert.alert(
      "Apagar histórico completo",
      "Tem certeza? Todos os registros serão removidos permanentemente.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Apagar tudo",
          style: "destructive",
          onPress: async () => {
            try {
              const auth = await getAuth();
              if (!auth) return;

              const response = await fetch(`${API_URL}/history`, {
                method: "DELETE",
                headers: { Authorization: `Bearer ${auth.accessToken}` },
              });

              if (!response.ok) throw new Error("Erro ao apagar histórico");
              setHistory([]);
            } catch (error) {
              Alert.alert("Erro", "Não foi possível apagar o histórico.");
            }
          },
        },
      ]
    );
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (history.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Nenhuma receita preparada</Text>
          <Text style={styles.emptyText}>
            Marque uma receita como preparada para vê-la aqui.
          </Text>
        </View>
      </View>
    );
  }

  return (
    <FlatList
      data={history}
      keyExtractor={(item) => item.id}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      ListHeaderComponent={
        <View style={styles.headerCard}>
          <Text style={styles.screenTitle}>Histórico</Text>
          <Text style={styles.screenSubtitle}>
            Receitas que você já preparou.
          </Text>
          {/* Botão apagar tudo */}
          <Pressable style={styles.clearAllButton} onPress={handleClearAll}>
            <Text style={styles.clearAllText}>Apagar histórico completo</Text>
          </Pressable>
        </View>
      }
      renderItem={({ item }) => (
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Text style={styles.recipeTitle}>
              {item.recipe?.title ?? "Receita removida"}
            </Text>
            {item.recipe && (
              <View style={styles.categoryBadge}>
                <Text style={styles.categoryBadgeText}>{item.recipe.category}</Text>
              </View>
            )}
          </View>

          {item.recipe && (
            <Text style={styles.info}>
              {item.recipe.prepTimeMinutes} min · {item.recipe.servings} porções
            </Text>
          )}

          <Text style={styles.date}>Preparado em: {formatDate(item.preparedAt)}</Text>

          <View style={styles.actionsRow}>
            {item.recipe && (
              <Pressable
                style={styles.prepareAgainButton}
                onPress={() => handleOpenRecipe(item.recipeId)}
              >
                <Text style={styles.prepareAgainButtonText}>Ver receita</Text>
              </Pressable>
            )}

            <Pressable
              style={styles.deleteItemButton}
              onPress={() => handleDeleteItem(item.id)}
            >
              <Text style={styles.deleteItemText}>Remover</Text>
            </Pressable>
          </View>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  list: { backgroundColor: colors.background },
  listContent: { padding: 16, paddingBottom: 40, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  emptyContainer: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, backgroundColor: colors.background },
  emptyCard: { width: "100%", backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.border, borderRadius: 18, padding: 24, alignItems: "center" },
  emptyTitle: { fontSize: 22, fontWeight: "700", color: colors.textPrimary, textAlign: "center" },
  emptyText: { fontSize: 15, color: colors.textSecondary, textAlign: "center", marginTop: 8, lineHeight: 22 },
  headerCard: { borderRadius: 18, padding: 18, marginBottom: 18, alignItems: "center" },
  screenTitle: { fontSize: 28, fontWeight: "700", marginBottom: 6, color: colors.textPrimary },
  screenSubtitle: { fontSize: 15, color: colors.textSecondary, lineHeight: 22, textAlign: "center", marginBottom: 16 },
  clearAllButton: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  clearAllText: { color: colors.danger, fontWeight: "700", fontSize: 14 },
  card: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 14 },
  cardHeader: { marginBottom: 8 },
  recipeTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary, marginBottom: 6 },
  categoryBadge: { alignSelf: "flex-start", backgroundColor: colors.primaryLight, borderRadius: 999, paddingVertical: 4, paddingHorizontal: 12, marginBottom: 6 },
  categoryBadgeText: { color: colors.primaryDark, fontWeight: "700", fontSize: 12 },
  info: { fontSize: 14, color: colors.textSecondary, marginBottom: 4 },
  date: { fontSize: 13, color: colors.textSecondary, marginBottom: 14 },
  actionsRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  detailsButton: { flex: 1, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 10, paddingVertical: 10, alignItems: "center", justifyContent: "center" },
  detailsButtonText: { color: colors.textPrimary, fontWeight: "700", textAlign: "center", fontSize: 13 },
  prepareAgainButton: { flex: 1, backgroundColor: colors.primary, borderRadius: 10, paddingVertical: 10, alignItems: "center" },
  prepareAgainButtonText: { color: "#fff", fontWeight: "700", textAlign: "center",fontSize: 13 },
  deleteItemButton: { backgroundColor: colors.surfaceAlt, borderWidth: 1, borderColor: colors.danger, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  deleteItemText: { color: colors.danger, fontWeight: "700", fontSize: 13 },
});