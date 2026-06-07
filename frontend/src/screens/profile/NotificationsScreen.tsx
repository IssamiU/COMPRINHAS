import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";

type RowProps = {
  title: string;
  subtitle?: string;
  value: boolean;
  onChange: (v: boolean) => void;
  showBorder?: boolean;
};

function Row({ title, subtitle, value, onChange, showBorder }: RowProps) {
  return (
    <View style={[styles.row, showBorder && styles.rowBorder]}>
      <View style={{ flex: 1 }}>
        <Text style={styles.rowTitle}>{title}</Text>
        {subtitle ? <Text style={styles.rowSubtitle}>{subtitle}</Text> : null}
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ true: colors.primary, false: colors.border }}
        thumbColor="#fff"
      />
    </View>
  );
}

export default function NotificationsScreen({ navigation }: any) {
  const [meals,      setMeals]      = useState(true);
  const [shopping,   setShopping]   = useState(true);
  const [timer,      setTimer]      = useState(true);
  const [weekly,     setWeekly]     = useState(true);
  const [newRecipes, setNewRecipes] = useState(false);
  const [push,       setPush]       = useState(true);
  const [emailNotif, setEmailNotif] = useState(false);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Notificações</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        <Text style={styles.section}>LEMBRETES</Text>
        <View style={styles.group}>
          <Row title="Refeições do dia"  subtitle="Avisar 30min antes"              value={meals}    onChange={setMeals} />
          <Row title="Lista de compras"  subtitle="Quando estiver perto do mercado" value={shopping} onChange={setShopping} showBorder />
          <Row title="Timer de preparo"  subtitle="Som ao concluir uma etapa"       value={timer}    onChange={setTimer}    showBorder />
          <Row title="Resumo semanal"    subtitle="Toda segunda às 8h"              value={weekly}   onChange={setWeekly}   showBorder />
        </View>

        <Text style={[styles.section, { marginTop: 24 }]}>CONTEÚDO</Text>
        <View style={styles.group}>
          <Row title="Novas receitas" subtitle="Sugestões com seus ingredientes" value={newRecipes} onChange={setNewRecipes} />
        </View>

        <Text style={[styles.section, { marginTop: 24 }]}>CANAIS</Text>
        <View style={styles.group}>
          <Row title="Notificações push" value={push}       onChange={setPush} />
          <Row title="E-mail"            value={emailNotif} onChange={setEmailNotif} showBorder />
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  header: { height: 56, flexDirection: "row", alignItems: "center", paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: colors.border, gap: 12 },
  iconBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
  container: { padding: 16, paddingBottom: 32, gap: 0 },
  section: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5, marginBottom: 8 },
  group: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  rowBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  rowTitle: { fontSize: 14, fontWeight: "500", color: colors.textPrimary },
  rowSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
});