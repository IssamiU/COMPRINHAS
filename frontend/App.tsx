import "react-native-gesture-handler";
import React, { useEffect } from "react";
import { Linking } from "react-native";
import { StatusBar } from "expo-status-bar";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { SafeAreaProvider } from "react-native-safe-area-context";

import AppNavigator, { navigationRef } from "./src/navigation";
import { store, persistor } from "./src/store";
import AuthBootstrap from "./src/components/AuthBootstrap";

// RF14 — handler de deep links (mealsync://recipe/:id)
function handleDeepLink(url: string) {
  const match = url.match(/mealsync:\/\/recipe\/([^/]+)/);
  if (!match) return;
  const recipeId = match[1];
  if (navigationRef.isReady()) {
    (navigationRef as any).navigate("RecipesTab", {
      screen: "RecipeDetails",
      params: { recipeId },
    });
  }
}

export default function App() {
  useEffect(() => {
    // RF14 — abrir link enquanto o app já está aberto
    const sub = Linking.addEventListener("url", ({ url }) => handleDeepLink(url));

    // RF14 — abrir link quando o app foi lançado pelo link (estava fechado)
    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink(url);
    });

    return () => sub.remove();
  }, []);

  return (
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <SafeAreaProvider>
          <AuthBootstrap>
            <StatusBar style="auto" />
            <AppNavigator />
          </AuthBootstrap>
        </SafeAreaProvider>
      </PersistGate>
    </Provider>
  );
}
