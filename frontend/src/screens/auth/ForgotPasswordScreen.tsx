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

export default function ForgotPasswordScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    if (!email.trim()) { Alert.alert("Atenção", "Digite seu e-mail."); return; }
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/auth/forgot-password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || "Erro ao enviar e-mail.");
      setSent(true);
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Não foi possível enviar o e-mail.");
    } finally {
      setLoading(false);
    }
  }

  const styles = useMemo(() => StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    scrollContent: { flexGrow: 1, justifyContent: "center", padding: 24 },
    card: { backgroundColor: colors.surface, borderRadius: 20, padding: 24 },
    successIcon: { fontSize: 48, textAlign: "center", marginBottom: 16 },
    title: { fontSize: 24, fontWeight: "700", color: colors.textPrimary, marginBottom: 10, textAlign: "center" },
    subtitle: { fontSize: 15, color: colors.textSecondary, lineHeight: 22, textAlign: "center", marginBottom: 8 },
    hint: { fontSize: 13, color: colors.textSecondary, textAlign: "center", marginBottom: 24 },
    input: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 16, marginTop: 8, color: colors.textPrimary, fontSize: 15 },
    primaryButton: { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 15, alignItems: "center", marginBottom: 12 },
    primaryButtonText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    buttonDisabled: { opacity: 0.6 },
    secondaryButton: { backgroundColor: colors.surfaceAlt, borderRadius: 12, paddingVertical: 15, alignItems: "center" },
    secondaryButtonText: { color: colors.textSecondary, fontWeight: "700", fontSize: 15 },
  }), [colors]);

  if (sent) {
    return (
      <View style={styles.container}>
        <View style={[styles.scrollContent, { justifyContent: "center" }]}>
          <View style={styles.card}>
            <Text style={styles.successIcon}>📧</Text>
            <Text style={styles.title}>E-mail enviado</Text>
            <Text style={styles.subtitle}>Se este e-mail estiver cadastrado, você receberá um código de recuperação em breve.</Text>
            <Text style={styles.hint}>Verifique sua caixa de entrada e spam.</Text>
            <Pressable style={styles.primaryButton} onPress={() => navigation.navigate("ResetPassword")} accessibilityRole="button" accessibilityLabel="Inserir código de recuperação">
              <Text style={styles.primaryButtonText}>Inserir código</Text>
            </Pressable>
            <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate("Login")} accessibilityRole="button" accessibilityLabel="Voltar ao login">
              <Text style={styles.secondaryButtonText}>Voltar ao login</Text>
            </Pressable>
          </View>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <Text style={styles.title}>Esqueceu a senha?</Text>
          <Text style={styles.subtitle}>Digite seu e-mail cadastrado e enviaremos um código para redefinir sua senha.</Text>
          <TextInput
            style={styles.input}
            placeholder="Seu e-mail"
            placeholderTextColor={colors.textSecondary}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="send"
            onSubmitEditing={handleSend}
          />
          <Pressable style={[styles.primaryButton, loading && styles.buttonDisabled]} onPress={handleSend} disabled={loading} accessibilityRole="button" accessibilityLabel="Enviar código de recuperação">
            <Text style={styles.primaryButtonText}>{loading ? "Enviando..." : "Enviar código"}</Text>
          </Pressable>
          <Pressable style={styles.secondaryButton} onPress={() => navigation.goBack()} accessibilityRole="button" accessibilityLabel="Voltar ao login">
            <Text style={styles.secondaryButtonText}>Voltar ao login</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
