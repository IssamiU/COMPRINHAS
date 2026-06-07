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
import { colors } from "../../theme/colors";

const DIETS        = ["Onívoro", "Vegetariano", "Vegano", "Pescetariano", "Low Carb", "Cetogênica"];
const RESTRICTIONS = ["Sem glúten", "Sem lactose", "Sem açúcar", "Sem amendoim", "Sem frutos do mar", "Sem ovo", "Sem soja"];
const DISLIKES     = ["Cebola", "Coentro", "Pimenta", "Berinjela", "Quiabo", "Cogumelo"];
const GOALS        = ["Perder peso", "Ganhar massa", "Comer mais saudável", "Economizar", "Variar o cardápio"];
const SPICE        = ["Sem", "Suave", "Médio", "Forte", "Muito forte"];

function Chip({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.chip, selected && styles.chipActive]}
    >
      {selected && <Ionicons name="checkmark" size={13} color="#fff" style={{ marginRight: 4 }} />}
      <Text style={[styles.chipText, selected && styles.chipTextActive]}>{label}</Text>
    </Pressable>
  );
}

export default function FoodPreferencesScreen({ navigation }: any) {
  const [diet,         setDiet]        = useState("Vegetariano");
  const [restrictions, setRestrictions]= useState<string[]>(["Sem glúten"]);
  const [dislikes,     setDislikes]    = useState<string[]>([]);
  const [goals,        setGoals]       = useState<string[]>(["Comer mais saudável"]);
  const [spice,        setSpice]       = useState(1); // índice em SPICE

  function toggle(arr: string[], val: string, set: (v: string[]) => void) {
    set(arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  }

  function handleSave() {
    // TODO: chamar PUT /users/me/preferences quando endpoint for implementado
    Alert.alert("Sucesso", "Preferências atualizadas!", [{ text: "OK", onPress: () => navigation.goBack() }]);
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Preferências Alimentares</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Tipo de dieta */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Tipo de dieta</Text>
          <Text style={styles.blockSubtitle}>Escolha apenas uma</Text>
          <View style={styles.chipWrap}>
            {DIETS.map((d) => <Chip key={d} label={d} selected={diet === d} onPress={() => setDiet(d)} />)}
          </View>
        </View>

        {/* Restrições */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Restrições e alergias</Text>
          <Text style={styles.blockSubtitle}>As receitas filtrarão por estas restrições</Text>
          <View style={styles.chipWrap}>
            {RESTRICTIONS.map((r) => (
              <Chip key={r} label={r} selected={restrictions.includes(r)} onPress={() => toggle(restrictions, r, setRestrictions)} />
            ))}
          </View>
        </View>

        {/* Ingredientes que não gosta */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Ingredientes que não gosto</Text>
          <Text style={styles.blockSubtitle}>Vamos evitar nas sugestões</Text>
          <View style={styles.chipWrap}>
            {DISLIKES.map((d) => (
              <Chip key={d} label={d} selected={dislikes.includes(d)} onPress={() => toggle(dislikes, d, setDislikes)} />
            ))}
          </View>
        </View>

        {/* Nível de pimenta */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Nível de pimenta</Text>
          <View style={styles.spiceRow}>
            {SPICE.map((label, i) => (
              <Pressable
                key={label}
                onPress={() => setSpice(i)}
                style={[styles.spiceBtn, i === spice && styles.spiceBtnActive]}
              >
                <Text style={[styles.spiceText, i === spice && styles.spiceTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Objetivos */}
        <View style={styles.block}>
          <Text style={styles.blockTitle}>Objetivos</Text>
          <View style={styles.chipWrap}>
            {GOALS.map((g) => (
              <Chip key={g} label={g} selected={goals.includes(g)} onPress={() => toggle(goals, g, setGoals)} />
            ))}
          </View>
        </View>

        <Pressable style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Salvar Preferências</Text>
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
  spiceRow: { flexDirection: "row", gap: 8, marginTop: 8, flexWrap: "wrap" },
  spiceBtn: { paddingHorizontal: 12, height: 36, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface, alignItems: "center", justifyContent: "center" },
  spiceBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  spiceText: { fontSize: 12, fontWeight: "600", color: colors.textPrimary },
  spiceTextActive: { color: "#fff" },
  saveBtn: { height: 52, borderRadius: 14, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginTop: 8 },
  saveBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
});