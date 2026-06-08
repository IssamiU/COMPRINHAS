import React, { useMemo, useState, useEffect } from "react";
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  TouchableWithoutFeedback,
  Keyboard,
} from "react-native";
import { useDispatch } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as LocalAuthentication from "expo-local-authentication";
import { Ionicons } from "@expo/vector-icons";

import { signIn } from "../../store/slices/authSlice";
import { saveAuth } from "../../storage/authStorage";
import { API_URL } from "../../services/api";
// RF23 — cores reativas ao tema claro/escuro
import { useTheme } from "../../theme/ThemeContext";

// RF2 — chaves AsyncStorage para biometria
const BIOMETRIC_ENABLED_KEY = "@mealsync:biometricEnabled";
const LAST_CREDENTIALS_KEY  = "@mealsync:lastCredentials";

export default function LoginScreen({ navigation }: any) {
  const { colors } = useTheme();
  const dispatch = useDispatch();

  const [email,           setEmail]           = useState("");
  const [password,        setPassword]        = useState("");
  const [biometricReady,  setBiometricReady]  = useState(false);

  // RF2 — verificar suporte a biometria no mount
  useEffect(() => {
    async function checkBiometric() {
      const hasHardware = await LocalAuthentication.hasHardwareAsync();
      const isEnrolled  = await LocalAuthentication.isEnrolledAsync();
      const enabled     = await AsyncStorage.getItem(BIOMETRIC_ENABLED_KEY);
      setBiometricReady(hasHardware && isEnrolled && enabled === "true");
    }
    checkBiometric();
  }, []);

  async function doLogin(credentials: { email: string; password: string }) {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email:    credentials.email.trim().toLowerCase(),
        password: credentials.password,
      }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || "Erro ao fazer login");
    return { user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken };
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      Alert.alert("Atenção", "Preencha e-mail e senha.");
      return;
    }
    try {
      const authData = await doLogin({ email, password });
      // RF2 — salvar credenciais para uso futuro com biometria
      await AsyncStorage.setItem(LAST_CREDENTIALS_KEY,  JSON.stringify({ email: email.trim().toLowerCase(), password }));
      await AsyncStorage.setItem(BIOMETRIC_ENABLED_KEY, "true");
      await saveAuth(authData);
      dispatch(signIn(authData));
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Não foi possível conectar ao servidor.");
    }
  }

  // RF2 — login via biometria
  async function handleBiometricLogin() {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage:         "Confirme sua identidade",
        fallbackLabel:         "Usar senha",
        cancelLabel:           "Cancelar",
        disableDeviceFallback: false,
      });
      if (!result.success) return;
      const raw = await AsyncStorage.getItem(LAST_CREDENTIALS_KEY);
      if (!raw) {
        Alert.alert("Atenção", "Faça login com e-mail e senha primeiro para ativar a biometria.");
        return;
      }
      const credentials = JSON.parse(raw) as { email: string; password: string };
      const authData = await doLogin(credentials);
      await saveAuth(authData);
      dispatch(signIn(authData));
    } catch (error: any) {
      Alert.alert("Erro", error.message || "Falha na autenticação biométrica.");
    }
  }

  const styles = useMemo(() => StyleSheet.create({
    container:           { flex: 1, backgroundColor: colors.background },
    scrollContainer:     { flexGrow: 1, justifyContent: "center", padding: 24 },
    card:                { borderRadius: 20, padding: 24 },
    logo:                { width: 100, height: 100, alignSelf: "center", marginBottom: 16, resizeMode: "contain" },
    title:               { fontSize: 28, fontWeight: "700", textAlign: "center", marginBottom: 10, color: colors.textPrimary },
    subtitle:            { fontSize: 15, textAlign: "center", color: colors.textSecondary, lineHeight: 22, marginBottom: 24 },
    input:               { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 12, padding: 14, marginBottom: 14, color: colors.textPrimary },
    forgotButton:        { alignSelf: "flex-end", marginBottom: 16, marginTop: -4 },
    forgotButtonText:    { color: colors.primary, fontSize: 13, fontWeight: "600" },
    primaryButton:       { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center", marginBottom: 10 },
    primaryButtonText:   { color: "#ffffff", fontSize: 16, fontWeight: "700" },
    biometricButton:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 12, paddingVertical: 14, marginBottom: 10, borderWidth: 1, borderColor: colors.primary, backgroundColor: colors.surface },
    biometricButtonText: { color: colors.primary, fontSize: 16, fontWeight: "600" },
    secondaryButton:     { backgroundColor: colors.surface, borderRadius: 12, paddingVertical: 14, alignItems: "center", borderWidth: 1, borderColor: colors.border },
    secondaryButtonText: { color: colors.textPrimary, fontSize: 16, fontWeight: "700" },
  }), [colors]);

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === "ios" ? "padding" : "height"}>
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <View style={styles.card}>
            <Image source={require("../../../assets/images/compras.png")} style={styles.logo} />
            <Text style={styles.title}>MealSync</Text>
            <Text style={styles.subtitle}>Organize suas receitas, seu planejamento e sua lista de compras.</Text>

            <TextInput
              style={styles.input}
              placeholder="E-mail"
              placeholderTextColor={colors.textSecondary}
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              returnKeyType="next"
              accessibilityLabel="Campo de e-mail"
            />
            <TextInput
              style={styles.input}
              placeholder="Senha"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              value={password}
              onChangeText={setPassword}
              returnKeyType="done"
              onSubmitEditing={handleLogin}
              accessibilityLabel="Campo de senha"
            />

            {/* RF29 — link para recuperação de senha */}
            <Pressable style={styles.forgotButton} onPress={() => navigation.navigate("ForgotPassword")} accessibilityLabel="Esqueceu a senha" accessibilityRole="button">
              <Text style={styles.forgotButtonText}>Esqueceu a senha?</Text>
            </Pressable>

            <Pressable style={styles.primaryButton} onPress={handleLogin} accessibilityLabel="Entrar com e-mail e senha" accessibilityRole="button">
              <Text style={styles.primaryButtonText}>Entrar</Text>
            </Pressable>

            {/* RF2 — botão de biometria (exibido apenas se disponível e habilitado) */}
            {biometricReady && (
              <Pressable style={styles.biometricButton} onPress={handleBiometricLogin} accessibilityLabel="Entrar com biometria" accessibilityRole="button">
                <Ionicons name="finger-print" size={22} color={colors.primary} />
                <Text style={styles.biometricButtonText}>Entrar com biometria</Text>
              </Pressable>
            )}

            <Pressable style={styles.secondaryButton} onPress={() => navigation.navigate("Register")} accessibilityLabel="Ir para tela de cadastro" accessibilityRole="button">
              <Text style={styles.secondaryButtonText}>Ir para cadastro</Text>
            </Pressable>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
