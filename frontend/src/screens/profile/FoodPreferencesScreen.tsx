import React, { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store";
import { updateUser } from "../../store/slices/authSlice";
import { getAuth } from "../../storage/authStorage";
import { API_URL } from "../../services/api";
import { colors } from "../../theme/colors";

const DIETS        = ["Onívoro", "Vegetariano", "Vegano"];
const RESTRICTIONS = ["Sem glúten", "Sem lactose", "Sem açúcar", "Sem amendoim", "Sem frutos do mar", "Sem ovo", "Sem soja"];
const DISLIKES     = ["Cebola", "Coentro", "Pimenta", "Berinjela", "Quiabo", "Cogumelo"];

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, selected && styles.chipActive]}>
      {selected && <Ionicons name="checkmark" size={13} color="#fff" style={{ marginRight: 4 }} />}
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function FoodPreferencesScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const user     = useSelector((s: RootState) => s.auth.user);
  const stored   = (user?.preferences ?? {}) as Record<string, any>;

  const [diet,         setDiet]         = useState<string>(stored.diet ?? "Onívoro");
  const [restrictions, setRestrictions] = useState<string[]>(stored.restrictions ?? []);
  const [dislikes,     setDislikes]     = useState<string[]>(stored.dislikes ?? []);
  const [saving,       setSaving]       = useState(false);

  function toggle(arr: string[], val: string, set: (v: string[]) => void) {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  async function handleSave() {
    try {
      setSaving(true);
      const auth = await getAuth();
      if (!auth) return;

      const preferences = { diet, restrictions, dislikes };

      const res = await fetch(`${API_URL}/auth/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.accessToken}` },
        body: JSON.stringify({ name: user?.name ?? "", email: user?.email ?? "", preferences }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erro ao salvar");

      dispatch(updateUser({ preferences: data.user.preferences }));
      Alert.alert("Sucesso", "Preferências atualizadas!", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Não foi possível salvar.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()} accessibilityLabel="Voltar" accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Preferências Alimentares</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Tipo de dieta */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Tipo de dieta</Text>
          <Text style={styles.blockSubtitle}>Escolha apenas uma — usada para sugestões e avisos</Text>
          <View style={styles.chipWrap}>
            {DIETS.map((d) => <Chip key={d} label={d} selected={diet === d} onPress={() => setDiet(d)} />)}
          </View>
        </View>

        {/* Restrições */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Restrições e alergias</Text>
          <Text style={styles.blockSubtitle}>Será exibido aviso nas receitas que contêm esses ingredientes</Text>
          <View style={styles.chipWrap}>
            {RESTRICTIONS.map((r) => (
              <Chip key={r} label={r} selected={restrictions.includes(r)} onPress={() => toggle(restrictions, r, setRestrictions)} />
            ))}
          </View>
        </View>

        {/* Ingredientes que não gosta */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Ingredientes que não gosto</Text>
          <Text style={styles.blockSubtitle}>Receitas com esses itens terão aviso "Contém..."</Text>
          <View style={styles.chipWrap}>
            {DISLIKES.map((d) => (
              <Chip key={d} label={d} selected={dislikes.includes(d)} onPress={() => toggle(dislikes, d, setDislikes)} />
            ))}
          </View>
        </View>

        <Pressable style={[styles.saveBtn, saving && { opacity: 0.6 }]} onPress={handleSave} disabled={saving} accessibilityLabel="Salvar preferências" accessibilityRole="button">
          <Text style={styles.saveBtnText}>{saving ? "Salvando..." : "Salvar Preferências"}</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { height: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  container: { padding: 16, paddingBottom: 100, gap: 0 },
  block: { marginBottom: 28 },
  blockTitle: { fontSize: 14, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 },
  blockSubtitle: { fontSize: 12, color: colors.textMuted, marginBottom: 12 },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: { flexDirection: "row", alignItems: "center", paddingHorizontal: 14, height: 36, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 12, fontWeight: "600", color: colors.textPrimary },
  chipTextActive: { color: "#fff" },
  saveBtn: { height: 52, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
