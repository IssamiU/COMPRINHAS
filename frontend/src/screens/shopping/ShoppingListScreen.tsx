import React, { useMemo, useRef, useState } from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { RootState } from "../../store";
import {
  addCustomCategory,
  addShoppingListItem,
  clearShoppingList,
  removeCustomCategory,
  removeShoppingListItem,
  setShoppingList,
  toggleShoppingListItem,
  updateShoppingListItem,
} from "../../store/slices/shoppingListSlice";
import { ShoppingList, ShoppingListItem } from "../../types/shopping";
import { generateShoppingListFromPlanner } from "../../utils/generateShoppingList";
import { useTheme } from "../../theme/ThemeContext";

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
  const { colors } = useTheme();
  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    notFound: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
    notFoundTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
    notFoundSub: { fontSize: 14, color: colors.textSecondary, textAlign: "center" },
    backBtn: { marginTop: 8, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28 },
    backBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  }), [colors]);
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
  const { colors } = useTheme();
  // RF23 — estilos reativos ao tema
  const styles = useMemo(() => StyleSheet.create({
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
    inlineList: { maxHeight: 150, borderWidth: 1, borderColor: colors.border, borderRadius: 12, marginTop: 4, backgroundColor: colors.surface, overflow: "hidden" },
    inlineItem: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
    inlineItemText: { fontSize: 14, color: colors.textPrimary },
    catSeparator: { paddingHorizontal: 14, paddingVertical: 6, backgroundColor: colors.borderLight },
    catSeparatorText: { fontSize: 11, fontWeight: "700", color: colors.textMuted, textTransform: "uppercase", letterSpacing: 0.5 },
  }), [colors]);

  const [addOpen,        setAddOpen]        = useState(false);
  const [editingItem,    setEditingItem]    = useState<ShoppingListItem | null>(null);
  const [fName,          setFName]          = useState("");
  const [fQty,           setFQty]           = useState("");
  const [fUnit,          setFUnit]          = useState(UNITS[0]);
  const [fCategory,      setFCategory]      = useState("Outros");
  const [unitPickerOpen, setUnitPickerOpen] = useState(false);
  const [catPickerOpen,  setCatPickerOpen]  = useState(false);
  const [addingNewCat,   setAddingNewCat]   = useState(false);
  const [newCatName,     setNewCatName]     = useState("");
  const newCatRef = useRef<TextInput>(null);
  const qtyRef = useRef<TextInput>(null);

  const items = list.items;

  const allCategories = useMemo(() => [
    ...CATEGORIES,
    ...(list.customCategories ?? []).map((key) => ({ key, emoji: "🏷️", custom: true })),
  ], [list.customCategories]);

  const grouped = useMemo(() => {
    const knownKeys = new Set(allCategories.map((c) => c.key));
    const map = new Map<string, ShoppingListItem[]>();
    items.forEach((it) => {
      // categoria desconhecida (vinda de APIs externas) cai em Outros
      const k = (it.category && knownKeys.has(it.category)) ? it.category : "Outros";
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(it);
    });
    return allCategories
      .map((c) => ({ ...c, items: map.get(c.key) ?? [] }))
      .filter((c) => c.items.length > 0);
  }, [items, allCategories]);

  function handleConfirmNewCat() {
    const name = newCatName.trim();
    if (!name) return;
    dispatch(addCustomCategory({ listId, userId, name }));
    setFCategory(name);
    setNewCatName("");
    setAddingNewCat(false);
    setCatPickerOpen(false);
  }

  function handleRemoveCat(name: string) {
    Alert.alert("Remover categoria", `Remover "${name}"? Os itens voltam para Outros.`, [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: () => {
        dispatch(removeCustomCategory({ listId, userId, name }));
        if (fCategory === name) setFCategory("Outros");
      }},
    ]);
  }

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
    setFCategory(item.category ?? "Outros");
    setAddOpen(true);
  }

  function handleSaveItem() {
    const qty = Number(fQty);
    if (!fName.trim()) { Alert.alert("Atenção", "Informe o nome do item."); return; }
    if (!fQty || qty <= 0) { Alert.alert("Atenção", "Informe uma quantidade válida."); return; }

    if (editingItem) {
      dispatch(updateShoppingListItem({
        listId, userId,
        item: { id: editingItem.id, name: fName.trim(), quantity: qty, unit: fUnit, checked: editingItem.checked, category: fCategory },
      }));
    } else {
      dispatch(addShoppingListItem({
        listId, userId,
        item: { id: Date.now().toString(), name: fName.trim(), quantity: qty, unit: fUnit, checked: false, category: fCategory },
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
    const dateStr = new Date().toLocaleDateString("pt-BR");
    const txt = `🛒 ${list.name}\n${dateStr} · ${checked} de ${total} itens\n\n` +
      grouped.map((g) =>
        `${g.emoji} ${g.key}\n` +
        g.items.map((it) => `  ${it.checked ? "[x]" : "[ ]"} ${it.name} — ${it.quantity} ${it.unit}`).join("\n")
      ).join("\n\n");
    try { await Share.share({ message: txt }); } catch {}
  }

  // RF24 — Exportar lista de compras para PDF
  async function handleExportPDF() {
    if (items.length === 0) {
      Alert.alert("Atenção", "A lista está vazia.");
      return;
    }
    const dateStr = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    const groupsHtml = grouped.map((g) => `
      <div class="group">
        <div class="group-title">${g.emoji} ${g.key}</div>
        ${g.items.map((it) => `
          <div class="item ${it.checked ? "checked" : ""}">
            <span>${it.checked ? "✅" : "⬜"} ${it.name}</span>
            <span class="qty">${it.quantity} ${it.unit}</span>
          </div>`).join("")}
      </div>`).join("");

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/>
      <style>
        body{font-family:Arial,sans-serif;padding:32px;color:#111827;max-width:600px;margin:0 auto}
        h1{color:#22C55E;font-size:22px;margin-bottom:4px}
        .sub{color:#6B7280;font-size:12px;margin-bottom:6px}
        .prog{color:#6B7280;font-size:13px;margin-bottom:24px;padding:8px 12px;background:#F0FDF4;border-radius:8px;display:inline-block}
        .group{margin-bottom:20px}
        .group-title{font-size:14px;font-weight:bold;color:#16A34A;border-bottom:2px solid #DCFCE7;padding-bottom:6px;margin-bottom:8px}
        .item{display:flex;justify-content:space-between;padding:7px 0;border-bottom:1px solid #F3F4F6;font-size:13px}
        .item.checked{color:#111827}
        .qty{color:#6B7280;white-space:nowrap;margin-left:12px}
      </style></head><body>
      <h1>🛒 ${list.name}</h1>
      <p class="sub">Gerado em ${dateStr}</p>
      <p class="prog">${checked} de ${total} itens concluídos</p>
      ${groupsHtml}
    </body></html>`;

    try {
      const { uri } = await Print.printToFileAsync({ html, base64: false });
      await Sharing.shareAsync(uri, {
        mimeType: "application/pdf",
        dialogTitle: `Lista: ${list.name}`,
        UTI: "com.adobe.pdf",
      });
    } catch {
      Alert.alert("Erro", "Não foi possível gerar o PDF.");
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable
          style={styles.iconBtn}
          onPress={() => navigation.canGoBack() ? navigation.goBack() : navigation.navigate("ShoppingLists")}
          hitSlop={12}
        >
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>{list.name}</Text>
        <View style={{ flexDirection: "row" }}>
          <Pressable style={styles.iconBtn} onPress={() => navigation.navigate("BarcodeScanner", { listId })}>
            <Ionicons name="barcode-outline" size={22} color={colors.textPrimary} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={handleExportPDF}>
            <Ionicons name="document-text-outline" size={22} color={colors.textPrimary} />
          </Pressable>
          <Pressable style={styles.iconBtn} onPress={handleShare}>
            <Ionicons name="share-outline" size={22} color={colors.textPrimary} />
          </Pressable>
        </View>
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
                    onPress={() => openEdit(item)}
                  >
                    <Pressable
                      style={[styles.checkbox, item.checked && styles.checkboxChecked]}
                      onPress={() => dispatch(toggleShoppingListItem({ listId, itemId: item.id, userId }))}
                      hitSlop={8}
                    >
                      {item.checked && <Ionicons name="checkmark" size={13} color="#fff" />}
                    </Pressable>
                    <Text style={[styles.itemName, item.checked && styles.itemChecked]} numberOfLines={1}>{item.name}</Text>
                    <Text style={[styles.itemQty, item.checked && styles.itemChecked]}>{item.quantity} {item.unit}</Text>
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

      {/* Modal adicionar/editar — pickers inline (iOS não suporta dois Modals abertos) */}
      <Modal visible={addOpen} transparent animationType="slide" onRequestClose={() => { resetForm(); setAddOpen(false); }}>
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{ flex: 1 }}>
          <Pressable style={styles.backdrop} onPress={() => { Keyboard.dismiss(); resetForm(); setAddOpen(false); }} />
          <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
          <View style={styles.sheet}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>{editingItem ? "Editar item" : "Adicionar item"}</Text>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.fieldLabel}>Nome</Text>
              <TextInput
                style={styles.input}
                placeholder="Ex.: Maçã"
                placeholderTextColor={colors.textMuted}
                value={fName}
                onChangeText={setFName}
                autoFocus
                returnKeyType="next"
                onSubmitEditing={() => qtyRef.current?.focus()}
                submitBehavior="submit"
              />
              <View style={styles.rowGap}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Quantidade</Text>
                  <TextInput
                    ref={qtyRef}
                    style={styles.input}
                    placeholder="0"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={fQty}
                    onChangeText={setFQty}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.fieldLabel}>Unidade</Text>
                  <Pressable
                    style={[styles.input, styles.pickerBtn, unitPickerOpen && { borderColor: colors.primary }]}
                    onPress={() => { setUnitPickerOpen(o => !o); setCatPickerOpen(false); Keyboard.dismiss(); }}
                  >
                    <Text style={styles.pickerBtnText} numberOfLines={1}>{fUnit}</Text>
                    <Ionicons name={unitPickerOpen ? "chevron-up" : "chevron-down"} size={15} color={colors.textMuted} />
                  </Pressable>
                  {unitPickerOpen && (
                    <ScrollView style={styles.inlineList} nestedScrollEnabled showsVerticalScrollIndicator={false}>
                      {UNITS.map((u) => (
                        <Pressable key={u} style={styles.inlineItem} onPress={() => { setFUnit(u); setUnitPickerOpen(false); }}>
                          <Text style={[styles.inlineItemText, fUnit === u && { color: colors.primary, fontWeight: "700" }]}>{u}</Text>
                          {fUnit === u && <Ionicons name="checkmark" size={14} color={colors.primary} />}
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}
                </View>
              </View>
              <Text style={styles.fieldLabel}>Categoria</Text>
              <Pressable
                style={[styles.input, styles.pickerBtn, catPickerOpen && { borderColor: colors.primary }]}
                onPress={() => { setCatPickerOpen(o => !o); setUnitPickerOpen(false); Keyboard.dismiss(); }}
              >
                <Text style={styles.pickerBtnText}>{fCategory}</Text>
                <Ionicons name={catPickerOpen ? "chevron-up" : "chevron-down"} size={15} color={colors.textMuted} />
              </Pressable>
              {catPickerOpen && (
                <View style={[styles.inlineList, { maxHeight: 260 }]}>
                  <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false}>
                    {/* categorias padrão */}
                    {CATEGORIES.map((c) => (
                      <Pressable key={c.key} style={styles.inlineItem} onPress={() => { setFCategory(c.key); setCatPickerOpen(false); setAddingNewCat(false); }}>
                        <Text style={[styles.inlineItemText, fCategory === c.key && { color: colors.primary, fontWeight: "700" }]}>{c.emoji}  {c.key}</Text>
                        {fCategory === c.key && <Ionicons name="checkmark" size={14} color={colors.primary} />}
                      </Pressable>
                    ))}
                    {/* categorias customizadas */}
                    {(list.customCategories ?? []).length > 0 && (
                      <View style={styles.catSeparator}>
                        <Text style={styles.catSeparatorText}>Minhas categorias</Text>
                      </View>
                    )}
                    {(list.customCategories ?? []).map((key) => (
                      <View key={key} style={styles.inlineItem}>
                        <Pressable style={{ flex: 1 }} onPress={() => { setFCategory(key); setCatPickerOpen(false); setAddingNewCat(false); }}>
                          <Text style={[styles.inlineItemText, fCategory === key && { color: colors.primary, fontWeight: "700" }]}>🏷️  {key}</Text>
                        </Pressable>
                        {fCategory === key && <Ionicons name="checkmark" size={14} color={colors.primary} style={{ marginRight: 8 }} />}
                        <Pressable hitSlop={8} onPress={() => handleRemoveCat(key)}>
                          <Ionicons name="trash-outline" size={15} color={colors.danger} />
                        </Pressable>
                      </View>
                    ))}
                    {/* criar nova categoria */}
                    {!addingNewCat ? (
                      <Pressable style={[styles.inlineItem, { justifyContent: "center" }]} onPress={() => { setAddingNewCat(true); setTimeout(() => newCatRef.current?.focus(), 80); }}>
                        <Ionicons name="add-circle-outline" size={16} color={colors.primary} />
                        <Text style={[styles.inlineItemText, { color: colors.primary, marginLeft: 6 }]}>Nova categoria</Text>
                      </Pressable>
                    ) : (
                      <View style={[styles.inlineItem, { gap: 8 }]}>
                        <TextInput
                          ref={newCatRef}
                          style={[styles.input, { flex: 1, minHeight: 36, paddingVertical: 6 }]}
                          placeholder="Nome da categoria"
                          placeholderTextColor={colors.textMuted}
                          value={newCatName}
                          onChangeText={setNewCatName}
                          returnKeyType="done"
                          onSubmitEditing={handleConfirmNewCat}
                          submitBehavior="submit"
                        />
                        <Pressable style={styles.confirmBtn} onPress={handleConfirmNewCat}>
                          <Text style={[styles.confirmBtnText, { paddingHorizontal: 12 }]}>OK</Text>
                        </Pressable>
                        <Pressable onPress={() => { setAddingNewCat(false); setNewCatName(""); }} hitSlop={8}>
                          <Ionicons name="close" size={18} color={colors.textMuted} />
                        </Pressable>
                      </View>
                    )}
                  </ScrollView>
                </View>
              )}
              <View style={styles.modalActions}>
                <Pressable style={styles.cancelBtn} onPress={() => { resetForm(); setAddOpen(false); }}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </Pressable>
                <Pressable style={styles.confirmBtn} onPress={handleSaveItem}>
                  <Text style={styles.confirmBtnText}>{editingItem ? "Salvar" : "Adicionar"}</Text>
                </Pressable>
              </View>
            </ScrollView>
          </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
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

