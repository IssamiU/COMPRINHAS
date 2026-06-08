import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDispatch, useSelector } from "react-redux";
import { Ionicons } from "@expo/vector-icons";
import * as Notifications from "expo-notifications";

import { RootState } from "../../store";
import { addPlannedMeal, removePlannedMeal, updateMealReminder } from "../../store/slices/plannerSlice";
import { MealType, PlannedMeal, WeekDay } from "../../types/planner";
// RF23 — cores reativas ao tema claro/escuro
import { useTheme } from "../../theme/ThemeContext";

const DAYS: WeekDay[] = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
const MEAL_TYPES: MealType[] = ["Café da manhã", "Almoço", "Lanche", "Jantar", "Outros"];

const MEAL_DEFAULT_HOURS: Record<MealType, { hour: number; minute: number }> = {
  "Café da manhã": { hour: 7,  minute: 0 },
  "Almoço":        { hour: 11, minute: 0 },
  "Lanche":        { hour: 14, minute: 0 },
  "Jantar":        { hour: 19, minute: 0 },
  "Outros":        { hour: 18, minute: 0 },
};

const DAY_OF_WEEK: Record<WeekDay, number> = {
  "Domingo": 1, "Segunda": 2, "Terça": 3, "Quarta": 4,
  "Quinta": 5,  "Sexta": 6,   "Sábado": 7,
};

const MEAL_ICONS: Record<MealType, string> = {
  "Café da manhã": "☕", "Almoço": "🍽️", "Lanche": "🥪", "Jantar": "🌙", "Outros": "✨",
};

const ITEM_HEIGHT = 52;
const VISIBLE_ITEMS = 5;
const PICKER_HEIGHT = ITEM_HEIGHT * VISIBLE_ITEMS;
const HOURS_LIST   = Array.from({ length: 24 }, (_, i) => i);
const MINUTES_LIST = Array.from({ length: 60 }, (_, i) => i);

// RF23 — WheelPicker usa useTheme() internamente para reagir ao tema
function WheelPicker({ items, selectedIndex, onIndexChange, label }: {
  items: number[];
  selectedIndex: number;
  onIndexChange: (i: number) => void;
  label: string;
}) {
  const { colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);

  const wheelStyles = useMemo(() => StyleSheet.create({
    wrapper:       { flex: 1, alignItems: "center" },
    label:         { fontSize: 12, fontWeight: "600", color: colors.textSecondary, textTransform: "uppercase", letterSpacing: 1, marginBottom: 6 },
    container:     { height: PICKER_HEIGHT, width: "100%", overflow: "hidden", position: "relative" },
    item:          { height: ITEM_HEIGHT, alignItems: "center", justifyContent: "center" },
    text:          { fontSize: 28, fontWeight: "300", color: colors.textSecondary, opacity: 0.4 },
    textSelected:  { fontSize: 40, fontWeight: "700", color: colors.textPrimary, opacity: 1 },
    line:          { position: "absolute", left: 12, right: 12, height: 1, backgroundColor: colors.border, zIndex: 10 },
  }), [colors]);

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

type ModalStep = "mealType" | "recipe";

export default function PlannerScreen() {
  const { colors } = useTheme();
  const dispatch = useDispatch();
  const recipes = useSelector((state: RootState) => state.recipes.recipes);
  const plannedMeals = useSelector((state: RootState) => state.planner.plannedMeals);

  const [modalVisible,         setModalVisible]         = useState(false);
  const [modalStep,            setModalStep]            = useState<ModalStep>("mealType");
  const [selectedDay,          setSelectedDay]          = useState<WeekDay | null>(null);
  const [selectedMealType,     setSelectedMealType]     = useState<MealType | null>(null);
  const [pendingMealId,        setPendingMealId]        = useState<string | null>(null);
  const [pendingRecipeTitle,   setPendingRecipeTitle]   = useState<string>("");
  const [reminderModalVisible, setReminderModalVisible] = useState(false);
  const [editingMealId,        setEditingMealId]        = useState<string | null>(null);
  const [selectedHour,         setSelectedHour]         = useState(0);
  const [selectedMinute,       setSelectedMinute]       = useState(0);

  useEffect(() => { Notifications.requestPermissionsAsync(); }, []);

  async function scheduleNotification(day: WeekDay, recipeTitle: string, hour: number, minute: number, oldId?: string) {
    if (oldId) await Notifications.cancelScheduledNotificationAsync(oldId).catch(() => {});
    return Notifications.scheduleNotificationAsync({
      content: { title: `⏰ Hora de preparar!`, body: `Você planejou "${recipeTitle}" para ${day}.`, sound: true },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.WEEKLY, weekday: DAY_OF_WEEK[day], hour, minute },
    });
  }

  function openAddMeal(day: WeekDay) {
    if (recipes.length === 0) { Alert.alert("Atenção", "Cadastre pelo menos uma receita antes de montar o planejamento."); return; }
    setSelectedDay(day); setSelectedMealType(null); setModalStep("mealType"); setModalVisible(true);
  }

  function handleSelectMealType(mealType: MealType) { setSelectedMealType(mealType); setModalStep("recipe"); }

  function handleSelectRecipe(recipeId: string) {
    if (!selectedDay || !selectedMealType) return;
    const recipe = recipes.find((r) => r.id === recipeId);
    const recipeTitle = recipe?.title ?? "receita";
    const mealId = Date.now().toString() + Math.random();
    dispatch(addPlannedMeal({ id: mealId, day: selectedDay, mealType: selectedMealType, recipeId, reminderTime: null }));
    closeModal();
    Alert.alert("Ativar lembrete?", `Deseja receber um lembrete para preparar "${recipeTitle}" toda ${selectedDay}?`, [
      { text: "Agora não", style: "cancel" },
      { text: "Definir horário", onPress: () => {
        const defaults = MEAL_DEFAULT_HOURS[selectedMealType!];
        setSelectedHour(defaults.hour); setSelectedMinute(defaults.minute);
        setPendingMealId(mealId); setPendingRecipeTitle(recipeTitle); setEditingMealId(null); setReminderModalVisible(true);
      }},
    ]);
  }

  function handleEditReminder(meal: PlannedMeal) {
    const recipe = recipes.find((r) => r.id === meal.recipeId);
    setSelectedHour(meal.reminderTime?.hour ?? MEAL_DEFAULT_HOURS[meal.mealType].hour);
    setSelectedMinute(meal.reminderTime?.minute ?? MEAL_DEFAULT_HOURS[meal.mealType].minute);
    setEditingMealId(meal.id); setPendingMealId(null); setPendingRecipeTitle(recipe?.title ?? "receita"); setReminderModalVisible(true);
  }

  async function confirmReminder() {
    const targetMealId = editingMealId ?? pendingMealId;
    if (!targetMealId) return;
    const meal = plannedMeals.find((m) => m.id === targetMealId);
    if (!meal) return;
    setReminderModalVisible(false);
    try {
      const notificationId = await scheduleNotification(meal.day, pendingRecipeTitle, selectedHour, selectedMinute, meal.reminderTime?.notificationId);
      dispatch(updateMealReminder({ mealId: targetMealId, reminderTime: { hour: selectedHour, minute: selectedMinute, notificationId } }));
      Alert.alert("Lembrete ativado!", `Toda ${meal.day} às ${String(selectedHour).padStart(2, "0")}:${String(selectedMinute).padStart(2, "0")}.`);
    } catch { Alert.alert("Erro", "Não foi possível agendar o lembrete."); }
    setPendingMealId(null); setEditingMealId(null); setPendingRecipeTitle("");
  }

  async function cancelReminder(meal: PlannedMeal) {
    if (meal.reminderTime?.notificationId) await Notifications.cancelScheduledNotificationAsync(meal.reminderTime.notificationId).catch(() => {});
    dispatch(updateMealReminder({ mealId: meal.id, reminderTime: null }));
  }

  function handleRemoveMeal(meal: PlannedMeal) {
    Alert.alert("Remover refeição", "Deseja remover esta refeição?", [
      { text: "Cancelar", style: "cancel" },
      { text: "Remover", style: "destructive", onPress: async () => {
        if (meal.reminderTime?.notificationId) await Notifications.cancelScheduledNotificationAsync(meal.reminderTime.notificationId).catch(() => {});
        dispatch(removePlannedMeal(meal.id));
      }},
    ]);
  }

  function closeModal() { setModalVisible(false); setSelectedDay(null); setSelectedMealType(null); setModalStep("mealType"); }
  function getMealsForDay(day: WeekDay) { return plannedMeals.filter((m) => m.day === day); }
  function getRecipeTitle(recipeId: string) { return recipes.find((r) => r.id === recipeId)?.title ?? "Receita não encontrada"; }
  function sortMeals(meals: typeof plannedMeals) { return [...meals].sort((a, b) => MEAL_TYPES.indexOf(a.mealType) - MEAL_TYPES.indexOf(b.mealType)); }
  function formatTime(h: number, m: number) { return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`; }

  const styles = useMemo(() => StyleSheet.create({
    safe: { flex: 1, backgroundColor: colors.background },
    container: { paddingHorizontal: 20, paddingBottom: 32 },
    header: { paddingTop: 16, marginBottom: 20 },
    headerTitle: { fontSize: 28, fontWeight: "700", color: colors.textPrimary },
    dayCard: { backgroundColor: colors.surface, borderRadius: 16, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: colors.border },
    dayHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 12 },
    dayTitle: { fontSize: 16, fontWeight: "700", color: colors.textPrimary },
    addButton: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: colors.primaryLight, borderRadius: 8, paddingVertical: 5, paddingHorizontal: 10 },
    addButtonText: { fontSize: 13, fontWeight: "700", color: colors.primary },
    emptyDay: { fontSize: 13, color: colors.textMuted, fontStyle: "italic" },
    mealRow: { flexDirection: "row", alignItems: "center", backgroundColor: colors.background, borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: colors.borderLight },
    mealIcon: { fontSize: 20, marginRight: 10 },
    mealInfo: { flex: 1 },
    mealType: { fontSize: 11, fontWeight: "700", color: colors.primary, textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 2 },
    mealRecipe: { fontSize: 14, fontWeight: "600", color: colors.textPrimary, marginBottom: 2 },
    reminderRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 2 },
    reminderText: { fontSize: 11, color: colors.primary, fontWeight: "600" },
    reminderAction: { fontSize: 11, color: colors.primary, fontWeight: "600", textDecorationLine: "underline" },
    reminderAdd: { fontSize: 11, color: colors.textMuted, marginTop: 2, textDecorationLine: "underline" },
    removeButton: { padding: 4 },
    modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.4)", justifyContent: "flex-end" },
    modalCard: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44, maxHeight: "80%" },
    reminderCard: { backgroundColor: colors.surface, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 44 },
    modalHandle: { width: 40, height: 4, backgroundColor: colors.border, borderRadius: 99, alignSelf: "center", marginBottom: 20 },
    modalTitle: { fontSize: 20, fontWeight: "700", color: colors.textPrimary, marginBottom: 4 },
    modalSub: { fontSize: 14, color: colors.textSecondary, marginBottom: 16 },
    optionBtn: { flexDirection: "row", alignItems: "center", backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
    optionIcon: { fontSize: 20, marginRight: 12 },
    optionText: { flex: 1, fontSize: 15, fontWeight: "600", color: colors.textPrimary },
    recipeItem: { backgroundColor: colors.background, borderRadius: 12, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: colors.border },
    recipeItemTitle: { fontSize: 15, fontWeight: "700", color: colors.textPrimary, marginBottom: 2 },
    recipeItemMeta: { fontSize: 13, color: colors.textSecondary },
    backBtn: { borderRadius: 12, paddingVertical: 13, alignItems: "center", marginBottom: 8, borderWidth: 1, borderColor: colors.border },
    backBtnText: { color: colors.primary, fontWeight: "700", fontSize: 15 },
    cancelBtn: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
    cancelBtnText: { color: colors.textSecondary, fontWeight: "700", fontSize: 15 },
    confirmBtn: { flex: 1, borderRadius: 12, paddingVertical: 13, alignItems: "center", backgroundColor: colors.primary },
    confirmBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    pickerRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", marginBottom: 8 },
    pickerSep: { fontSize: 36, fontWeight: "700", color: colors.textPrimary, marginHorizontal: 4, marginTop: 20, lineHeight: 56 },
    pickerPreview: { textAlign: "center", fontSize: 14, color: colors.textSecondary, marginBottom: 20, fontWeight: "500" },
    reminderBtns: { flexDirection: "row", gap: 12 },
  }), [colors]);

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Planejamento</Text>
        </View>

        {DAYS.map((day) => {
          const dayMeals = sortMeals(getMealsForDay(day));
          return (
            <View key={day} style={styles.dayCard}>
              <View style={styles.dayHeader}>
                <Text style={styles.dayTitle}>{day}</Text>
                <Pressable style={styles.addButton} onPress={() => openAddMeal(day)}>
                  <Ionicons name="add" size={16} color={colors.primary} />
                  <Text style={styles.addButtonText}>Adicionar</Text>
                </Pressable>
              </View>
              {dayMeals.length === 0 ? (
                <Text style={styles.emptyDay}>Nenhuma refeição planejada</Text>
              ) : (
                dayMeals.map((meal) => (
                  <View key={meal.id} style={styles.mealRow}>
                    <Text style={styles.mealIcon}>{MEAL_ICONS[meal.mealType]}</Text>
                    <View style={styles.mealInfo}>
                      <Text style={styles.mealType}>{meal.mealType}</Text>
                      <Text style={styles.mealRecipe} numberOfLines={1}>{getRecipeTitle(meal.recipeId)}</Text>
                      {meal.reminderTime ? (
                        <View style={styles.reminderRow}>
                          <Ionicons name="notifications" size={11} color={colors.primary} />
                          <Text style={styles.reminderText}>{formatTime(meal.reminderTime.hour, meal.reminderTime.minute)}</Text>
                          <Pressable onPress={() => handleEditReminder(meal)}><Text style={styles.reminderAction}>Editar</Text></Pressable>
                          <Pressable onPress={() => cancelReminder(meal)}><Text style={[styles.reminderAction, { color: colors.danger }]}>Remover</Text></Pressable>
                        </View>
                      ) : (
                        <Pressable onPress={() => handleEditReminder(meal)}>
                          <Text style={styles.reminderAdd}>+ Ativar lembrete</Text>
                        </Pressable>
                      )}
                    </View>
                    <Pressable style={styles.removeButton} onPress={() => handleRemoveMeal(meal)}>
                      <Ionicons name="close" size={16} color={colors.textMuted} />
                    </Pressable>
                  </View>
                ))
              )}
            </View>
          );
        })}
      </ScrollView>

      <Modal visible={modalVisible} animationType="slide" transparent onRequestClose={closeModal}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHandle} />
            {modalStep === "mealType" ? (
              <>
                <Text style={styles.modalTitle}>Qual refeição?</Text>
                <Text style={styles.modalSub}>{selectedDay}</Text>
                {MEAL_TYPES.map((type) => (
                  <Pressable key={type} style={styles.optionBtn} onPress={() => handleSelectMealType(type)}>
                    <Text style={styles.optionIcon}>{MEAL_ICONS[type]}</Text>
                    <Text style={styles.optionText}>{type}</Text>
                    <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
                  </Pressable>
                ))}
                <Pressable style={styles.cancelBtn} onPress={closeModal}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Qual receita?</Text>
                <Text style={styles.modalSub}>{selectedDay} · {selectedMealType}</Text>
                <FlatList
                  data={recipes}
                  keyExtractor={(item) => item.id}
                  style={{ maxHeight: 320 }}
                  renderItem={({ item }) => (
                    <Pressable style={styles.recipeItem} onPress={() => handleSelectRecipe(item.id)}>
                      <Text style={styles.recipeItemTitle}>{item.title}</Text>
                      <Text style={styles.recipeItemMeta}>{item.category} · {item.prepTimeMinutes} min</Text>
                    </Pressable>
                  )}
                />
                <Pressable style={styles.backBtn} onPress={() => setModalStep("mealType")}>
                  <Text style={styles.backBtnText}>← Voltar</Text>
                </Pressable>
                <Pressable style={styles.cancelBtn} onPress={closeModal}>
                  <Text style={styles.cancelBtnText}>Cancelar</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>

      <Modal visible={reminderModalVisible} animationType="slide" transparent onRequestClose={() => setReminderModalVisible(false)}>
        <Pressable style={styles.modalOverlay} onPress={() => setReminderModalVisible(false)} />
        <View style={styles.reminderCard}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>{editingMealId ? "Editar lembrete" : "Definir lembrete"}</Text>
          <Text style={styles.modalSub}>{pendingRecipeTitle}</Text>
          <View style={styles.pickerRow}>
            <WheelPicker items={HOURS_LIST}   selectedIndex={selectedHour}   onIndexChange={setSelectedHour}   label="hora" />
            <Text style={styles.pickerSep}>:</Text>
            <WheelPicker items={MINUTES_LIST} selectedIndex={selectedMinute} onIndexChange={setSelectedMinute} label="minuto" />
          </View>
          <Text style={styles.pickerPreview}>Lembrete às {formatTime(selectedHour, selectedMinute)}</Text>
          <View style={styles.reminderBtns}>
            <Pressable style={styles.cancelBtn} onPress={() => setReminderModalVisible(false)}>
              <Text style={styles.cancelBtnText}>Cancelar</Text>
            </Pressable>
            <Pressable style={styles.confirmBtn} onPress={confirmReminder}>
              <Text style={styles.confirmBtnText}>Confirmar</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
