// RF23 — Modo escuro automático com sensor de luz (LightSensor) + fallback useColorScheme
import React, { createContext, useContext, useEffect, useState } from "react";
import { Appearance } from "react-native";
import { LightSensor } from "expo-sensors";

import { colors as lightColors } from "./colors";
import { colors as darkColors } from "./darkColors";

export type ThemeColors = typeof lightColors;

interface ThemeContextValue {
  colors: ThemeColors;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: lightColors,
  isDark: false,
});

// Abaixo de 10 lux = ambiente escuro (ex.: quarto à noite)
const DARK_LUX_THRESHOLD = 10;

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [isDark, setIsDark] = useState(Appearance.getColorScheme() === "dark");

  useEffect(() => {
    let subscription: { remove: () => void } | null = null;

    LightSensor.isAvailableAsync()
      .then((available) => {
        if (available) {
          LightSensor.setUpdateInterval(2000);
          const sub = LightSensor.addListener(({ illuminance }) => {
            setIsDark(illuminance < DARK_LUX_THRESHOLD);
          });
          subscription = { remove: () => sub.remove() };
        } else {
          // Fallback: segue o tema do sistema operacional
          const handler = Appearance.addChangeListener(({ colorScheme }) => {
            setIsDark(colorScheme === "dark");
          });
          subscription = { remove: () => handler.remove() };
        }
      })
      .catch(() => {
        // Sensor indisponível ou sem permissão — usa tema do SO
        setIsDark(Appearance.getColorScheme() === "dark");
      });

    return () => {
      subscription?.remove();
    };
  }, []);

  return (
    <ThemeContext.Provider value={{ colors: isDark ? darkColors : lightColors, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
