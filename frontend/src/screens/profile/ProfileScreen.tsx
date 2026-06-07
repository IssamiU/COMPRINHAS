import React from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";

import { RootState } from "../../store";
import { signOut } from "../../store/slices/authSlice";
import { removeAuth } from "../../storage/authStorage";
import { colors } from "../../theme/colors";

export default function ProfileScreen({ navigation }: any) {
  const dispatch     = useDispatch();
  const user         = useSelector((s: RootState) => s.auth.user);
  const recipes      = useSelector((s: RootState) => s.recipes.recipes);
  const plannedMeals = useSelector((s: RootState) => s.planner.plannedMeals);
  const userId       = String(user?.id ?? "");
  const shoppingLists= useSelector((s: RootState) => s.shoppingList.listsByUser[userId] ?? []);
  const favoritesCount = recipes.filter((r) => r.isFavorite).length;

  async function handleLogout() {
    Alert.alert("Sair da conta", "Tem certeza que deseja sair?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Sair", style: "destructive", onPress: async () => {
        try { await removeAuth(); dispatch(signOut()); }
        catch { Alert.alert("Erro", "Não foi possível sair da conta."); }
      }},
    ]);
  }

  function getInitials(name: string) {
    return name.split(" ").slice(0, 2).map((n) => n[0]).join("").toUpperCase();
  }

  type MenuItem = {
    icon: React.ComponentProps<typeof Ionicons>["name"];
    label: string;
    sublabel?: string;
    onPress?: () => void;
    iconBg?: string;
    iconColor?: string;
  };

  const accountItems: MenuItem[] = [
    { icon: "person-outline",        label: "Dados pessoais",           sublabel: "Nome, e-mail, senha",        onPress: () => navigation.navigate("PersonalData"),          iconBg: colors.primaryLight, iconColor: colors.primary },
    { icon: "leaf-outline",          label: "Preferências alimentares", sublabel: "Dieta, restrições, objetivos",onPress: () => navigation.navigate("FoodPreferences"),       iconBg: "#DCFCE7",           iconColor: "#16A34A" },
    { icon: "notifications-outline", label: "Notificações",             sublabel: "Lembretes de refeições",      onPress: () => navigation.navigate("NotificationsSettings"), iconBg: "#FEF3C7",           iconColor: "#F59E0B" },
  ];

  const activityItems: MenuItem[] = [
    { icon: "heart-outline", label: "Receitas favoritas",   sublabel: `${favoritesCount} receitas`,  onPress: () => navigation.navigate("RecipesTab"),                          iconBg: "#FEE2E2", iconColor: colors.danger },
    { icon: "time-outline",  label: "Histórico de preparo", sublabel: "Receitas já preparadas",      onPress: () => navigation.navigate("RecipesTab", { screen: "History" }),   iconBg: "#FEF3C7", iconColor: "#F59E0B" },
  ];

  const otherItems: MenuItem[] = [
    { icon: "help-circle-outline", label: "Ajuda e Suporte", onPress: () => navigation.navigate("HelpSupport"), iconBg: "#DBEAFE", iconColor: "#2563EB" },
  ];

  function Section({ title, items }: { title: string; items: MenuItem[] }) {
    return (
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionCard}>
          {items.map((item, i) => (
            <React.Fragment key={item.label}>
              <Pressable style={styles.menuItem} onPress={item.onPress}>
                <View style={[styles.menuIcon, { backgroundColor: item.iconBg ?? colors.primaryLight }]}>
                  <Ionicons name={item.icon} size={18} color={item.iconColor ?? colors.primary} />
                </View>
                <View style={styles.menuText}>
                  <Text style={styles.menuLabel}>{item.label}</Text>
                  {item.sublabel && <Text style={styles.menuSublabel}>{item.sublabel}</Text>}
                </View>
                <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
              </Pressable>
              {i < items.length - 1 && <View style={styles.divider} />}
            </React.Fragment>
          ))}
        </View>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Header do perfil */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name ? getInitials(user.name) : "?"}</Text>
          </View>
          <Text style={styles.name}>{user?.name ?? "Usuário"}</Text>
          <Text style={styles.email}>{user?.email ?? ""}</Text>
        </View>

        {/* Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{recipes.length}</Text>
            <Text style={styles.statLabel}>Receitas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{favoritesCount}</Text>
            <Text style={styles.statLabel}>Favoritas</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{plannedMeals.length}</Text>
            <Text style={styles.statLabel}>Planejadas</Text>
          </View>
        </View>

        <Section title="CONTA"     items={accountItems} />
        <Section title="ATIVIDADE" items={activityItems} />
        <Section title="OUTROS"    items={otherItems} />

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} />
          <Text style={styles.logoutText}>Sair da conta</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  container: { paddingBottom: 40 },
  profileHeader: { alignItems: "center", paddingTop: 28, paddingBottom: 24, backgroundColor: colors.surface, borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", marginBottom: 12 },
  avatarText: { fontSize: 28, fontWeight: "700", color: "#fff" },
  name: { fontSize: 20, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 },
  email: { fontSize: 14, color: colors.textSecondary },
  statsRow: { flexDirection: "row", backgroundColor: colors.surface, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: colors.border, marginBottom: 8 },
  statItem: { flex: 1, alignItems: "center" },
  statNumber: { fontSize: 22, fontWeight: "700", color: colors.textPrimary, marginBottom: 2 },
  statLabel: { fontSize: 12, color: colors.textSecondary },
  statDivider: { width: 1, backgroundColor: colors.border },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionTitle: { fontSize: 12, fontWeight: "700", color: colors.textMuted, letterSpacing: 1, marginBottom: 8 },
  sectionCard: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  menuItem: { flexDirection: "row", alignItems: "center", paddingVertical: 14, paddingHorizontal: 16 },
  menuIcon: { width: 36, height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center", marginRight: 12 },
  menuText: { flex: 1 },
  menuLabel: { fontSize: 15, fontWeight: "500", color: colors.textPrimary },
  menuSublabel: { fontSize: 12, color: colors.textMuted, marginTop: 1 },
  divider: { height: 1, backgroundColor: colors.border, marginHorizontal: 16 },
  logoutButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, marginHorizontal: 20, marginTop: 24, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.danger, borderRadius: 14, paddingVertical: 14 },
  logoutText: { color: colors.danger, fontWeight: "700", fontSize: 15 },
});