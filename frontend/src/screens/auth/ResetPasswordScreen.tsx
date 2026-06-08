import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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

export default function ResetPasswordScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [token, setToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleReset() {
    if (!token.trim()) { Alert.alert("Atenção", "Cole o código recebido por e-mail."); return; }
    if (newPassword.length < 6) { Alert.alert("Atenção", "A senha deve ter pelo menos 6 caracteres."); return; }
    if (newPassword !== confirmPassword) { Alert.alert("Atenção", "As senhas não coincidem."); return; }
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/auth/reset-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: token.trim(), newPassword }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erro ao redefinir senha.");
      Alert.alert("Senha redefinida!", "Sua senha foi atualizada com sucesso. Faça login com a nova senha.", [
        { text: "OK", onPress: () => navigation.navigate("Login") },
      ]);
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Não foi possível redefinir a senha.");
    } finally {
      setLoading(false);
    }
  }

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { flexGrow: 1, justifyContent: "center", padding: 24 },
    card: { backgroundColor: colors.surface, borderRadius: 20, padding: 24 },
    title: { fontSize: 24, fontWeight: "700", color: colors.textPrimary, marginBottom: 10, textAlign: "center" },
    subtitle: { fontSize: 15, color: colors.textSecondary, lineHeight: 22, textAlign: "center", marginBottom: 20 },
    label: { fontWeight: "700", color: colors.textPrimary, fontSize: 14, marginBottom: 6 },
    input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 16, color: colors.textPrimary, fontSize: 15 },
    primaryButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginBottom: 12, marginTop: 4 },
    primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    buttonDisabled: { opacity: 0.6 },
    secondaryButton: { backgroundColor: colors.surfaceAlt, borderRadius: 12, paddingVertical: 15, alignItems: "center" },
    secondaryButtonText: { color: colors.textSecondary, fontWeight: "700", fontSize: 15 },
  }), [colors]);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Nova senha</Text>
          <Text style={styles.subtitle}>Cole o código recebido por e-mail e defina sua nova senha.</Text>

          <Text style={styles.label}>Código de recuperação</Text>
          <TextInput style={styles.input} placeholder="Cole o código aqui" placeholderTextColor={colors.textSecondary} value={token} onChangeText={(text) => setToken(text.trim())} autoCapitalize="none" autoCorrect={false} spellCheck={false} returnKeyType="next" />

          <Text style={styles.label}>Nova senha</Text>
          <TextInput style={styles.input} placeholder="Mínimo 6 caracteres" placeholderTextColor={colors.textSecondary} value={newPassword} onChangeText={setNewPassword} secureTextEntry returnKeyType="next" />

          <Text style={styles.label}>Confirmar senha</Text>
          <TextInput style={styles.input} placeholder="Repita a nova senha" placeholderTextColor={colors.textSecondary} value={confirmPassword} onChangeText={setConfirmPassword} secureTextEntry returnKeyType="done" onSubmitEditing={handleReset} />

          <Pressable style={[styles.primaryButton, loading && styles.buttonDisabled]} onPress={handleReset} disabled={loading} accessibilityRole="button" accessibilityLabel="Redefinir senha">
            <Text style={styles.primaryButtonText}>{loading ? "Salvando..." : "Redefinir senha"}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate("ForgotPassword")} accessibilityRole="button" accessibilityLabel="Reenviar código de recuperação">
            <Text style={styles.secondaryButtonText}>Reenviar código</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
