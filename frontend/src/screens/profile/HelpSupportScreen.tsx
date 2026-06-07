import React, { useState } from "react";
import {
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../../theme/colors";

const FAQ = [
  { q: "Como crio uma nova receita?",        a: "Vá em Receitas e toque no botão '+'. Preencha título, foto, ingredientes e o modo de preparo." },
  { q: "Como funciona a lista de compras?",  a: "A lista é gerada a partir do seu planejamento semanal. Ingredientes iguais são agrupados por categoria." },
  { q: "Posso usar offline?",                a: "Sim. Receitas favoritas e o planejamento da semana ficam disponíveis offline." },
  { q: "Como mudar a porção de uma receita?",a: "Na tela da receita, use o seletor 'Porções' (+/-) e os ingredientes serão recalculados automaticamente." },
  { q: "Como ativar comandos de voz?",       a: "Vá em Perfil → Preferências e ative 'Comandos de voz'. Toque no microfone para usar." },
];

type IoniconsName = React.ComponentProps<typeof Ionicons>["name"];

const ACTIONS: { icon: IoniconsName; label: string; subtitle: string; onPress?: () => void }[] = [
  { icon: "chatbubble-outline", label: "Falar com o suporte",  subtitle: "Resposta em até 24h" },
  { icon: "mail-outline",       label: "Enviar e-mail",        subtitle: "mealsync420@gmail.com", onPress: () => Linking.openURL("mailto:mealsync420@gmail.com") },
  { icon: "bug-outline",        label: "Reportar um problema", subtitle: "Bug ou erro no app" },
  { icon: "star-outline",       label: "Avaliar o app",        subtitle: "Conte o que achou" },
];

const LEGAL: { icon: IoniconsName; label: string }[] = [
  { icon: "document-text-outline", label: "Termos de uso" },
  { icon: "shield-outline",        label: "Política de privacidade" },
];

export default function HelpSupportScreen({ navigation }: any) {
  const [open, setOpen] = useState<number | null>(0);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <View style={styles.header}>
        <Pressable style={styles.iconBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Ajuda e Suporte</Text>
      </View>

      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>

        {/* Hero */}
        <View style={styles.hero}>
          <Text style={styles.heroTitle}>Como podemos ajudar?</Text>
          <Text style={styles.heroSubtitle}>Confira as perguntas frequentes ou fale com a nossa equipe.</Text>
        </View>

        {/* FAQ */}
        <Text style={styles.section}>PERGUNTAS FREQUENTES</Text>
        <View style={styles.group}>
          {FAQ.map((item, i) => (
            <View key={i} style={i > 0 ? styles.groupDivider : null}>
              <Pressable style={styles.faqHead} onPress={() => setOpen(open === i ? null : i)}>
                <Text style={styles.faqQ}>{item.q}</Text>
                <Ionicons name={open === i ? "chevron-up" : "chevron-down"} size={18} color={colors.textMuted} />
              </Pressable>
              {open === i && (
                <View style={styles.faqBody}>
                  <Text style={styles.faqA}>{item.a}</Text>
                </View>
              )}
            </View>
          ))}
        </View>

        {/* Contato */}
        <Text style={[styles.section, { marginTop: 24 }]}>CONTATO</Text>
        <View style={styles.group}>
          {ACTIONS.map((a, i) => (
            <Pressable key={a.label} onPress={a.onPress} style={[styles.actionRow, i > 0 && styles.groupDivider]}>
              <View style={styles.actionIcon}>
                <Ionicons name={a.icon} size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.actionTitle}>{a.label}</Text>
                <Text style={styles.actionSubtitle}>{a.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>

        {/* Legal */}
        <Text style={[styles.section, { marginTop: 24 }]}>LEGAL</Text>
        <View style={styles.group}>
          {LEGAL.map((l, i) => (
            <Pressable key={l.label} style={[styles.actionRow, i > 0 && styles.groupDivider]}>
              <Ionicons name={l.icon} size={20} color={colors.textMuted} />
              <Text style={[styles.actionTitle, { flex: 1, marginLeft: 12 }]}>{l.label}</Text>
              <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
            </Pressable>
          ))}
        </View>

        <Text style={styles.version}>COMPRINHAS · versão 1.0.0</Text>
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
  hero: { backgroundColor: colors.primaryLight, borderRadius: 16, padding: 16, marginBottom: 24 },
  heroTitle: { color: colors.primaryDark, fontWeight: "700", fontSize: 14, marginBottom: 4 },
  heroSubtitle: { color: colors.textSecondary, fontSize: 12 },
  section: { fontSize: 11, fontWeight: "700", color: colors.textMuted, letterSpacing: 0.5, marginBottom: 8 },
  group: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, overflow: "hidden" },
  groupDivider: { borderTopWidth: 1, borderTopColor: colors.border },
  faqHead: { paddingHorizontal: 16, paddingVertical: 14, flexDirection: "row", alignItems: "center", gap: 12 },
  faqQ: { flex: 1, fontSize: 14, fontWeight: "600", color: colors.textPrimary },
  faqBody: { paddingHorizontal: 16, paddingBottom: 14 },
  faqA: { fontSize: 12, color: colors.textMuted, lineHeight: 18 },
  actionRow: { flexDirection: "row", alignItems: "center", paddingHorizontal: 16, paddingVertical: 14, gap: 12 },
  actionIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center" },
  actionTitle: { fontSize: 14, fontWeight: "500", color: colors.textPrimary },
  actionSubtitle: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  version: { textAlign: "center", fontSize: 11, color: colors.textMuted, marginTop: 24 },
});