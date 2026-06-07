import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import { useDispatch } from "react-redux";

import { API_URL } from "../../services/api";
import { getAuth } from "../../storage/authStorage";
import { updateRecipe } from "../../store/slices/recipesSlice";
import { normalizeRecipe } from "../../utils/normalizeRecipe";
import { pickImage, uploadImage } from "../../services/imageService";
import { colors } from "../../theme/colors";

const CATEGORIES = ["Café da manhã", "Almoço", "Lanche", "Jantar", "Sobremesa", "Outro"];
const UNITS = [
  "g", "kg", "ml", "l", "xícara", "colher de sopa",
  "colher de chá", "unidade", "dente", "pitada", "a gosto",
  "fatia", "folha", "ramo",
];

interface IngredientField { id: string; name: string; quantity: string; unit: string; }
interface StepField { id: string; description: string; hasTimer: boolean; }

export default function EditRecipeScreen({ navigation, route }: any) {
  const { recipeId } = route.params;
  const dispatch = useDispatch();

  const [loading,   setLoading]   = useState(true);
  const [saving,    setSaving]    = useState(false);
  const [uploading, setUploading] = useState(false);

  // Campos
  const [imageUri,  setImageUri]  = useState<string | null>(null);
  const [imageUrl,  setImageUrl]  = useState<string>("");
  const [isPublic,  setIsPublic]  = useState(false);
  const [title,     setTitle]     = useState("");
  const [category,  setCategory]  = useState("Outro");
  const [prepTime,  setPrepTime]  = useState("");
  const [servings,  setServings]  = useState("");
  const [ingredients, setIngredients] = useState<IngredientField[]>([]);
  const [steps,       setSteps]       = useState<StepField[]>([]);

  // Picker modal
  const [unitPickerFor, setUnitPickerFor] = useState<string | null>(null);

  useEffect(() => { loadRecipe(); }, []);

  async function loadRecipe() {
    try {
      const auth = await getAuth();
      if (!auth) return;
      const response = await fetch(`${API_URL}/recipes/${recipeId}`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erro ao carregar receita");

      setTitle(data.title ?? "");
      setPrepTime(String(data.prepTimeMinutes ?? ""));
      setServings(String(data.servings ?? ""));
      setCategory(data.category ?? "Outro");
      setIsPublic(data.isPublic ?? false);
      setImageUrl(data.imageUrl ?? "");
      setIngredients(
        (data.ingredients ?? []).map((i: any) => ({
          id: i.id ?? i._id ?? Date.now().toString() + Math.random(),
          name: i.name ?? "",
          quantity: i.quantity != null ? String(i.quantity) : "",
          unit: UNITS.includes(i.unit) ? i.unit : UNITS[0],
        }))
      );
      setSteps(
        (data.steps ?? []).map((s: any) => ({
          id: s.id ?? s._id ?? Date.now().toString() + Math.random(),
          description: s.description ?? "",
          hasTimer: s.hasTimer ?? false,
        }))
      );
    } catch (error) {
      Alert.alert("Erro", "Não foi possível carregar a receita.", [
        { text: "OK", onPress: () => navigation.goBack() },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // ── Imagem ────────────────────────────────────────────────────────────────
  async function handlePickImage() {
    const uri = await pickImage();
    if (!uri) return;
    setImageUri(uri);
    try {
      setUploading(true);
      const result = await uploadImage(uri);
      setImageUrl(result.url);
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Falha ao fazer upload da imagem.");
      setImageUri(null);
    } finally {
      setUploading(false);
    }
  }

  // ── Ingredientes ──────────────────────────────────────────────────────────
  function addIngredient() {
    setIngredients((a) => [...a, { id: Date.now().toString() + Math.random(), name: "", quantity: "", unit: UNITS[0] }]);
  }
  function removeIngredient(id: string) {
    if (ingredients.length === 1) { Alert.alert("Atenção", "Precisa de pelo menos 1 ingrediente."); return; }
    setIngredients((a) => a.filter((i) => i.id !== id));
  }
  function updateIngredient(id: string, patch: Partial<IngredientField>) {
    setIngredients((a) => a.map((i) => i.id === id ? { ...i, ...patch } : i));
  }

  // ── Passos ────────────────────────────────────────────────────────────────
  function addStep() {
    setSteps((a) => [...a, { id: Date.now().toString() + Math.random(), description: "", hasTimer: false }]);
  }
  function removeStep(id: string) {
    if (steps.length === 1) { Alert.alert("Atenção", "Precisa de pelo menos 1 passo."); return; }
    setSteps((a) => a.filter((s) => s.id !== id));
  }
  function updateStep(id: string, patch: Partial<StepField>) {
    setSteps((a) => a.map((s) => s.id === id ? { ...s, ...patch } : s));
  }

  // ── Salvar ────────────────────────────────────────────────────────────────
  async function handleSave() {
    if (!title.trim() || !prepTime || !servings) { Alert.alert("Atenção", "Preencha título, tempo e porções."); return; }
    if (uploading) { Alert.alert("Aguarde", "A imagem ainda está sendo enviada."); return; }

    const validIngredients = ingredients.filter((i) => i.name && i.quantity && i.unit);
    const validSteps = steps.filter((s) => s.description.trim());
    if (validIngredients.length === 0) { Alert.alert("Atenção", "Adicione ingredientes válidos."); return; }
    if (validSteps.length === 0) { Alert.alert("Atenção", "Adicione passos válidos."); return; }

    try {
      setSaving(true);
      const auth = await getAuth();
      if (!auth) { Alert.alert("Erro", "Sessão expirada."); return; }

      const response = await fetch(`${API_URL}/recipes/${recipeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.accessToken}` },
        body: JSON.stringify({
          title: title.trim(),
          category,
          prepTimeMinutes: Number(prepTime),
          servings: Number(servings),
          isPublic,
          imageUrl,
          ingredients: validIngredients.map((i, idx) => ({
            id: i.id ?? `${Date.now()}-ingredient-${idx}`,
            name: i.name, quantity: Number(i.quantity), unit: i.unit,
          })),
          steps: validSteps.map((s, idx) => ({
            id: s.id ?? `${Date.now()}-step-${idx}`,
            description: s.description, hasTimer: s.hasTimer, duration: null,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erro ao salvar receita");
      dispatch(updateRecipe(normalizeRecipe(data)));
      Alert.alert("Sucesso", "Receita atualizada!", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Erro ao salvar receita.");
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Carregando receita...</Text>
      </View>
    );
  }

  const displayImage = imageUri || imageUrl || null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Editar Receita</Text>
        <View style={styles.headerBtn} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Upload de imagem */}
          <Pressable style={styles.imagePicker} onPress={handlePickImage} disabled={uploading}>
            {displayImage ? (
              <>
                <Image source={{ uri: displayImage }} style={styles.imagePreview} />
                {uploading && (
                  <View style={styles.imageOverlay}>
                    <Text style={styles.imageOverlayText}>Enviando...</Text>
                  </View>
                )}
                <Pressable style={styles.imageChangeBtn} onPress={handlePickImage}>
                  <Ionicons name="camera" size={16} color="#fff" />
                  <Text style={styles.imageChangeBtnText}>Alterar</Text>
                </Pressable>
              </>
            ) : (
              <View style={styles.imagePlaceholder}>
                <View style={styles.imageIconWrap}>
                  <Ionicons name="camera-outline" size={28} color={colors.primary} />
                </View>
                <Text style={styles.imageTitle}>{uploading ? "Enviando imagem..." : "Adicionar foto"}</Text>
                <Text style={styles.imageHint}>Toque para escolher da galeria</Text>
              </View>
            )}
          </Pressable>

          {/* Toggle pública */}
          <View style={[styles.card, { marginTop: 16 }]}>
            <View style={styles.toggleRow}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <Text style={styles.toggleTitle}>Receita pública</Text>
                <Text style={styles.toggleHint}>Outros usuários podem encontrar esta receita</Text>
              </View>
              <Switch value={isPublic} onValueChange={setIsPublic} trackColor={{ false: colors.border, true: colors.primary }} thumbColor="#fff" />
            </View>
          </View>

          {/* Informações básicas */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>INFORMAÇÕES BÁSICAS</Text>
          </View>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Título</Text>
            <TextInput style={styles.input} placeholder="Ex: Strogonoff de frango" placeholderTextColor={colors.textMuted} value={title} onChangeText={setTitle} returnKeyType="next" />

            <Text style={styles.fieldLabel}>Categoria</Text>
            <View style={styles.chipsWrap}>
              {CATEGORIES.map((c) => (
                <Pressable key={c} style={[styles.chip, category === c && styles.chipActive]} onPress={() => setCategory(c)}>
                  <Text style={[styles.chipText, category === c && styles.chipTextActive]}>{c}</Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.rowGap}>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Tempo (min)</Text>
                <TextInput style={styles.input} placeholder="30" placeholderTextColor={colors.textMuted} keyboardType="numeric" value={prepTime} onChangeText={setPrepTime} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.fieldLabel}>Porções</Text>
                <TextInput style={styles.input} placeholder="4" placeholderTextColor={colors.textMuted} keyboardType="numeric" value={servings} onChangeText={setServings} />
              </View>
            </View>
          </View>

          {/* Ingredientes */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>INGREDIENTES</Text>
            <Pressable style={styles.addBtn} onPress={addIngredient}>
              <Feather name="plus" size={15} color={colors.primary} />
              <Text style={styles.addBtnText}>Adicionar</Text>
            </Pressable>
          </View>
          <View style={styles.card}>
            {ingredients.map((ing, idx) => (
              <View key={ing.id} style={[styles.ingredientItem, idx < ingredients.length - 1 && styles.itemDivider]}>
                <View style={styles.ingredientGrid}>
                  <TextInput
                    style={[styles.input, { flex: 0.9 }]}
                    placeholder="Qtd"
                    placeholderTextColor={colors.textMuted}
                    keyboardType="numeric"
                    value={ing.quantity}
                    onChangeText={(v) => updateIngredient(ing.id, { quantity: v })}
                  />
                  <Pressable
                    style={[styles.input, styles.selectInput, { flex: 1.4 }]}
                    onPress={() => setUnitPickerFor(ing.id)}
                  >
                    <Text style={[styles.selectText, !ing.unit && { color: colors.textMuted }]} numberOfLines={1}>
                      {ing.unit || "Unidade"}
                    </Text>
                    <Feather name="chevron-down" size={15} color={colors.textMuted} />
                  </Pressable>
                  <Pressable style={styles.trashBtn} onPress={() => removeIngredient(ing.id)}>
                    <Feather name="trash-2" size={16} color={colors.danger} />
                  </Pressable>
                </View>
                <TextInput
                  style={[styles.input, { marginTop: 8 }]}
                  placeholder="Nome do ingrediente"
                  placeholderTextColor={colors.textMuted}
                  value={ing.name}
                  onChangeText={(v) => updateIngredient(ing.id, { name: v })}
                />
              </View>
            ))}
          </View>

          {/* Passos */}
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionLabel}>MODO DE PREPARO</Text>
            <Pressable style={styles.addBtn} onPress={addStep}>
              <Feather name="plus" size={15} color={colors.primary} />
              <Text style={styles.addBtnText}>Adicionar</Text>
            </Pressable>
          </View>
          {steps.map((step, idx) => (
            <View key={step.id} style={[styles.card, { marginBottom: 10 }]}>
              <View style={styles.stepHeader}>
                <View style={styles.stepNumber}><Text style={styles.stepNumberText}>{idx + 1}</Text></View>
                <Text style={styles.stepTitle}>Passo {idx + 1}</Text>
                <Pressable style={styles.trashBtn} onPress={() => removeStep(step.id)}>
                  <Feather name="trash-2" size={16} color={colors.danger} />
                </Pressable>
              </View>
              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Descreva o passo..."
                placeholderTextColor={colors.textMuted}
                value={step.description}
                onChangeText={(v) => updateStep(step.id, { description: v })}
                multiline
                textAlignVertical="top"
              />
              <View style={styles.timerToggleRow}>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="time-outline" size={18} color={colors.textSecondary} />
                  <View>
                    <Text style={styles.toggleTitle}>Tem timer?</Text>
                    <Text style={styles.toggleHint}>Definido na hora de cozinhar</Text>
                  </View>
                </View>
                <Switch
                  value={step.hasTimer}
                  onValueChange={(v) => updateStep(step.id, { hasTimer: v })}
                  trackColor={{ false: colors.border, true: colors.primary }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      {/* CTA fixo */}
      <View style={styles.ctaBar}>
        <Pressable
          style={[styles.ctaBtn, (saving || uploading) && { opacity: 0.7 }]}
          onPress={handleSave}
          disabled={saving || uploading}
        >
          <Feather name="check" size={18} color="#fff" />
          <Text style={styles.ctaBtnText}>
            {saving ? "Salvando..." : uploading ? "Enviando imagem..." : "Salvar alterações"}
          </Text>
        </Pressable>
      </View>

      {/* Modal unidade */}
      <Modal visible={!!unitPickerFor} transparent animationType="slide" onRequestClose={() => setUnitPickerFor(null)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setUnitPickerFor(null)} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Selecionar unidade</Text>
          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            {UNITS.map((u) => (
              <Pressable
                key={u}
                style={styles.modalOption}
                onPress={() => { if (unitPickerFor) updateIngredient(unitPickerFor, { unit: u }); setUnitPickerFor(null); }}
              >
                <Text style={styles.modalOptionText}>{u}</Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background, gap: 16 },
  loadingText: { fontSize: 15, color: colors.textSecondary },
  header: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  headerBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },
  container: { paddingHorizontal: 16, paddingBottom: 40 },

  // Imagem
  imagePicker: { marginTop: 16, borderRadius: 16, borderWidth: 2, borderColor: colors.primary, borderStyle: "dashed", backgroundColor: colors.primaryLight + "40", minHeight: 160, overflow: "hidden" },
  imagePreview: { width: "100%", height: 200 },
  imageOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" },
  imageOverlayText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  imageChangeBtn: { position: "absolute", bottom: 10, right: 10, flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  imageChangeBtnText: { color: "#fff", fontSize: 13, fontWeight: "600" },
  imagePlaceholder: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 32 },
  imageIconWrap: { width: 56, height: 56, borderRadius: 28, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  imageTitle: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
  imageHint: { fontSize: 13, color: colors.textSecondary, marginTop: 2 },

  // Card
  card: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16, marginBottom: 4 },
  toggleRow: { flexDirection: "row", alignItems: "center" },
  toggleTitle: { fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  toggleHint: { fontSize: 12, color: colors.textSecondary, marginTop: 1 },
  sectionHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20, marginBottom: 8 },
  sectionLabel: { fontSize: 12, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.8 },
  fieldLabel: { fontSize: 13, fontWeight: "600", color: colors.textPrimary, marginBottom: 6, marginTop: 4 },
  input: { backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 14, paddingVertical: Platform.OS === "ios" ? 12 : 10, fontSize: 15, color: colors.textPrimary },
  textarea: { minHeight: 90, textAlignVertical: "top" },
  rowGap: { flexDirection: "row", gap: 12, marginTop: 4 },
  chipsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginBottom: 12 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
  chipText: { color: colors.textSecondary, fontSize: 13, fontWeight: "500" },
  chipTextActive: { color: colors.primaryDark, fontWeight: "700" },
  addBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, backgroundColor: colors.primaryLight },
  addBtnText: { color: colors.primary, fontWeight: "700", fontSize: 13 },
  ingredientItem: { paddingVertical: 10 },
  itemDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
  ingredientGrid: { flexDirection: "row", gap: 8, alignItems: "center" },
  selectInput: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  selectText: { color: colors.textPrimary, fontSize: 14, flex: 1 },
  trashBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#FEF2F2", alignItems: "center", justifyContent: "center" },
  stepHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  stepNumber: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center" },
  stepNumberText: { color: "#fff", fontWeight: "700", fontSize: 13 },
  stepTitle: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.textPrimary },
  timerToggleRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },

  // CTA
  ctaBar: { position: "absolute", left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === "ios" ? 32 : 16, backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border },
  ctaBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12 },
  ctaBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  // Modal unidade
  modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
  modalSheet: { backgroundColor: colors.surface, borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingHorizontal: 16, paddingBottom: 32, paddingTop: 12 },
  modalHandle: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, backgroundColor: colors.border, marginBottom: 12 },
  modalTitle: { fontSize: 16, fontWeight: "700", color: colors.textPrimary, marginBottom: 12 },
  modalOption: { paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalOptionText: { fontSize: 15, color: colors.textPrimary },
});