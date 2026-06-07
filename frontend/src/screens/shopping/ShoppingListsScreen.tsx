import React, { useState } from "react";
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import { RootState } from "../../store";
import { createList, deleteList, renameList } from "../../store/slices/shoppingListSlice";
import { ShoppingList } from "../../types/shopping";
import { colors } from "../../theme/colors";

export default function ShoppingListsScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const userId   = useSelector((s: RootState) => s.auth.user?.id ?? "") as string;
  const lists    = useSelector((s: RootState) => s.shoppingList.listsByUser[userId] ?? []);

  const [modalVisible, setModalVisible] = useState(false);
  const [editingList,  setEditingList]  = useState<ShoppingList | null>(null);
  const [listName,     setListName]     = useState("");

  function openCreateModal() { setEditingList(null); setListName(""); setModalVisible(true); }
  function openRenameModal(list: ShoppingList) { setEditingList(list); setListName(list.name); setModalVisible(true); }
  function closeModal() { setModalVisible(false); setEditingList(null); setListName(""); }

  function handleSave() {
    if (!listName.trim()) { Alert.alert("Atenção", "Digite um nome para a lista."); return; }
    if (editingList) {
      dispatch(renameList({ id: editingList.id, name: listName.trim(), userId }));
    } else {
      dispatch(createList({
        id: Date.now().toString(),
        name: listName.trim(),
        createdAt: new Date().toISOString(),
        items: [],
        userId,
      }));
    }
    closeModal();
  }

  function handleDelete(list: ShoppingList) {
    Alert.alert("Excluir lista", `Deseja excluir "${list.name}"?`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Excluir", style: "destructive", onPress: () => dispatch(deleteList({ id: list.id, userId })) },
    ]);
  }

  function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  }

  function getProgress(list: ShoppingList) {
    if (list.items.length === 0) return 0;
    return Math.round((list.items.filter((i) => i.checked).length / list.items.length) * 100);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lista de Compras</Text>
        <Pressable style={styles.addButton} onPress={openCreateModal}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <FlatList
        data={lists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyWrapper}>
            <Ionicons name="cart-outline" size={56} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Nenhuma lista criada</Text>
            <Text style={styles.emptyText}>Crie uma lista para organizar suas compras.</Text>
            <Pressable style={styles.emptyButton} onPress={openCreateModal}>
              <Text style={styles.emptyButtonText}>+ Nova lista</Text>
            </Pressable>
          </View>
        }
        renderItem={({ item }) => {
          const progress = getProgress(item);
          const checked  = item.items.filter((i) => i.checked).length;
          return (
            <Pressable
              style={styles.card}
              onPress={() => navigation.navigate("ShoppingList", { listId: item.id })}
            >
              <View style={styles.cardIcon}>
                <Ionicons name="basket-outline" size={22} color={colors.primary} />
              </View>
              <View style={styles.cardContent}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardName}>{item.name}</Text>
                  <View style={styles.cardActions}>
                    <Pressable style={styles.iconBtn} onPress={() => openRenameModal(item)}>
                      <Ionicons name="pencil-outline" size={16} color={colors.textSecondary} />
                    </Pressable>
                    <Pressable style={styles.iconBtn} onPress={() => handleDelete(item)}>
                      <Ionicons name="trash-outline" size={16} color={colors.danger} />
                    </Pressable>
                  </View>
                </View>
                <Text style={styles.cardMeta}>
                  {checked} de {item.items.length} {item.items.length === 1 ? "item" : "itens"} · {formatDate(item.createdAt)}
                </Text>
                {item.items.length > 0 && (
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View style={[styles.progressFill, { width: `${progress}%` as any }]} />
                    </View>
                    <Text style={styles.progressText}>{progress}%</Text>
                  </View>
                )}
              </View>
            </Pressable>
          );
        }}
      />

      {/* Modal criar/renomear — com KeyboardAvoidingView */}
      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <KeyboardAvoidingView
          style={styles.modalKAV}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <Pressable style={styles.modalBackdrop} onPress={closeModal} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>
              {editingList ? "Renomear lista" : "Nova lista"}
            </Text>
            <TextInput
              style={styles.input}
              placeholder='Ex: "Feira semanal"'
              placeholderTextColor={colors.textMuted}
              value={listName}
              onChangeText={setListName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSave}
            />
            <Pressable style={styles.primaryBtn} onPress={handleSave}>
              <Text style={styles.primaryBtnText}>{editingList ? "Salvar" : "Criar lista"}</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={closeModal}>
              <Text style={styles.secondaryBtnText}>Cancelar</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingTop: 16, paddingBottom: 16 },
  headerTitle: { fontSize: 28, fontWeight: "700", color: colors.textPrimary },
  addButton: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  listContent: { paddingHorizontal: 20, paddingBottom: 24, flexGrow: 1 },
  card: { flexDirection: "row", alignItems: "flex-start", backgroundColor: colors.surface, borderRadius: 16, padding: 14, marginBottom: 12, borderWidth: 1, borderColor: colors.border },
  cardIcon: { width: 44, height: 44, borderRadius: 12, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0 },
  cardContent: { flex: 1 },
  cardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  cardName: { fontSize: 16, fontWeight: "700", color: colors.textPrimary, flex: 1, marginRight: 8 },
  cardActions: { flexDirection: "row", gap: 4 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, alignItems: "center", justifyContent: "center" },
  cardMeta: { fontSize: 12, color: colors.textMuted, marginBottom: 8 },
  progressContainer: { flexDirection: "row", alignItems: "center", gap: 8 },
  progressBar: { flex: 1, height: 6, backgroundColor: colors.border, borderRadius: 99, overflow: "hidden" },
  progressFill: { height: 6, backgroundColor: colors.primary, borderRadius: 99 },
  progressText: { fontSize: 11, fontWeight: "700", color: colors.primary, minWidth: 28, textAlign: "right" },
  emptyWrapper: { flex: 1, alignItems: "center", justifyContent: "center", paddingTop: 80, gap: 10 },
  emptyTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  emptyText: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
  emptyButton: { marginTop: 8, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  emptyButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  // Modal
  modalKAV: { flex: 1, justifyContent: "flex-end" },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.4)" },
  modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: Platform.OS === "ios" ? 40 : 24 },
  modalTitle: { fontSize: 20, fontWeight: "700", color: colors.textPrimary, marginBottom: 16 },
  input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 16, color: colors.textPrimary, fontSize: 15 },
  primaryBtn: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 10 },
  primaryBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  secondaryBtn: { backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  secondaryBtnText: { color: colors.textSecondary, fontWeight: "700", fontSize: 15 },
});