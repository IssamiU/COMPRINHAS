import React, { useMemo, useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { API_URL } from "../../services/api";
// RF23 — cores reativas ao tema claro/escuro
import { useTheme } from "../../theme/ThemeContext";

export default function RegisterScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [vegetarian, setVegetarian] = useState(false);
  const [glutenFree, setGlutenFree] = useState(false);
  const [lactoseFree, setLactoseFree] = useState(false);

  async function handleRegister() {
    if (!name.trim() || !email.trim() || !password.trim()) {
      Alert.alert("Atenção", "Preencha nome, e-mail e senha.");
      return;
    }
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          password,
          vegetarian,
          gluten_free: glutenFree,
          lactose_free: lactoseFree,
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        Alert.alert("Erro", data?.message || "Erro ao cadastrar");
        return;
      }
      Alert.alert("Sucesso", "Cadastro realizado com sucesso!");
      navigation.goBack();
    } catch (error) {
      Alert.alert("Erro", "Não foi possível conectar ao servidor.");
    }
  }

  const styles = useMemo(() => StyleSheet.create({
    container: { flexGrow: 1, backgroundColor: colors.background, justifyContent: "center", padding: 24 },
    title: { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 10, color: colors.textPrimary },
    subtitle: { fontSize: 15, textAlign: "center", color: colors.textSecondary, lineHeight: 22, marginBottom: 24 },
    input: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 14, color: colors.textPrimary },
    sectionTitle: { fontSize: 18, fontWeight: "700", marginBottom: 12, marginTop: 4, color: colors.textPrimary },
    optionButton: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, marginBottom: 10 },
    optionButtonSelected: { backgroundColor: colors.primaryLight, borderColor: colors.primary },
    optionText: { fontSize: 15, color: colors.textPrimary, fontWeight: "500" },
    optionTextSelected: { color: colors.primaryDark, fontWeight: "700" },
    primaryButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginTop: 12, marginBottom: 10 },
    primaryButtonText: { color: "#ffffff", fontSize: 16, fontWeight: "700" },
    secondaryButton: { backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: colors.border },
    secondaryButtonText: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
  }), [colors]);

  function ToggleOption({ label, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
    return (
      <Pressable style={[styles.optionButton, selected && styles.optionButtonSelected]} onPress={onPress} accessibilityRole="checkbox" accessibilityLabel={label} accessibilityState={{ checked: selected }}>
        <Text style={[styles.optionText, selected && styles.optionTextSelected]}>
          {selected ? "✓ " : ""}{label}
        </Text>
      </Pressable>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View>
        <Text style={styles.title}>Criar conta</Text>
        <Text style={styles.subtitle}>Cadastre-se para organizar receitas, planejamento e compras.</Text>

        <TextInput style={styles.input} placeholder="Nome" placeholderTextColor={colors.textSecondary} value={name} onChangeText={setName} />
        <TextInput style={styles.input} placeholder="E-mail" placeholderTextColor={colors.textSecondary} autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <TextInput style={styles.input} placeholder="Senha" placeholderTextColor={colors.textSecondary} secureTextEntry value={password} onChangeText={setPassword} />

        <Text style={styles.sectionTitle}>Preferências alimentares</Text>
        <ToggleOption label="Vegetariano"  selected={vegetarian}   onPress={() => setVegetarian(!vegetarian)} />
        <ToggleOption label="Sem glúten"   selected={glutenFree}   onPress={() => setGlutenFree(!glutenFree)} />
        <ToggleOption label="Sem lactose"  selected={lactoseFree}  onPress={() => setLactoseFree(!lactoseFree)} />

        <Pressable style={styles.primaryButton} onPress={handleRegister} accessibilityRole="button" accessibilityLabel="Criar conta">
          <Text style={styles.primaryButtonText}>Cadastrar</Text>
        </Pressable>
        <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Voltar para login">
          <Text style={styles.secondaryButtonText}>Voltar para login</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
