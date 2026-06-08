import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  AppState,
  AppStateStatus,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
  Image,
  Platform,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import * as Notifications from "expo-notifications";
import { useFocusEffect } from "@react-navigation/native";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons, Feather } from "@expo/vector-icons";

import { store, RootState } from "../../store";
import StarRating from "../../components/StarRating";
import {
  startTimer,
  pauseTimer,
  clearTimer,
  timerKey,
} from "../../store/slices/timerSlice";
import { API_URL } from "../../services/api";
import { getAuth } from "../../storage/authStorage";
import { normalizeRecipe } from "../../utils/normalizeRecipe";
import { scaleIngredient } from "../../utils/scaleIngredient";
import { useTheme } from "../../theme/ThemeContext";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

// â”€â”€ WheelPicker â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const HOURS_ITEMS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES_ITEMS = Array.from({ length: 60 }, (_, i) => i);

function WheelPicker({
  items,
  selectedIndex,
  onIndexChange,
  label,
}: {
  items: number[];
  selectedIndex: number;
  onIndexChange: (i: number) => void;
  label: string;
}) {
  const { colors } = useTheme();
  const wheelStyles = useMemo(() => StyleSheet.create({
    wrapper: { flex: 1, alignItems: "center" },
    label: { fontSize: 12, fontWeight: "600", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
    container: { height: PICKER_HEIGHT, width: "100%", overflow: "hidden" },
    item: { height: ITEM_HEIGHT, alignItems: "center", justifyContent: "center" },
    text: { fontSize: 28, fontWeight: "300", color: colors.textSecondary, opacity: 0.4 },
    textSelected: { fontSize: 40, fontWeight: "700", color: colors.textPrimary, opacity: 1 },
    line: { position: "absolute", left: 12, right: 12, height: 1, backgroundColor: colors.border, zIndex: 10 },
  }), [colors]);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      scrollRef.current?.scrollTo({ y: selectedIndex * ITEM_HEIGHT, animated: false });
    }, 80);
    return () => clearTimeout(t);
  }, []);

  function onScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    const y = e.nativeEvent.contentOffset.y;
    const index = Math.max(0, Math.min(Math.round(y / ITEM_HEIGHT), items.length - 1));
    onIndexChange(index);
  }

  return (
    <View style={wheelStyles.wrapper}>
      <Text style={wheelStyles.label}>{label}</Text>
      <View style={wheelStyles.container}>
        <View pointerEvents="none" style={[wheelStyles.line, { top: ITEM_HEIGHT * 2 }]} />
        <View pointerEvents="none" style={[wheelStyles.line, { top: ITEM_HEIGHT * 3 - 1 }]} />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          snapToAlignment="start"
          decelerationRate="fast"
          onMomentumScrollEnd={onScrollEnd}
          contentContainerStyle={{ paddingVertical: ITEM_HEIGHT * 2 }}
          nestedScrollEnabled
        >
          {items.map((item, index) => (
            <View key={index} style={wheelStyles.item}>
              <Text style={[wheelStyles.text, index === selectedIndex && wheelStyles.textSelected]}>
                {String(item).padStart(2, "0")}
              </Text>
            </View>
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

// â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function calcSecondsLeft(startedAt: number, totalSeconds: number): number {
  return Math.max(0, totalSeconds - Math.floor((Date.now() - startedAt) / 1000));
}

function getTimersFromStore() {
  return store.getState().timers.timers;
}

type TabKey = "ingredients" | "steps";

// RF18 â€” unidades culinÃ¡rias para conversÃ£o
const VOLUME_UNITS = ["ml", "l", "xÃ­cara", "copo", "colher de sopa", "colher de chÃ¡"];
const WEIGHT_UNITS = ["g", "kg", "oz"];

function getCompatibleUnits(unit: string): string[] {
  const u = unit.toLowerCase().trim();
  if (VOLUME_UNITS.some((v) => v === u)) return VOLUME_UNITS.filter((v) => v !== u);
  if (WEIGHT_UNITS.some((v) => v === u)) return WEIGHT_UNITS.filter((v) => v !== u);
  return [];
}

// Unidades culinÃ¡rias exibem fraÃ§Ãµes; mÃ©tricas exibem decimais
const CULINARY_UNITS = ["xÃ­cara", "copo", "colher de sopa", "colher de chÃ¡"];

function toFraction(value: number): string {
  if (value <= 0) return "0";
  // menor que 1/4 â†’ inÃºtil na prÃ¡tica, avisar em vez de mostrar 0
  if (value < 0.125) return "< 1/4";
  const quarters = Math.round(value * 4);
  const whole    = Math.floor(quarters / 4);
  const rem      = quarters % 4;
  const fracMap: Record<number, string> = { 0: "", 1: "1/4", 2: "1/2", 3: "3/4" };
  const frac = fracMap[rem];
  if (whole === 0) return frac || "< 1/4";
  if (!frac) return String(whole);
  return `${whole} e ${frac}`;
}

function formatConverted(value: number, unit: string): string {
  if (CULINARY_UNITS.includes(unit.toLowerCase().trim())) return toFraction(value);
  return String(Math.round(value * 100) / 100);
}

// â”€â”€ Main Screen â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
export default function RecipeDetailsScreen({ route, navigation }: any) {
  const { recipeId } = route.params;
  const dispatch        = useDispatch();
  const currentUserId   = useSelector((s: RootState) => String(s.auth.user?.id ?? ""));
  const currentUserName = useSelector((s: RootState) => s.auth.user?.name ?? "UsuÃ¡rio");
  const { colors } = useTheme();

  const [recipe, setRecipe] = useState<any>(null);
  const [targetServings, setTargetServings] = useState<number>(1);
  const [activeTab, setActiveTab] = useState<TabKey>("ingredients");
  const [displaySeconds, setDisplaySeconds] = useState<Record<number, number>>({});
  const [finishedSteps, setFinishedSteps] = useState<Set<number>>(new Set());
  const [modalVisible, setModalVisible] = useState(false);
  const [modalStepIndex, setModalStepIndex] = useState(0);
  const [selectedHours, setSelectedHours] = useState(0);
  const [selectedMinutes, setSelectedMinutes] = useState(5);
  const [duplicating, setDuplicating] = useState(false);
  const [markingPrepared, setMarkingPrepared] = useState(false);

  // RF21 â€” avaliaÃ§Ãµes
  const [reviews, setReviews]               = useState<any[]>([]);
  const [avgRating, setAvgRating]           = useState(0);
  const [reviewCount, setReviewCount]       = useState(0);
  const [myRating, setMyRating]             = useState(0);
  const [myComment, setMyComment]           = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [filterRating, setFilterRating]     = useState(0); // 0 = todas

  // RF18 â€” conversÃ£o de unidades
  const [convertVisible, setConvertVisible]     = useState(false);
  const [convertIngredient, setConvertIngredient] = useState<any>(null);
  const [convertToUnit, setConvertToUnit]       = useState("");
  const [convertResult, setConvertResult]       = useState<number | null>(null);
  const [convertLoading, setConvertLoading]     = useState(false);

  const displayIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const firedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    Notifications.requestPermissionsAsync();
    const sub = AppState.addEventListener("change", (s: AppStateStatus) => {
      if (s === "active") tick();
    });
    startDisplayInterval();
    return () => { sub.remove(); stopDisplayInterval(); };
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadRecipe();
      tick();
      startDisplayInterval();
      return () => stopDisplayInterval();
    }, [recipeId])
  );

  function startDisplayInterval() {
    stopDisplayInterval();
    displayIntervalRef.current = setInterval(tick, 500);
  }

  function stopDisplayInterval() {
    if (displayIntervalRef.current) { clearInterval(displayIntervalRef.current); displayIntervalRef.current = null; }
  }

  function tick() {
    const timers = getTimersFromStore();
    const updated: Record<number, number> = {};
    Object.values(timers).forEach((entry) => {
      if (entry.recipeId !== recipeId) return;
      if (entry.pausedSecondsLeft !== null) { updated[entry.stepIndex] = entry.pausedSecondsLeft; return; }
      const left = calcSecondsLeft(entry.startedAt, entry.totalSeconds);
      updated[entry.stepIndex] = left;
      if (left <= 0 && !firedRef.current.has(entry.stepIndex)) {
        firedRef.current.add(entry.stepIndex);
        handleTimerFinished(entry.stepIndex, entry.notificationId);
      }
    });
    setDisplaySeconds(updated);
  }

  async function handleTimerFinished(stepIndex: number, notificationId: string | null) {
    dispatch(clearTimer({ recipeId, stepIndex }));
    setFinishedSteps((prev) => new Set(prev).add(stepIndex));
    if (notificationId) await Notifications.cancelScheduledNotificationAsync(notificationId).catch(() => {});
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Notifications.scheduleNotificationAsync({
      content: { title: "â° Timer finalizado!", body: `Passo ${stepIndex + 1} concluÃ­do.`, sound: true },
      trigger: null,
    });
  }

  async function loadRecipe() {
    try {
      const auth = await getAuth();
      if (!auth) return;
      const response = await fetch(`${API_URL}/recipes/${recipeId}`, { headers: { Authorization: `Bearer ${auth.accessToken}` } });
      const data = await response.json();
      if (response.status === 404) {
        Alert.alert("Receita nÃ£o encontrada", "Esta receita foi removida ou nÃ£o existe mais.", [
          { text: "OK", onPress: () => navigation.goBack() },
        ]);
        return;
      }
      if (!response.ok) throw new Error(data.message);
      const normalized = normalizeRecipe(data);
      setRecipe(normalized);
      setTargetServings(normalized.servings ?? 1);
      loadReviews();
    } catch { Alert.alert("Erro", "Erro ao carregar receita"); }
  }

  // RF21 â€” carrega avaliaÃ§Ãµes da receita
  async function loadReviews() {
    setLoadingReviews(true);
    try {
      const auth = await getAuth();
      if (!auth) return;
      const res = await fetch(`${API_URL}/reviews?recipeId=${recipeId}`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      const data = await res.json();
      if (res.ok) {
        setReviews(data.reviews ?? []);
        setAvgRating(data.avgRating ?? 0);
        setReviewCount(data.count ?? 0);
      }
    } catch {}
    finally { setLoadingReviews(false); }
  }

  // RF21 â€” envia ou atualiza avaliaÃ§Ã£o (upsert)
  async function submitReview() {
    if (myRating === 0) { Alert.alert("AvaliaÃ§Ã£o", "Selecione pelo menos 1 estrela."); return; }
    try {
      setSubmittingReview(true);
      const auth = await getAuth();
      if (!auth) return;
      const res = await fetch(`${API_URL}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.accessToken}` },
        body: JSON.stringify({ recipeId, rating: myRating, comment: myComment, authorName: currentUserName }),
      });
      if (res.ok) {
        await loadReviews();
        setMyRating(0);
        setMyComment("");
      }
    } catch { Alert.alert("Erro", "NÃ£o foi possÃ­vel enviar a avaliaÃ§Ã£o."); }
    finally { setSubmittingReview(false); }
  }

  async function toggleFavorite() {
    try {
      const auth = await getAuth();
      if (!auth) return;
      const response = await fetch(`${API_URL}/recipes/${recipeId}/favorite`, { method: "PATCH", headers: { Authorization: `Bearer ${auth.accessToken}` } });
      const data = await response.json();
      if (!response.ok) throw new Error();
      setRecipe(normalizeRecipe(data));
    } catch { Alert.alert("Erro", "Erro ao atualizar favorito"); }
  }

  async function handleMarkPrepared() {
    try {
      setMarkingPrepared(true);
      const auth = await getAuth();
      if (!auth) return;
      await fetch(`${API_URL}/history`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${auth.accessToken}` },
        body: JSON.stringify({ recipeId }),
      });
      Alert.alert("Receita preparada!", "Registrado no seu histÃ³rico.", [
        { text: "Ver histÃ³rico", onPress: () => navigation.navigate("History") },
        { text: "OK" },
      ]);
    } catch { Alert.alert("Erro", "NÃ£o foi possÃ­vel registrar o preparo."); }
    finally { setMarkingPrepared(false); }
  }

  // RF14 â€” compartilhar receita via deep link
  async function handleShare() {
    const link = `mealsync://recipe/${recipeId}`;
    await Share.share({
      message: `Confira essa receita no MealSync: ${recipe?.title ?? ""}\n${link}`,
      url: link,
    });
  }

  async function handleSaveCopy() {
    try {
      setDuplicating(true);
      const auth = await getAuth();
      if (!auth) return;
      const response = await fetch(`${API_URL}/recipes/${recipeId}/duplicate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message);
      Alert.alert("Receita salva!", "Uma cÃ³pia foi adicionada Ã s suas receitas.");
    } catch (e: any) {
      Alert.alert("Erro", e.message || "Erro ao salvar cÃ³pia");
    } finally {
      setDuplicating(false);
    }
  }

  async function handleDuplicate() {
    Alert.alert("Duplicar receita", "Uma cÃ³pia serÃ¡ criada e aberta para ediÃ§Ã£o.", [
      { text: "Cancelar", style: "cancel" },
      { text: "Duplicar", onPress: async () => {
        try {
          setDuplicating(true);
          const auth = await getAuth();
          if (!auth) return;
          const response = await fetch(`${API_URL}/recipes/${recipeId}/duplicate`, { method: "POST", headers: { Authorization: `Bearer ${auth.accessToken}` } });
          const data = await response.json();
          if (!response.ok) throw new Error(data.message);
          navigation.navigate("EditRecipe", { recipeId: data.id });
        } catch (e: any) { Alert.alert("Erro", e.message || "Erro ao duplicar"); }
        finally { setDuplicating(false); }
      }},
    ]);
  }

  // RF18 â€” busca conversÃ£o no backend proxy
  async function handleConvert(toUnit: string) {
    if (!convertIngredient || !recipe) return;
    setConvertToUnit(toUnit);
    setConvertLoading(true);
    setConvertResult(null);
    const scaledQty = scaleIngredient(convertIngredient.quantity, recipe.servings, targetServings);
    try {
      const res = await fetch(
        `${API_URL}/proxy/convert?value=${encodeURIComponent(scaledQty)}&from=${encodeURIComponent(convertIngredient.unit)}&to=${encodeURIComponent(toUnit)}`
      );
      const json = await res.json();
      setConvertResult(json.result ?? null);
    } catch {
      setConvertResult(null);
    } finally {
      setConvertLoading(false);
    }
  }

  function openTimerModal(stepIndex: number) {
    setModalStepIndex(stepIndex);
    setSelectedHours(0);
    setSelectedMinutes(5);
    setModalVisible(true);
  }

  function confirmTimer() {
    const totalSeconds = selectedHours * 3600 + selectedMinutes * 60;
    if (totalSeconds <= 0) { Alert.alert("AtenÃ§Ã£o", "Defina pelo menos 1 minuto."); return; }
    setModalVisible(false);
    startTimerForStep(modalStepIndex, totalSeconds);
  }

  async function startTimerForStep(stepIndex: number, seconds: number) {
    const existing = getTimersFromStore()[timerKey(recipeId, stepIndex)];
    if (existing?.notificationId) await Notifications.cancelScheduledNotificationAsync(existing.notificationId).catch(() => {});
    firedRef.current.delete(stepIndex);
    setFinishedSteps((prev) => { const s = new Set(prev); s.delete(stepIndex); return s; });
    let notificationId: string | null = null;
    try {
      notificationId = await Notifications.scheduleNotificationAsync({
        content: { title: "â° Timer finalizado!", body: `Passo ${stepIndex + 1} concluÃ­do.`, sound: true },
        trigger: { type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL, seconds },
      });
    } catch {}
    dispatch(startTimer({ recipeId, stepIndex, totalSeconds: seconds, startedAt: Date.now(), pausedSecondsLeft: null, notificationId }));
    setTimeout(tick, 50);
  }

  async function handlePauseTimer(stepIndex: number) {
    const entry = getTimersFromStore()[timerKey(recipeId, stepIndex)];
    if (!entry) return;
    if (entry.notificationId) await Notifications.cancelScheduledNotificationAsync(entry.notificationId).catch(() => {});
    dispatch(pauseTimer({ recipeId, stepIndex, secondsLeft: calcSecondsLeft(entry.startedAt, entry.totalSeconds) }));
  }

  async function handleResumeTimer(stepIndex: number) {
    const entry = getTimersFromStore()[timerKey(recipeId, stepIndex)];
    if (!entry || entry.pausedSecondsLeft === null) return;
    await startTimerForStep(stepIndex, entry.pausedSecondsLeft);
  }

  async function handleResetTimer(stepIndex: number) {
    const entry = getTimersFromStore()[timerKey(recipeId, stepIndex)];
    if (entry?.notificationId) await Notifications.cancelScheduledNotificationAsync(entry.notificationId).catch(() => {});
    firedRef.current.delete(stepIndex);
    dispatch(clearTimer({ recipeId, stepIndex }));
    setFinishedSteps((prev) => { const s = new Set(prev); s.delete(stepIndex); return s; });
    setDisplaySeconds((prev) => { const u = { ...prev }; delete u[stepIndex]; return u; });
  }

  function getTimerState(stepIndex: number) {
    const entry = getTimersFromStore()[timerKey(recipeId, stepIndex)];
    if (finishedSteps.has(stepIndex)) return { status: "done" as const };
    if (!entry) return null;
    return { status: "running" as const, secondsLeft: displaySeconds[stepIndex] ?? 0, running: entry.pausedSecondsLeft === null };
  }

  function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }

  // RF23 - estilos reativos ao tema
  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    scroll: { flex: 1 },
    loadingContainer: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.background },
    loadingText: { fontSize: 16, color: colors.textSecondary },
    hero: { width: "100%", height: 300, backgroundColor: "#1a1a1a" },
    heroImage: { width: "100%", height: "100%" },
    heroPlaceholder: { width: "100%", height: "100%", alignItems: "center", justifyContent: "center", backgroundColor: "#2d2d2d" },
    heroOverlay: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(0,0,0,0.3)" },
    heroHeader: {
      position: "absolute", top: 0, left: 0, right: 0,
      flexDirection: "row", justifyContent: "space-between", alignItems: "center",
      paddingHorizontal: 16,
      paddingTop: Platform.OS === "android" ? 16 : 0,
    },
    heroHeaderRight: { flexDirection: "row", alignItems: "center", gap: 8 },
    iconCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
    iconCircleSmall: { width: 32, height: 32, borderRadius: 16, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
    section: { paddingHorizontal: 16, marginTop: 16 },
    title: { fontSize: 22, fontWeight: "700", color: colors.textPrimary, lineHeight: 28, marginBottom: 10 },
    metaRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
    badge: { backgroundColor: colors.primaryLight, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 999 },
    badgeText: { color: colors.primaryDark, fontWeight: "700", fontSize: 12 },
    statsRow: { flexDirection: "row", alignItems: "center" },
    statItem: { flexDirection: "row", alignItems: "center", gap: 5 },
    statText: { fontSize: 14, color: colors.textSecondary },
    statDivider: { width: 1, height: 14, backgroundColor: colors.border, marginHorizontal: 12 },
    card: { backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, padding: 16 },
    stepperRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    stepperLabel: { fontSize: 16, fontWeight: "600", color: colors.textPrimary },
    stepperHint: { fontSize: 12, color: colors.textSecondary, marginTop: 2 },
    stepper: { flexDirection: "row", alignItems: "center", gap: 14 },
    stepperBtn: { width: 36, height: 36, borderRadius: 18, borderWidth: 1.5, borderColor: colors.primary, alignItems: "center", justifyContent: "center" },
    stepperValue: { minWidth: 28, textAlign: "center", fontSize: 18, fontWeight: "700", color: colors.textPrimary },
    tabsContainer: { flexDirection: "row", backgroundColor: colors.surface, borderRadius: 12, padding: 4, borderWidth: 1, borderColor: colors.border },
    tab: { flex: 1, paddingVertical: 10, alignItems: "center", borderRadius: 10 },
    tabActive: { backgroundColor: colors.primary },
    tabText: { color: colors.textSecondary, fontWeight: "600", fontSize: 14 },
    tabTextActive: { color: "#fff", fontWeight: "700" },
    ingredientRow: { flexDirection: "row", alignItems: "center", paddingVertical: 12, gap: 12 },
    ingredientDivider: { borderBottomWidth: 1, borderBottomColor: colors.border },
    ingredientQtyBox: { backgroundColor: colors.primaryLight, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, minWidth: 72, alignItems: "center" },
    ingredientQtyText: { color: colors.primaryDark, fontWeight: "700", fontSize: 13 },
    ingredientName: { flex: 1, color: colors.textPrimary, fontSize: 15 },
    stepCard: { flexDirection: "row", gap: 12, marginBottom: 10 },
    stepNumber: { width: 32, height: 32, borderRadius: 16, backgroundColor: colors.primary, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    stepNumberText: { color: "#fff", fontWeight: "700", fontSize: 14 },
    stepText: { color: colors.textPrimary, fontSize: 15, lineHeight: 22 },
    timerRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 10, flexWrap: "wrap" },
    timerInitBtn: { marginTop: 10, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: colors.primary, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999 },
    timerInitText: { color: colors.primary, fontWeight: "600", fontSize: 13 },
    timerDisplay: { fontSize: 20, fontWeight: "700", color: colors.primary },
    timerDone: { fontSize: 14, fontWeight: "700", color: colors.primary },
    timerActionBtn: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
    timerActionText: { color: colors.textSecondary, fontWeight: "600", fontSize: 12 },
    secondaryActions: { flexDirection: "column", gap: 8, marginBottom: 8 },
    outlineBtn: { flexDirection: "row", gap: 8, alignItems: "center", justifyContent: "center", borderWidth: 1.5, borderColor: colors.primary, paddingVertical: 13, borderRadius: 12 },
    outlineBtnText: { color: colors.primary, fontWeight: "700", fontSize: 14 },
    ctaBar: {
      position: "absolute", left: 0, right: 0, bottom: 0,
      flexDirection: "row", gap: 10,
      paddingHorizontal: 16, paddingTop: 12, paddingBottom: Platform.OS === "ios" ? 32 : 16,
      backgroundColor: colors.surface, borderTopWidth: 1, borderTopColor: colors.border,
    },
    ctaBtn: {
      flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
      backgroundColor: colors.primary, paddingVertical: 16, borderRadius: 12,
    },
    ctaBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
    modalBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)" },
    modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44 },
    modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 99, alignSelf: "center", marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: "700", color: colors.textPrimary, marginBottom: 2 },
    modalSub: { fontSize: 13, color: colors.textSecondary, marginBottom: 20 },
    pickerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 8 },
    pickerSep: { fontSize: 36, fontWeight: "700", color: colors.textPrimary, marginHorizontal: 4, marginTop: 20, lineHeight: 56 },
    pickerPreview: { textAlign: "center", fontSize: 14, color: colors.textSecondary, marginBottom: 24, fontWeight: "500" },
    modalBtns: { flexDirection: "row", gap: 12 },
    modalCancel: { flex: 1, backgroundColor: colors.surface, borderRadius: 14, paddingVertical: 15, alignItems: "center", borderWidth: 1, borderColor: colors.border },
    modalCancelText: { color: colors.textSecondary, fontWeight: "700", fontSize: 15 },
    modalConfirm: { flex: 1, backgroundColor: colors.primary, borderRadius: 14, paddingVertical: 15, alignItems: "center" },
    modalConfirmText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    authorName:          { fontSize: 13, color: colors.textSecondary, marginTop: 2, marginBottom: 4 },
    reviewsHeader:       { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    reviewsSectionTitle: { fontSize: 17, fontWeight: "700", color: colors.textPrimary },
    avgRow:              { flexDirection: "row", alignItems: "center", gap: 6 },
    avgText:             { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
    reviewForm:          { gap: 12, marginBottom: 12 },
    reviewFormTitle:     { fontSize: 15, fontWeight: "700", color: colors.textPrimary },
    reviewInput:         { borderWidth: 1, borderColor: colors.border, borderRadius: 10, padding: 12, fontSize: 14, color: colors.textPrimary, minHeight: 76, textAlignVertical: "top" },
    noReviewsText:       { fontSize: 14, color: colors.textMuted, textAlign: "center", marginTop: 12 },
    starFilterRow:       { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 12 },
    starFilterBtn:       { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
    starFilterBtnActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
    starFilterText:      { fontSize: 12, fontWeight: "600", color: colors.textSecondary },
    starFilterTextActive:{ color: colors.primaryDark, fontWeight: "700" },
    reviewCard:          { marginTop: 10, gap: 4 },
    reviewCardHeader:    { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
    reviewAuthor:        { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
    reviewComment:       { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
    reviewDate:          { fontSize: 11, color: colors.textMuted },
    convertBtn: { paddingHorizontal: 2, paddingVertical: 4 },
    convertCurrentRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", backgroundColor: colors.surfaceAlt, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, marginBottom: 16, width: "100%" },
    convertCurrentLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
    convertCurrentValue: { fontSize: 15, color: colors.textPrimary, fontWeight: "700" },
    convertPickerLabel: { fontSize: 13, color: colors.textSecondary, fontWeight: "600", alignSelf: "flex-start", marginBottom: 10 },
    convertPills: { flexDirection: "row", flexWrap: "wrap", gap: 8, width: "100%", marginBottom: 20 },
    convertPill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, borderWidth: 1.5, borderColor: colors.border, backgroundColor: colors.surface },
    convertPillActive: { borderColor: colors.primary, backgroundColor: colors.primaryLight },
    convertPillText: { fontSize: 13, color: colors.textSecondary, fontWeight: "600" },
    convertPillTextActive: { color: colors.primaryDark, fontWeight: "700" },
    convertResultBox: { width: "100%", minHeight: 60, alignItems: "center", justifyContent: "center", backgroundColor: colors.surfaceAlt, borderRadius: 12, marginBottom: 20, paddingVertical: 14 },
    convertResultLabel: { fontSize: 12, color: colors.textSecondary, fontWeight: "600", marginBottom: 2 },
    convertResultValue: { fontSize: 24, color: colors.primary, fontWeight: "700" },
    convertResultHint: { fontSize: 13, color: colors.textMuted },
  }), [colors]);

  if (!recipe) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Carregando...</Text>
      </View>
    );
  }

  // RF21 â€” determina se o usuÃ¡rio logado Ã© dono da receita
  const isOwner = recipe.userId ? String(recipe.userId) === String(currentUserId) : true;

  return (
    <View style={styles.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO IMAGE */}
        <View style={styles.hero}>
          {recipe.imageUrl ? (
            <Image source={{ uri: recipe.imageUrl }} style={styles.heroImage} resizeMode="cover" />
          ) : (
            <View style={styles.heroPlaceholder}>
              <Ionicons name="restaurant" size={64} color="rgba(255,255,255,0.4)" />
            </View>
          )}
          <View style={styles.heroOverlay} />

          {/* Header sobre a imagem */}
          <SafeAreaView edges={["top"]} style={styles.heroHeader}>
            <Pressable style={styles.iconCircle} onPress={() => navigation.goBack()}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </Pressable>
            <View style={styles.heroHeaderRight}>
              {/* RF21 â€” editar/duplicar sÃ³ para o dono */}
              {isOwner && (
                <>
                  <Pressable style={styles.iconCircleSmall} onPress={() => navigation.navigate("EditRecipe", { recipeId })}>
                    <Feather name="edit-2" size={15} color="#fff" />
                  </Pressable>
                  <Pressable style={styles.iconCircleSmall} onPress={handleDuplicate} disabled={duplicating}>
                    <Feather name="copy" size={15} color="#fff" />
                  </Pressable>
                </>
              )}
              {/* RF14 â€” compartilhar via deep link */}
              <Pressable style={styles.iconCircleSmall} onPress={handleShare} accessibilityLabel="Compartilhar receita" accessibilityRole="button">
                <Feather name="share" size={15} color="#fff" />
              </Pressable>
              <Pressable style={styles.iconCircle} onPress={toggleFavorite}>
                <Ionicons name={recipe.isFavorite ? "heart" : "heart-outline"} size={20} color={recipe.isFavorite ? "#FCA5A5" : "#fff"} />
              </Pressable>
            </View>
          </SafeAreaView>
        </View>

        {/* INFO */}
        <View style={styles.section}>
          <Text style={styles.title}>{recipe.title}</Text>
          {/* RF21 â€” autor visÃ­vel apenas em receitas de outros usuÃ¡rios */}
          {!isOwner && !!recipe.authorName && (
            <Text style={styles.authorName}>Por {recipe.authorName}</Text>
          )}

          <View style={styles.metaRow}>
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{recipe.category}</Text>
            </View>
          </View>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Ionicons name="time-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.statText}>{recipe.prepTimeMinutes} min</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Ionicons name="people-outline" size={16} color={colors.textSecondary} />
              <Text style={styles.statText}>{targetServings} porÃ§Ãµes</Text>
            </View>
          </View>
        </View>

        {/* STEPPER PORÃ‡Ã•ES */}
        <View style={[styles.card, styles.section]}>
          <View style={styles.stepperRow}>
            <View>
              <Text style={styles.stepperLabel}>PorÃ§Ãµes</Text>
              <Text style={styles.stepperHint}>Ajuste os ingredientes</Text>
            </View>
            <View style={styles.stepper}>
              <Pressable style={styles.stepperBtn} onPress={() => setTargetServings((p) => Math.max(1, p - 1))}>
                <Feather name="minus" size={18} color={colors.primary} />
              </Pressable>
              <Text style={styles.stepperValue}>{targetServings}</Text>
              <Pressable style={styles.stepperBtn} onPress={() => setTargetServings((p) => p + 1)}>
                <Feather name="plus" size={18} color={colors.primary} />
              </Pressable>
            </View>
          </View>
        </View>

        {/* TABS */}
        <View style={[styles.tabsContainer, styles.section]}>
          <Pressable style={[styles.tab, activeTab === "ingredients" && styles.tabActive]} onPress={() => setActiveTab("ingredients")}>
            <Text style={[styles.tabText, activeTab === "ingredients" && styles.tabTextActive]}>Ingredientes</Text>
          </Pressable>
          <Pressable style={[styles.tab, activeTab === "steps" && styles.tabActive]} onPress={() => setActiveTab("steps")}>
            <Text style={[styles.tabText, activeTab === "steps" && styles.tabTextActive]}>Modo de preparo</Text>
          </Pressable>
        </View>

        {/* INGREDIENTES */}
        {activeTab === "ingredients" && (
          <View style={[styles.card, styles.section]}>
            {recipe.ingredients.map((ingredient: any, i: number) => (
              <View
                key={ingredient.id}
                style={[styles.ingredientRow, i < recipe.ingredients.length - 1 && styles.ingredientDivider]}
              >
                <View style={styles.ingredientQtyBox}>
                  <Text style={styles.ingredientQtyText}>
                    {scaleIngredient(ingredient.quantity, recipe.servings, targetServings)} {ingredient.unit}
                  </Text>
                </View>
                <Text style={styles.ingredientName}>{ingredient.name}</Text>
                {/* RF18 â€” botÃ£o de conversÃ£o visÃ­vel apenas para unidades suportadas */}
                {getCompatibleUnits(ingredient.unit).length > 0 && (
                  <Pressable
                    style={styles.convertBtn}
                    hitSlop={10}
                    onPress={() => {
                      setConvertIngredient(ingredient);
                      setConvertToUnit("");
                      setConvertResult(null);
                      setConvertVisible(true);
                    }}
                    accessibilityLabel="Converter unidade"
                    accessibilityRole="button"
                  >
                    <Ionicons name="swap-horizontal-outline" size={17} color={colors.textMuted} />
                  </Pressable>
                )}
              </View>
            ))}
          </View>
        )}

        {/* PASSOS */}
        {activeTab === "steps" && (
          <View style={styles.section}>
            {recipe.steps.map((step: any, index: number) => {
              const timer = getTimerState(index);
              return (
                <View key={step.id} style={[styles.card, styles.stepCard]}>
                  <View style={styles.stepNumber}>
                    <Text style={styles.stepNumberText}>{index + 1}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stepText}>{step.description}</Text>

                    {step.hasTimer === true && (
                      <>
                        {!timer ? (
                          <Pressable style={styles.timerInitBtn} onPress={() => openTimerModal(index)}>
                            <Ionicons name="time-outline" size={15} color={colors.primary} />
                            <Text style={styles.timerInitText}>Definir timer</Text>
                          </Pressable>
                        ) : timer.status === "done" ? (
                          <View style={styles.timerRow}>
                            <Text style={styles.timerDone}>âœ“ ConcluÃ­do</Text>
                            <Pressable style={styles.timerActionBtn} onPress={() => handleResetTimer(index)}>
                              <Text style={styles.timerActionText}>â†º Novo</Text>
                            </Pressable>
                          </View>
                        ) : (
                          <View style={styles.timerRow}>
                            <Text style={[styles.timerDisplay, timer.secondsLeft <= 10 && { color: colors.danger }]}>
                              â± {formatTime(timer.secondsLeft)}
                            </Text>
                            {timer.running ? (
                              <Pressable style={styles.timerActionBtn} onPress={() => handlePauseTimer(index)}>
                                <Text style={styles.timerActionText}>Pausar</Text>
                              </Pressable>
                            ) : (
                              <Pressable style={[styles.timerActionBtn, { backgroundColor: colors.primaryLight }]} onPress={() => handleResumeTimer(index)}>
                                <Text style={[styles.timerActionText, { color: colors.primaryDark }]}>Retomar</Text>
                              </Pressable>
                            )}
                            <Pressable style={styles.timerActionBtn} onPress={() => handleResetTimer(index)}>
                              <Text style={styles.timerActionText}>â†º</Text>
                            </Pressable>
                          </View>
                        )}
                      </>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        )}

        {/* AÃ‡Ã•ES SECUNDÃRIAS */}
        <View style={[styles.section, styles.secondaryActions]}>
          <Pressable
            style={[styles.outlineBtn, markingPrepared && { opacity: 0.6 }]}
            onPress={handleMarkPrepared}
            disabled={markingPrepared}
            accessibilityLabel="Marcar como preparada"
            accessibilityRole="button"
          >
            <Ionicons name="checkmark-circle-outline" size={18} color={colors.primary} />
            <Text style={styles.outlineBtnText}>{markingPrepared ? "Registrando..." : "Marcar como preparada"}</Text>
          </Pressable>
          {!isOwner && (
            <Pressable
              style={[styles.outlineBtn, duplicating && { opacity: 0.6 }]}
              onPress={handleSaveCopy}
              disabled={duplicating}
              accessibilityLabel="Salvar cÃ³pia nas minhas receitas"
              accessibilityRole="button"
            >
              <Ionicons name="download-outline" size={18} color={colors.primary} />
              <Text style={styles.outlineBtnText}>{duplicating ? "Salvando..." : "Salvar cÃ³pia"}</Text>
            </Pressable>
          )}
        </View>

        {/* RF21 â€” AvaliaÃ§Ãµes */}
        <View style={[styles.section, { marginBottom: 16 }]}>
          <View style={styles.reviewsHeader}>
            <Text style={styles.reviewsSectionTitle}>AvaliaÃ§Ãµes</Text>
            {reviewCount > 0 && (
              <View style={styles.avgRow}>
                <StarRating rating={avgRating} size={15} />
                <Text style={styles.avgText}>{avgRating.toFixed(1)} ({reviewCount})</Text>
              </View>
            )}
          </View>

          {/* Filtro por estrelas */}
          {reviewCount > 0 && (
            <View style={styles.starFilterRow}>
              {[0, 5, 4, 3, 2, 1].map((n) => (
                <Pressable
                  key={n}
                  style={[styles.starFilterBtn, filterRating === n && styles.starFilterBtnActive]}
                  onPress={() => setFilterRating(n)}
                >
                  <Text style={[styles.starFilterText, filterRating === n && styles.starFilterTextActive]}>
                    {n === 0 ? "Todas" : `${n}â˜…`}
                  </Text>
                </Pressable>
              ))}
            </View>
          )}

          {/* FormulÃ¡rio â€” apenas para quem nÃ£o Ã© dono */}
          {!isOwner && (
            <View style={[styles.card, styles.reviewForm]}>
              <Text style={styles.reviewFormTitle}>Sua avaliaÃ§Ã£o</Text>
              <StarRating rating={myRating} interactive size={28} onRate={setMyRating} />
              <TextInput
                style={styles.reviewInput}
                placeholder="ComentÃ¡rio (opcional)"
                placeholderTextColor={colors.textMuted}
                value={myComment}
                onChangeText={setMyComment}
                multiline
                numberOfLines={3}
              />
              <Pressable
                style={[styles.outlineBtn, submittingReview && { opacity: 0.6 }]}
                onPress={submitReview}
                disabled={submittingReview}
                accessibilityLabel="Enviar avaliaÃ§Ã£o"
                accessibilityRole="button"
              >
                <Text style={styles.outlineBtnText}>{submittingReview ? "Enviando..." : "Enviar avaliaÃ§Ã£o"}</Text>
              </Pressable>
            </View>
          )}

          {/* Lista de avaliaÃ§Ãµes */}
          {loadingReviews ? (
            <ActivityIndicator color={colors.primary} style={{ marginTop: 16 }} />
          ) : reviews.length === 0 ? (
            <Text style={styles.noReviewsText}>Nenhuma avaliaÃ§Ã£o ainda.</Text>
          ) : (
            reviews
              .filter((r) => filterRating === 0 || r.rating === filterRating)
              .map((review: any) => (
              <View key={review.id} style={[styles.card, styles.reviewCard]}>
                <View style={styles.reviewCardHeader}>
                  <Text style={styles.reviewAuthor}>{review.author_name}</Text>
                  <StarRating rating={review.rating} size={14} />
                </View>
                {!!review.comment && (
                  <Text style={styles.reviewComment}>{review.comment}</Text>
                )}
                <Text style={styles.reviewDate}>
                  {new Date(review.created_at).toLocaleDateString("pt-BR")}
                </Text>
              </View>
            ))
          )}
        </View>
      </ScrollView>

      {/* CTA fixo */}
      <View style={styles.ctaBar}>
        <Pressable style={styles.ctaBtn} onPress={() => setActiveTab("steps")} accessibilityLabel="Iniciar preparo" accessibilityRole="button">
          <Ionicons name="play" size={18} color="#fff" />
          <Text style={styles.ctaBtnText}>Iniciar Preparo</Text>
        </Pressable>
      </View>

      {/* RF18 â€” Modal de conversÃ£o de unidade */}
      <Modal visible={convertVisible} transparent animationType="slide" onRequestClose={() => setConvertVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setConvertVisible(false)} />
        <View style={styles.modalCard}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Converter unidade</Text>
          {convertIngredient && (
            <>
              <Text style={styles.modalSub}>{convertIngredient.name}</Text>
              <View style={styles.convertCurrentRow}>
                <Text style={styles.convertCurrentLabel}>Valor atual</Text>
                <Text style={styles.convertCurrentValue}>
                  {scaleIngredient(convertIngredient.quantity, recipe.servings, targetServings)}{" "}
                  {convertIngredient.unit}
                </Text>
              </View>
              <Text style={styles.convertPickerLabel}>Converter para:</Text>
              <View style={styles.convertPills}>
                {getCompatibleUnits(convertIngredient.unit).map((unit) => (
                  <Pressable
                    key={unit}
                    style={[styles.convertPill, convertToUnit === unit && styles.convertPillActive]}
                    onPress={() => handleConvert(unit)}
                  >
                    <Text style={[styles.convertPillText, convertToUnit === unit && styles.convertPillTextActive]}>
                      {unit}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.convertResultBox}>
                {convertLoading ? (
                  <ActivityIndicator color={colors.primary} />
                ) : convertResult !== null && convertToUnit ? (
                  <>
                    <Text style={styles.convertResultLabel}>Equivale a</Text>
                    <Text style={styles.convertResultValue}>{formatConverted(convertResult, convertToUnit)} {convertToUnit}</Text>
                  </>
                ) : (
                  <Text style={styles.convertResultHint}>Toque em uma unidade acima</Text>
                )}
              </View>
            </>
          )}
        </View>
      </Modal>

      {/* Modal timer */}
      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <Pressable style={styles.modalBackdrop} onPress={() => setModalVisible(false)} />
        <View style={styles.modalCard}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>â± Definir timer</Text>
          <Text style={styles.modalSub}>Passo {modalStepIndex + 1}</Text>
          <View style={styles.pickerRow}>
            <WheelPicker items={HOURS_ITEMS} selectedIndex={selectedHours} onIndexChange={setSelectedHours} label="horas" />
            <Text style={styles.pickerSep}>:</Text>
            <WheelPicker items={MINUTES_ITEMS} selectedIndex={selectedMinutes} onIndexChange={setSelectedMinutes} label="minutos" />
          </View>
          <Text style={styles.pickerPreview}>
            {selectedHours > 0 ? `${selectedHours}h ${String(selectedMinutes).padStart(2, "0")}min` : `${selectedMinutes} minuto${selectedMinutes !== 1 ? "s" : ""}`}
          </Text>
          <View style={styles.modalBtns}>
            <Pressable style={styles.modalCancel} onPress={() => setModalVisible(false)}>
              <Text style={styles.modalCancelText}>Cancelar</Text>
            </Pressable>
            <Pressable style={styles.modalConfirm} onPress={confirmTimer}>
              <Text style={styles.modalConfirmText}>Iniciar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </View>
  );
}
