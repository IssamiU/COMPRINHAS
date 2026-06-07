export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  ResetPassword: undefined;
};

export type HomeStackParamList = {
  Dashboard: undefined;
};

export type RecipesStackParamList = {
  RecipesList: undefined;
  RecipeDetails: { recipeId: string };
  CreateRecipe: undefined;
  EditRecipe: { recipeId: string };
  SuggestByIngredients: undefined;
  History: undefined;
};

export type PlannerStackParamList = {
  Planner: undefined;
};

export type ShoppingStackParamList = {
  ShoppingLists: undefined;
  ShoppingList: { listId: string };
};

export type ProfileStackParamList = {
  Profile: undefined;
  PersonalData: undefined;
  FoodPreferences: undefined;
  NotificationsSettings: undefined;
  HelpSupport: undefined;
};

export type TabParamList = {
  HomeTab: undefined;
  RecipesTab: undefined;
  PlannerTab: undefined;
  ShoppingTab: undefined;
  ProfileTab: undefined;
};

export type RootStackParamList =
  AuthStackParamList &
  HomeStackParamList &
  RecipesStackParamList &
  PlannerStackParamList &
  ShoppingStackParamList &
  ProfileStackParamList;