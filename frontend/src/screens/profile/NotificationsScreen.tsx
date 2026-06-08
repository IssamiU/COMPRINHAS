import React, { useEffect, useMemo, useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
// RF23 — cores reativas ao tema claro/escuro
import { useTheme } from "../../theme/ThemeContext";

const NOTIF_KEY = "@mealsync:notificationSettings";

type Settings = { meals: boolean; shopping: boolean; timer: boolean; weekly: boolean; push: boolean };
const DEFAULTS: Settings = { meals: true, shopping: true, timer: true, weekly: true, push: true };

export default function NotificationsScreen({ navigation }: any) {
  const { colors } = useTheme();
  const [settings, setSettings] = useState<Settings>(DEFAULTS);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(NOTIF_KEY).then((json) => {
      if (json) { try { setSettings({ ...DEFAULTS, ...JSON.parse(json) }); } catch {} }
      setLoaded(true);
    });
  }, []);

  function update(key: keyof Settings, value: boolean) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(next));
  }

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    header: { height: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 },
    iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
    headerTitle: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
    container: { padding: 16, paddingBottom: 32 },
    section: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5, marginBottom: 8 },
    group: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
    row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
    rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
    rowTitle: { fontSize: 14, fontWeight: "500", color: colors.textPrimary },
    rowSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  }), [colors]);

  type RowProps = { title: string; subtitle?: string; value: boolean; onChange: (v: boolean) => void; showBorder?: boolean };
  function Row({ title, subtitle, value, onChange, showBorder }: RowProps) {
    return (
      <View style={[styles.row, showBorder && styles.rowBorder]}>
        <View style={{ flex: 1 }}>
          <Text style={styles.rowTitle}>{title}</Text>
          {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
        </View>
        <Switch value={value} onValueChange={onChange} trackColor={{ true: colors.primary, false: colors.border }} thumbColor="#fff" />
      </View>
    );
  }

  if (!loaded) return null;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()} accessibilityLabel="Voltar" accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Notificações</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <Text style={styles.section}>LEMBRETES</Text>
        <View style={styles.group}>
          <Row title="Refeições do dia"  subtitle="Avisar 30min antes"        value={settings.meals}    onChange={(v) => update("meals", v)} />
          <Row title="Lista de compras"  subtitle="Lembrete de compras"       value={settings.shopping} onChange={(v) => update("shopping", v)} showBorder />
          <Row title="Timer de preparo"  subtitle="Som ao concluir uma etapa" value={settings.timer}    onChange={(v) => update("timer", v)}    showBorder />
          <Row title="Resumo semanal"    subtitle="Toda segunda às 8h"        value={settings.weekly}   onChange={(v) => update("weekly", v)}   showBorder />
        </View>
        <Text style={[styles.section, { marginTop: 24 }]}>CANAIS</Text>
        <View style={styles.group}>
          <Row title="Notificações push" value={settings.push} onChange={(v) => update("push", v)} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
