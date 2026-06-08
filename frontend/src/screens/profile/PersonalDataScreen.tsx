import React, { useState } from "react";
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../../store";
import { updateUser } from "../../store/slices/authSlice";
import { pickImage, uploadImage } from "../../services/imageService";
import { getAuth, saveAuth } from "../../storage/authStorage";
import { API_URL } from "../../services/api";
import { colors } from "../../theme/colors";

export default function PersonalDataScreen({ navigation }: any) {
  const dispatch = useDispatch();
  const user = useSelector((s: RootState) => s.auth.user);

  function getInitials(name: string) {
    return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  }

  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [name, setName]             = useState(user?.name ?? "");
  const [email, setEmail]           = useState(user?.email ?? "");
  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass]         = useState("");
  const [saving, setSaving]           = useState(false);

  async function handlePickAvatar() {
    const uri = await pickImage();
    if (!uri) return;
    setAvatarUri(uri);
    try {
      setUploading(true);
      await uploadImage(uri);
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Falha ao enviar foto.");
      setAvatarUri(null);
    } finally {
      setUploading(false);
    }
  }

  async function handleSave() {
    if (!name.trim()) { Alert.alert("Atenção", "O nome não pode estar vazio."); return; }
    if (!email.trim()) { Alert.alert("Atenção", "O e-mail não pode estar vazio."); return; }
    if (newPass && newPass.length < 6) { Alert.alert("Atenção", "A nova senha deve ter pelo menos 6 caracteres."); return; }
    if (newPass && !currentPass) { Alert.alert("Atenção", "Digite a senha atual para alterá-la."); return; }

    try {
      setSaving(true);
      const auth = await getAuth();
      if (!auth) return;

      const body: Record<string, string> = { name: name.trim(), email: email.trim() };
      if (newPass) { body.currentPassword = currentPass; body.newPassword = newPass; }

      const res = await fetch(`${API_URL}/auth/me`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.accessToken}` },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Erro ao salvar");

      dispatch(updateUser({ name: data.user.name, email: data.user.email }));
      await saveAuth({ ...auth, user: { ...auth.user, name: data.user.name, email: data.user.email } });

      setCurrentPass("");
      setNewPass("");
      Alert.alert("Sucesso", "Dados atualizados!", [{ text: "OK", onPress: () => navigation.goBack() }]);
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Não foi possível salvar os dados.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Dados Pessoais</Text>
        <Pressable style={[styles.iconBtn, { backgroundColor: colors.primary }]} onPress={handleSave} disabled={saving}>
          <Ionicons name="checkmark" size={20} color="#fff" />
        </Pressable>
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>

          {/* Avatar */}
          <View style={styles.avatarSection}>
            <View style={styles.avatarWrap}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatarImage} />
              ) : (
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{user?.name ? getInitials(user.name) : "?"}</Text>
                </View>
              )}
              <Pressable style={styles.avatarCamera} onPress={handlePickAvatar} disabled={uploading} accessibilityLabel="Alterar foto" accessibilityRole="button">
                <Ionicons name="camera" size={16} color="#fff" />
              </Pressable>
            </View>
            <Pressable onPress={handlePickAvatar} disabled={uploading}>
              <Text style={styles.avatarChangeText}>{uploading ? "Enviando..." : "Alterar foto"}</Text>
            </Pressable>
          </View>

          {/* Informações */}
          <Text style={styles.sectionTitle}>INFORMAÇÕES</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Nome completo</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Seu nome" placeholderTextColor={colors.textMuted} returnKeyType="next" />
            <View style={styles.divider} />
            <Text style={styles.fieldLabel}>E-mail</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="seu@email.com" placeholderTextColor={colors.textMuted} keyboardType="email-address" autoCapitalize="none" returnKeyType="done" />
          </View>

          {/* Alterar senha */}
          <Text style={[styles.sectionTitle, { marginTop: 24 }]}>ALTERAR SENHA</Text>
          <View style={styles.card}>
            <Text style={styles.fieldLabel}>Senha atual</Text>
            <TextInput style={styles.input} value={currentPass} onChangeText={setCurrentPass} placeholder="Digite sua senha atual" placeholderTextColor={colors.textMuted} secureTextEntry returnKeyType="next" />
            <View style={styles.divider} />
            <Text style={styles.fieldLabel}>Nova senha</Text>
            <TextInput style={styles.input} value={newPass} onChangeText={setNewPass} placeholder="Mínimo 6 caracteres" placeholderTextColor={colors.textMuted} secureTextEntry returnKeyType="done" />
          </View>

          {saving && <Text style={styles.savingText}>Salvando...</Text>}

          <Pressable style={styles.dangerBtn} onPress={() => Alert.alert("Excluir conta", "Esta ação é irreversível. Deseja continuar?", [{ text: "Cancelar", style: "cancel" }, { text: "Excluir", style: "destructive", onPress: () => {} }])}>
            <Text style={styles.dangerBtnText}>Excluir minha conta</Text>
          </Pressable>

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { height: 56, flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle: { flex: 1, fontSize: 16, fontWeight: "700", color: colors.textPrimary, marginLeft: 8 },
  container: { padding: 16, paddingBottom: 48, gap: 0 },
  avatarSection: { alignItems: "center", paddingVertical: 24, gap: 8 },
  avatarWrap: { width: 96, height: 96 },
  avatar: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  avatarImage: { width: 96, height: 96, borderRadius: 48 },
  avatarText: { color: colors.primary, fontSize: 28, fontWeight: "700" },
  avatarCamera: { position: "absolute", bottom: 0, right: 0, width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", borderWidth: 2, borderColor: "#fff" },
  avatarChangeText: { color: colors.primary, fontWeight: "600", fontSize: 13 },
  sectionTitle: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5, marginBottom: 8 },
  card: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, paddingHorizontal: 16, paddingVertical: 4, marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: "500", color: colors.textMuted, marginTop: 10, marginBottom: 4 },
  input: { height: 44, fontSize: 14, color: colors.textPrimary, paddingVertical: 0 },
  divider: { height: 1, backgroundColor: colors.border },
  savingText: { textAlign: "center", color: colors.textMuted, fontSize: 13, marginTop: 12 },
  dangerBtn: { height: 44, borderRadius: 12, borderWidth: 1, borderColor: "#FCA5A5", alignItems: "center", justifyContent: "center", marginTop: 24 },
  dangerBtnText: { color: colors.danger, fontWeight: "600", fontSize: 14 },
});
