import React, { useMemo, useState } from "react";
import {
  Alert,
  Modal,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import { RootState } from "../../store";
import {
  addShoppingListItem,
  clearShoppingList,
  removeShoppingListItem,
  setShoppingList,
  toggleShoppingListItem,
  updateShoppingListItem,
} from "../../store/slices/shoppingListSlice";
import { ShoppingList, ShoppingListItem } from "../../types/shopping";
import { generateShoppingListFromPlanner } from "../../utils/generateShoppingList";
import { colors } from "../../theme/colors";

const UNITS = [
  "g", "kg", "ml", "l", "xícara", "colher de sopa",
  "colher de chá", "unidade", "dente", "pitada", "a gosto",
  "fatia", "folha", "ramo",
];

const CATEGORIES = [
  { key: "Hortifruti", emoji: "🥬" },
  { key: "Laticínios", emoji: "🥛" },
  { key: "Padaria",    emoji: "🥐" },
  { key: "Açougue",   emoji: "🥩" },
  { key: "Mercearia", emoji: "🛒" },
  { key: "Bebidas",   emoji: "🥤" },
  { key: "Congelados",emoji: "🧊" },
  { key: "Outros",    emoji: "📦" },
];

function NotFoundScreen({ onBack }: { onBack: () => void }) {
  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.notFound}>
        <Ionicons name="cart-outline" size={48} color={colors.textMuted} />
        <Text style={styles.notFoundTitle}>Lista não encontrada</Text>
        <Text style={styles.notFoundSub}>Volte e selecione ou crie uma lista.</Text>
        <Pressable style={styles.backBtn} onPress={onBack}>
          <Text style={styles.backBtnText}>Voltar</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function ShoppingListContent({
  navigation,
  list,
  listId,
  userId,
}: {
  navigation: any;
  list: ShoppingList;
  listId: string;
  userId: string;
}) {
  const dispatch     = useDispatch();
  const plannedMeals = useSelector((s: RootState) => s.planner.plannedMeals);
  const recipes      = useSelector((s: RootState) => s.recipes.recipes);

  const [addOpen,        setAddOpen]        = useState(false);
  const [editingItem,    setEditingItem]    = useState<ShoppingListItem | null>(null);
  const [fName,          setFName]          = useState("");
  const [fQty,           setFQty]           = useState("");
  const [fUnit,          setFUnit]          = useState(UNITS[0]);
  const [fCategory,      setFCategory]      = useState("Outros");
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const [catPickerOpen,  setCatPickerOpen]  = useState(false);

  const items = list.items;

  const grouped = useMemo(() => {
    const map = new Map<string, ShoppingListItem[]>();
    items.forEach((it) => {
      const k = (it as any).category ?? "Outros";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    });
    return CATEGORIES
      .map((c) => ({ ...c, items: map.get(c.key) ?? [] }))
      .filter((c) => c.items.length > 0);
  }, [items]);

  const total    = items.length;
  const checked  = items.filter((i) => i.checked).length;
  const progress = total > 0 ? checked / total : 0;

  function resetForm() {
    setFName(""); setFQty(""); setFUnit(UNITS[0]); setFCategory("Outros");
    setEditingItem(null);
  }

  function openAdd() { resetForm(); setAddOpen(true); }

  function openEdit(item: ShoppingListItem) {
    setEditingItem(item);
    setFName(item.name);
    setFQty(String(item.quantity));
    setFUnit(item.unit);
    setFCategory((item as any).category ?? "Outros");
    setAddOpen(true);
  }

  function handleSaveItem() {
    const qty = Number(fQty);
    if (!fName.trim()) { Alert.alert("Atenção", "Informe o nome do item."); return; }
    if (!fQty || qty <= 0) { Alert.alert("Atenção", "Informe uma quantidade válida."); return; }

    if (editingItem) {
      dispatch(updateShoppingListItem({
        listId, userId,
        item: { id: editingItem.id, name: fName.trim(), quantity: qty, unit: fUnit, checked: editingItem.checked },
      }));
    } else {
      dispatch(addShoppingListItem({
        listId, userId,
        item: { id: Date.now().toString(), name: fName.trim(), quantity: qty, unit: fUnit, checked: false },
      }));
    }
    resetForm(); setAddOpen(false);
  }

  function handleDelete(itemId: string) {
    Alert.alert("Remover", "Deseja remover este item?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => dispatch(removeShoppingListItem({ listId, itemId, userId })) },
    ]);
  }

  function handleGenerate() {
    if (plannedMeals.length === 0) {
      Alert.alert("Atenção", "Adicione receitas ao planejamento antes de gerar a lista.");
      return;
    }
    Alert.alert("Gerar lista", "Isso substituirá os itens atuais. Deseja continuar?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Gerar", onPress: () => {
        dispatch(setShoppingList({ listId, userId, items: generateShoppingListFromPlanner(plannedMeals, recipes) }));
        Alert.alert("Sucesso", "Lista gerada com base no planejamento!");
      }},
    ]);
  }

  function handleClear() {
    if (items.length === 0) { Alert.alert("Atenção", "A lista já está vazia."); return; }
    Alert.alert("Limpar lista", "Remover todos os itens?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Limpar", style: "destructive", onPress: () => dispatch(clearShoppingList({ listId, userId })) },
    ]);
  }

  async function handleShare() {
    const txt = `🛒 ${list.name}\n\n` +
      grouped.map((g) =>
        `${g.emoji} ${g.key}\n` +
        g.items.map((it) => `  ${it.checked ? "✅" : "⬜"} ${it.name} — ${it.quantity} ${it.unit}`).join("\n")
      ).join("\n\n");
    try { await Share.share({ message: txt }); } catch {}
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{list.name}</Text>
        <Pressable style={styles.iconBtn} onPress={handleShare}>
          <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
        </Pressable>
      </View>

      <View style={styles.progressCard}>
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>
            <Text style={styles.progressBold}>{checked}</Text> de {total} itens
          </Text>
          <Text style={styles.progressPct}>{Math.round(progress * 100)}%</Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${Math.round(progress * 100)}%` as any }]} />
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.quickActions}>
          <Pressable style={styles.quickBtn} onPress={handleGenerate}>
            <Ionicons name="sparkles-outline" size={15} color={colors.primary} />
            <Text style={styles.quickBtnText}>Do planejamento</Text>
          </Pressable>
          <Pressable style={[styles.quickBtn, styles.quickBtnDanger]} onPress={handleClear}>
            <Ionicons name="trash-outline" size={15} color={colors.danger} />
            <Text style={[styles.quickBtnText, { color: colors.danger }]}>Limpar lista</Text>
          </Pressable>
        </View>

        {grouped.length === 0 ? (
          <View style={styles.empty}>
            <Ionicons name="cart-outline" size={48} color={colors.textMuted} />
            <Text style={styles.emptyTitle}>Lista vazia</Text>
            <Text style={styles.emptySub}>Adicione itens ou gere do planejamento.</Text>
          </View>
        ) : (
          grouped.map((group) => {
            const grpChecked = group.items.filter((i) => i.checked).length;
            return (
              <View key={group.key} style={styles.groupCard}>
                <View style={styles.groupHeader}>
                  <Text style={styles.groupEmoji}>{group.emoji}</Text>
                  <Text style={styles.groupTitle}>{group.key}</Text>
                  <View style={styles.groupPill}>
                    <Text style={styles.groupPillText}>{grpChecked}/{group.items.length}</Text>
                  </View>
                </View>
                {group.items.map((item, idx) => (
                  <Pressable
                    key={item.id}
                    style={[styles.itemRow, idx === group.items.length - 1 && { borderBottomWidth: 0 }]}
                    onPress={() => dispatch(toggleShoppingListItem({ listId, itemId: item.id, userId }))}
                  >
                    <View style={[styles.checkbox, item.checked && styles.checkboxChecked]}>
                      {item.checked && <Ionicons name="checkmark" size={13} color="#fff" />}
                    </View>
                    <Text style={[styles.itemName, item.checked && styles.itemChecked]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.itemQty, item.checked && styles.itemChecked]}>{item.quantity} {item.unit}</Text>
                    <Pressable onPress={() => openEdit(item)} hitSlop={10} style={styles.rowAction}>
                      <Ionicons name="pencil-outline" size={15} color={colors.textMuted} />
                    </Pressable>
                    <Pressable onPress={() => handleDelete(item.id)} hitSlop={10} style={styles.rowAction}>
                      <Ionicons name="trash-outline" size={15} color={colors.danger} />
                    </Pressable>
                  </Pressable>
                ))}
              </View>
            );
          })
        )}
      </ScrollView>

      <View style={styles.fabs}>
        <Pressable style={[styles.fab, styles.fabSecondary]} onPress={handleGenerate}>
          <Ionicons name="sparkles" size={20} color={colors.primary} />
        </Pressable>
        <Pressable style={[styles.fab, styles.fabPrimary]} onPress={openAdd}>
          <Ionicons name="add" size={26} color="#fff" />
        </Pressable>
      </View>

      {/* Modal adicionar/editar */}
      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => { resetForm(); setAddOpen(false); }}>
        <Pressable style={styles.backdrop} onPress={() => { resetForm(); setAddOpen(false); }} />
        <View style={styles.sheet}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>{editingItem ? "Editar item" : "Adicionar item"}</Text>
          <Text style={styles.fieldLabel}>Nome</Text>
          <TextInput style={styles.input} placeholder="Ex.: Maçã" placeholderTextColor={colors.textMuted} value={fName} onChangeText={setFName} autoFocus returnKeyType="next" />
          <View style={styles.rowGap}>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Quantidade</Text>
              <TextInput style={styles.input} placeholder="0" placeholderTextColor={colors.textMuted} keyboardType="numeric" value={fQty} onChangeText={setFQty} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.fieldLabel}>Unidade</Text>
              <Pressable style={[styles.input, styles.pickerBtn]} onPress={() => setUnitPickerOpen(true)}>
                <Text style={styles.pickerBtnText} numberOfLines={1}>{fUnit}</Text>
                <Ionicons name="chevron-down" size={15} color={colors.textMuted} />
              </Pressable>
            </View>
          </View>
          <Text style={styles.fieldLabel}>Categoria</Text>
          <Pressable style={[styles.input, styles.pickerBtn]} onPress={() => setCatPickerOpen(true)}>
            <Text style={styles.pickerBtnText}>{fCategory}</Text>
            <Ionicons name="chevron-down" size={15} color={colors.textMuted} />
          </Pressable>
          <View style={styles.modalActions}>
            <Pressable style={styles.cancelBtn} onPress={() => { resetForm(); setAddOpen(false); }}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </Pressable>
            <Pressable style={styles.confirmBtn} onPress={handleSaveItem}>
              <Text style={styles.confirmBtnText}>{editingItem ? "Salvar" : "Adicionar"}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      {/* Picker unidade */}
      <Modal visible={unitPickerOpen} transparent animationType="fade" onRequestClose={() => setUnitPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setUnitPickerOpen(false)} />
        <View style={[styles.sheet, { maxHeight: "60%" }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Selecionar unidade</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {UNITS.map((u) => (
              <Pressable key={u} style={styles.pickerOption} onPress={() => { setFUnit(u); setUnitPickerOpen(false); }}>
                <Text style={[styles.pickerOptionText, fUnit === u && { color: colors.primary, fontWeight: "700" }]}>{u}</Text>
                {fUnit === u && <Ionicons name="checkmark" size={16} color={colors.primary} />}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Picker categoria */}
      <Modal visible={catPickerOpen} transparent animationType="fade" onRequestClose={() => setCatPickerOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setCatPickerOpen(false)} />
        <View style={[styles.sheet, { maxHeight: "60%" }]}>
          <View style={styles.sheetHandle} />
          <Text style={styles.sheetTitle}>Selecionar categoria</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {CATEGORIES.map((c) => (
              <Pressable key={c.key} style={styles.pickerOption} onPress={() => { setFCategory(c.key); setCatPickerOpen(false); }}>
                <Text style={[styles.pickerOptionText, fCategory === c.key && { color: colors.primary, fontWeight: "700" }]}>{c.emoji}  {c.key}</Text>
                {fCategory === c.key && <Ionicons name="checkmark" size={16} color={colors.primary} />}
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

export default function ShoppingListScreen({ navigation, route }: any) {
  const listId = route?.params?.listId as string | undefined;
  const userId = useSelector((s: RootState) => String(s.auth.user?.id ?? ""));
  const list   = useSelector((s: RootState) =>
    (s.shoppingList.listsByUser[userId] ?? []).find((l) => l.id === listId)
  );

  if (!listId || !list) {
    return <NotFoundScreen onBack={() => navigation.goBack()} />;
  }

  return <ShoppingListContent navigation={navigation} list={list} listId={listId} userId={userId} />;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  notFound: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  notFoundTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  notFoundSub: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
  backBtn: { marginTop: 8, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28 },
  backBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  header: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 12 },
  iconBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, textAlign: "center", fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  progressCard: { marginHorizontal: 16, marginBottom: 8, backgroundColor: colors.surface, borderRadius: 16, padding: 16, borderWidth: 1, borderColor: colors.border },
  progressRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  progressText: { fontSize: 13, color: colors.textSecondary },
  progressBold: { color: colors.textPrimary, fontWeight: "700" },
  progressPct: { color: colors.primary, fontWeight: "700", fontSize: 14 },
  track: { height: 8, backgroundColor: colors.borderLight, borderRadius: 999, overflow: "hidden" },
  fill: { height: "100%", backgroundColor: colors.primary, borderRadius: 999 },
  scrollContent: { paddingBottom: 120 },
  quickActions: { flexDirection: "row", gap: 10, paddingHorizontal: 16, marginVertical: 8 },
  quickBtn: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 10, borderRadius: 12, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface },
  quickBtnDanger: { borderColor: colors.danger },
  quickBtnText: { fontSize: 13, fontWeight: "700", color: colors.primary },
  groupCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  groupHeader: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 10 },
  groupEmoji: { fontSize: 18, marginRight: 8 },
  groupTitle: { flex: 1, fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  groupPill: { backgroundColor: colors.primaryLight, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  groupPillText: { color: colors.primaryDark, fontSize: 11, fontWeight: "700" },
  itemRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 1, borderBottomColor: colors.border },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: colors.border, alignItems: "center", justifyContent: "center", marginRight: 12 },
  checkboxChecked: { backgroundColor: colors.primary, borderColor: colors.primary },
  itemName: { flex: 1, fontSize: 15, color: colors.textPrimary },
  itemQty: { fontSize: 13, color: colors.textSecondary, marginLeft: 6 },
  itemChecked: { color: colors.textMuted, textDecorationLine: "line-through" },
  rowAction: { padding: 4, marginLeft: 6 },
  empty: { alignItems: "center", paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  emptySub: { fontSize: 13, color: colors.textSecondary, textAlign: "center", paddingHorizontal: 32 },
  fabs: { position: "absolute", right: 20, bottom: 24, alignItems: "center", gap: 12 },
  fab: { width: 56, height: 56, borderRadius: 28, alignItems: "center", justifyContent: "center", elevation: 6, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  fabPrimary: { backgroundColor: colors.primary },
  fabSecondary: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  sheet: { backgroundColor: colors.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: "center", marginBottom: 16 },
  sheetTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary, marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: "600", color: colors.textMuted, marginBottom: 6, marginTop: 8 },
  input: { minHeight: 46, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, fontSize: 15, color: colors.textPrimary, backgroundColor: colors.background },
  rowGap: { flexDirection: "row", gap: 12 },
  pickerBtn: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  pickerBtnText: { flex: 1, fontSize: 15, color: colors.textPrimary },
  pickerOption: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  pickerOptionText: { fontSize: 15, color: colors.textPrimary },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 20 },
  cancelBtn: { flex: 1, backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: colors.border },
  cancelBtnText: { color: colors.textSecondary, fontWeight: "700" },
  confirmBtn: { flex: 1, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
  confirmBtnText: { color: "#fff", fontWeight: "700" },
});