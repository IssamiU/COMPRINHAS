import React, { useEffect, useState } from "react";
import { ActivityIndicator, Platform, StyleSheet, View } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { useSelector } from "react-redux";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";

import OnboardingScreen        from "../screens/onboarding/OnboardingScreen";
import LoginScreen             from "../screens/auth/LoginScreen";
import RegisterScreen          from "../screens/auth/RegisterScreen";
import ForgotPasswordScreen    from "../screens/auth/ForgotPasswordScreen";
import ResetPasswordScreen     from "../screens/auth/ResetPasswordScreen";
import DashboardScreen         from "../screens/dashboard/DashboardScreen";
import RecipesListScreen       from "../screens/recipes/RecipesListScreen";
import RecipeDetailsScreen     from "../screens/recipes/RecipeDetailsScreen";
import CreateRecipeScreen      from "../screens/recipes/CreateRecipeScreen";
import EditRecipeScreen        from "../screens/recipes/EditRecipeScreen";
import SuggestByIngredientsScreen from "../screens/recipes/SuggestByIngredientsScreen";
import HistoryScreen           from "../screens/history/HistoryScreen";
import PlannerScreen           from "../screens/planner/PlannerScreen";
import ShoppingListsScreen     from "../screens/shopping/ShoppingListsScreen";
import ShoppingListScreen      from "../screens/shopping/ShoppingListScreen";
import ProfileScreen           from "../screens/profile/ProfileScreen";
import PersonalDataScreen      from "../screens/profile/PersonalDataScreen";
import FoodPreferencesScreen   from "../screens/profile/FoodPreferencesScreen";
import NotificationsScreen     from "../screens/profile/NotificationsScreen";
import HelpSupportScreen       from "../screens/profile/HelpSupportScreen";

import {
  AuthStackParamList,
  HomeStackParamList,
  RecipesStackParamList,
  PlannerStackParamList,
  ShoppingStackParamList,
  ProfileStackParamList,
  TabParamList,
} from "../types/navigation";
import { RootState } from "../store";
import { colors } from "../theme/colors";

const AuthStack     = createNativeStackNavigator<AuthStackParamList>();
const HomeStack     = createNativeStackNavigator<HomeStackParamList>();
const RecipesStack  = createNativeStackNavigator<RecipesStackParamList>();
const PlannerStack  = createNativeStackNavigator<PlannerStackParamList>();
const ShoppingStack = createNativeStackNavigator<ShoppingStackParamList>();
const ProfileStack  = createNativeStackNavigator<ProfileStackParamList>();
const Tab           = createBottomTabNavigator<TabParamList>();

const defaultScreenOptions = {
  headerStyle: { backgroundColor: colors.background },
  headerTintColor: colors.textPrimary,
  headerShadowVisible: false,
  headerTitleStyle: { fontWeight: "700" as const, fontSize: 17 },
  headerBackTitleVisible: false,
  contentStyle: { backgroundColor: colors.background },
};

function HomeTabStack() {
  return (
    <HomeStack.Navigator screenOptions={defaultScreenOptions}>
      <HomeStack.Screen name="Dashboard" component={DashboardScreen} options={{ headerShown: false }} />
    </HomeStack.Navigator>
  );
}

function RecipesTabStack() {
  return (
    <RecipesStack.Navigator screenOptions={defaultScreenOptions}>
      <RecipesStack.Screen name="RecipesList"          component={RecipesListScreen}          options={{ headerShown: false }} />
      <RecipesStack.Screen name="RecipeDetails"        component={RecipeDetailsScreen}        options={{ headerShown: false }} />
      <RecipesStack.Screen name="CreateRecipe"         component={CreateRecipeScreen}         options={{ headerShown: false }} />
      <RecipesStack.Screen name="EditRecipe"           component={EditRecipeScreen}           options={{ title: "Editar receita" }} />
      <RecipesStack.Screen name="SuggestByIngredients" component={SuggestByIngredientsScreen} options={{ title: "O que tenho em casa?" }} />
      <RecipesStack.Screen name="History"              component={HistoryScreen}              options={{ title: "Histórico de preparo" }} />
    </RecipesStack.Navigator>
  );
}

function PlannerTabStack() {
  return (
    <PlannerStack.Navigator screenOptions={defaultScreenOptions}>
      <PlannerStack.Screen name="Planner" component={PlannerScreen} options={{ headerShown: false }} />
    </PlannerStack.Navigator>
  );
}

function ShoppingTabStack() {
  return (
    <ShoppingStack.Navigator screenOptions={defaultScreenOptions}>
      <ShoppingStack.Screen name="ShoppingLists" component={ShoppingListsScreen} options={{ headerShown: false }} />
      <ShoppingStack.Screen name="ShoppingList"  component={ShoppingListScreen}  options={{ headerShown: false }} />
    </ShoppingStack.Navigator>
  );
}

function ProfileTabStack() {
  return (
    <ProfileStack.Navigator screenOptions={defaultScreenOptions}>
      <ProfileStack.Screen name="Profile"               component={ProfileScreen}         options={{ headerShown: false }} />
      <ProfileStack.Screen name="PersonalData"          component={PersonalDataScreen}    options={{ headerShown: false }} />
      <ProfileStack.Screen name="FoodPreferences"       component={FoodPreferencesScreen} options={{ headerShown: false }} />
      <ProfileStack.Screen name="NotificationsSettings" component={NotificationsScreen}   options={{ headerShown: false }} />
      <ProfileStack.Screen name="HelpSupport"           component={HelpSupportScreen}     options={{ headerShown: false }} />
    </ProfileStack.Navigator>
  );
}

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: styles.tabBar,
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarLabelStyle: styles.tabLabel,
        tabBarIcon: ({ color, focused, size }) => {
          type Name = React.ComponentProps<typeof Ionicons>["name"];
          const icons: Record<string, [Name, Name]> = {
            HomeTab:     ["home",       "home-outline"],
            RecipesTab:  ["restaurant", "restaurant-outline"],
            PlannerTab:  ["calendar",   "calendar-outline"],
            ShoppingTab: ["cart",       "cart-outline"],
            ProfileTab:  ["person",     "person-outline"],
          };
          const [active, inactive] = icons[route.name] ?? ["ellipse", "ellipse-outline"];
          return <Ionicons name={focused ? active : inactive} size={size} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HomeTab"     component={HomeTabStack}     options={{ title: "Início" }} />
      <Tab.Screen name="RecipesTab"  component={RecipesTabStack}  options={{ title: "Receitas" }} />
      <Tab.Screen name="PlannerTab"  component={PlannerTabStack}  options={{ title: "Planejar" }} />
      <Tab.Screen name="ShoppingTab" component={ShoppingTabStack} options={{ title: "Compras" }} />
      <Tab.Screen name="ProfileTab"  component={ProfileTabStack}  options={{ title: "Perfil" }} />
    </Tab.Navigator>
  );
}

function AuthNavigator() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="Login"          component={LoginScreen} />
      <AuthStack.Screen name="Register"       component={RegisterScreen} />
      <AuthStack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <AuthStack.Screen name="ResetPassword"  component={ResetPasswordScreen} />
    </AuthStack.Navigator>
  );
}

const ONBOARDING_KEY = (id: string | number) => `@comprinhas:onboardingDone:${id}`;

export default function AppNavigator() {
  const { isAuthenticated, isLoading, user } = useSelector((s: RootState) => s.auth);
  const [onboardingChecked, setOnboardingChecked] = useState(false);
  const [showOnboarding,    setShowOnboarding]    = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      AsyncStorage.getItem(ONBOARDING_KEY(user.id))
        .then((v) => setShowOnboarding(v !== "true"))
        .catch(() => setShowOnboarding(false))
        .finally(() => setOnboardingChecked(true));
    } else {
      setOnboardingChecked(false);
      setShowOnboarding(false);
    }
  }, [isAuthenticated, user?.id]);

  async function handleOnboardingDone() {
    if (user?.id) await AsyncStorage.setItem(ONBOARDING_KEY(user.id), "true");
    setShowOnboarding(false);
  }

  if (isLoading || (isAuthenticated && !onboardingChecked)) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (isAuthenticated && showOnboarding) {
    return <OnboardingScreen onDone={handleOnboardingDone} />;
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <MainTabs /> : <AuthNavigator />}
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  loading: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: colors.background },
  tabBar: {
    backgroundColor: colors.tabBackground,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    height: Platform.OS === "ios" ? 84 : 64,
    paddingBottom: Platform.OS === "ios" ? 24 : 8,
    paddingTop: 8,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  tabLabel: { fontSize: 11, fontWeight: "600" },
});