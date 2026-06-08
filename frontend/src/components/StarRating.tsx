// RF21 — Componente de avaliação por estrelas
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors } from "../theme/colors";

type Props = {
  rating: number;
  maxStars?: number;
  size?: number;
  interactive?: boolean;
  onRate?: (rating: number) => void;
};

export default function StarRating({
  rating,
  maxStars = 5,
  size = 20,
  interactive = false,
  onRate,
}: Props) {
  return (
    <View style={styles.row}>
      {Array.from({ length: maxStars }, (_, i) => {
        const filled = i < Math.round(rating);
        if (interactive) {
          return (
            <Pressable key={i} onPress={() => onRate?.(i + 1)} hitSlop={6}>
              <Ionicons
                name={filled ? "star" : "star-outline"}
                size={size}
                color={filled ? "#F59E0B" : colors.border}
              />
            </Pressable>
          );
        }
        return (
          <Ionicons
            key={i}
            name={filled ? "star" : "star-outline"}
            size={size}
            color={filled ? "#F59E0B" : colors.border}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", gap: 2 },
});
