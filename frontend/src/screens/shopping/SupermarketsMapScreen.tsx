// RF19 — Mapa de supermercados próximos via OpenStreetMap (Overpass API)
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import MapView, { Marker } from "react-native-maps";
import * as Location from "expo-location";
import { Ionicons } from "@expo/vector-icons";

import { API_URL } from "../../services/api";
import { getAuth } from "../../storage/authStorage";
import { colors } from "../../theme/colors";

interface Supermarket {
  id: string;
  name: string;
  type: string;
  lat: number;
  lng: number;
  address: string | null;
}

// Diagnóstico: mostra exatamente o que falhou no console do Expo
async function debugFetch(url: string, options: RequestInit): Promise<Response> {
  console.log("[RF19-frontend] Chamando:", url);
  const res = await fetch(url, options);
  console.log("[RF19-frontend] Status HTTP:", res.status);
  return res;
}

function haversineMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(Δφ / 2) ** 2 + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;
  return Math.round(2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
}

function formatDist(meters: number): string {
  return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`;
}

export default function SupermarketsMapScreen({ navigation }: any) {
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [markets, setMarkets]   = useState<Supermarket[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const mapRef      = useRef<MapView>(null);
  const markerRefs  = useRef<Map<string, any>>(new Map());
  const listRef     = useRef<FlatList>(null);

  useEffect(() => { loadData(); }, []);

  function selectMarket(m: Supermarket, fromList = false) {
    setSelectedId(m.id);
    // Zoom no mapa centralizado no marcador selecionado
    mapRef.current?.animateToRegion(
      { latitude: m.lat, longitude: m.lng, latitudeDelta: 0.008, longitudeDelta: 0.008 },
      500,
    );
    // Mostra o callout nativo (título + endereço) após a animação terminar
    setTimeout(() => { markerRefs.current.get(m.id)?.showCallout(); }, 550);
    // Se a seleção veio do mapa, rola a lista até o item correspondente
    if (!fromList) {
      const idx = sortedMarkets.findIndex((s) => s.id === m.id);
      if (idx >= 0) listRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0.3 });
    }
  }

  async function loadData() {
    try {
      setLoading(true);
      setError(null);

      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setError("permission");
        setLoading(false);
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      setLocation({ lat, lng });

      const auth = await getAuth();
      if (!auth) {
        console.warn("[RF19-frontend] Auth nulo — usuário não autenticado");
        setError("network");
        return;
      }

      const res = await debugFetch(`${API_URL}/proxy/supermarkets?lat=${lat}&lng=${lng}`, {
        headers: { Authorization: `Bearer ${auth.accessToken}` },
      });

      if (!res.ok) {
        console.warn("[RF19-frontend] Backend retornou erro HTTP:", res.status);
        setError("network");
        return;
      }

      const data = await res.json();
      console.log("[RF19-frontend] Resposta do backend:", JSON.stringify(data).slice(0, 200));
      if (Array.isArray(data)) {
        setMarkets(data);
      } else {
        console.warn("[RF19-frontend] Resposta não é array:", typeof data, data);
      }
    } catch (e: any) {
      console.error("[RF19-frontend] Erro:", e?.message);
      setError("network");
    } finally {
      setLoading(false);
    }
  }

  const sortedMarkets = location
    ? [...markets].sort(
        (a, b) =>
          haversineMeters(location.lat, location.lng, a.lat, a.lng) -
          haversineMeters(location.lat, location.lng, b.lat, b.lng)
      )
    : markets;

  return (
    <SafeAreaView style={styles.safe} edges={["top"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} accessibilityLabel="Voltar" accessibilityRole="button">
          <Ionicons name="arrow-back" size={22} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.headerTitle}>Supermercados</Text>
        <Pressable style={styles.reloadBtn} onPress={loadData} accessibilityLabel="Recarregar" accessibilityRole="button">
          <Ionicons name="refresh-outline" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {/* Estado: carregando */}
      {loading && (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.centerText}>Obtendo localização...</Text>
        </View>
      )}

      {/* Estado: sem permissão */}
      {!loading && error === "permission" && (
        <View style={styles.center}>
          <Ionicons name="location-outline" size={52} color={colors.textMuted} />
          <Text style={styles.errorTitle}>Localização necessária</Text>
          <Text style={styles.errorText}>
            Permita o acesso à localização para encontrar supermercados próximos a você.
          </Text>
          <Pressable style={styles.actionBtn} onPress={() => Linking.openSettings()}>
            <Text style={styles.actionBtnText}>Abrir configurações</Text>
          </Pressable>
        </View>
      )}

      {/* Estado: erro de rede */}
      {!loading && error === "network" && (
        <View style={styles.center}>
          <Ionicons name="wifi-outline" size={52} color={colors.textMuted} />
          <Text style={styles.errorTitle}>Erro de conexão</Text>
          <Text style={styles.errorText}>
            Não foi possível buscar os supermercados. Verifique sua conexão e tente novamente.
          </Text>
          <Pressable style={styles.actionBtn} onPress={loadData}>
            <Text style={styles.actionBtnText}>Tentar novamente</Text>
          </Pressable>
        </View>
      )}

      {/* Estado: dados carregados */}
      {!loading && !error && location && (
        <View style={styles.content}>
          {/* Mapa */}
          <MapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: location.lat,
              longitude: location.lng,
              latitudeDelta: 0.045,
              longitudeDelta: 0.045,
            }}
            showsUserLocation
            showsMyLocationButton
          >
            {sortedMarkets.map((m) => (
              <Marker
                key={m.id}
                ref={(ref) => { if (ref) markerRefs.current.set(m.id, ref); }}
                coordinate={{ latitude: m.lat, longitude: m.lng }}
                title={m.name}
                description={m.address ?? m.type ?? ""}
                pinColor={selectedId === m.id ? colors.primary : "#EF4444"}
                onPress={() => selectMarket(m, false)}
              />
            ))}
          </MapView>

          {/* Lista */}
          <FlatList
            ref={listRef}
            data={sortedMarkets}
            keyExtractor={(item) => item.id}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            onScrollToIndexFailed={() => {}}
            ListHeaderComponent={
              <Text style={styles.listHeader}>
                {markets.length === 0
                  ? "Nenhum supermercado encontrado no raio de 5 km\n(dados do OpenStreetMap podem ser limitados nesta região)"
                  : `${markets.length} supermercado${markets.length !== 1 ? "s" : ""} encontrado${markets.length !== 1 ? "s" : ""}`}
              </Text>
            }
            renderItem={({ item }) => {
              const dist = haversineMeters(location.lat, location.lng, item.lat, item.lng);
              const active = selectedId === item.id;
              const subtitle = item.address ?? item.type ?? null;
              return (
                <Pressable
                  style={[styles.marketCard, active && styles.marketCardActive]}
                  onPress={() => selectMarket(item, true)}
                  accessibilityLabel={item.name}
                  accessibilityRole="button"
                >
                  <View style={[styles.marketIcon, active && styles.marketIconActive]}>
                    <Ionicons name="storefront-outline" size={18} color={active ? "#fff" : colors.primary} />
                  </View>
                  <View style={styles.marketInfo}>
                    <Text style={[styles.marketName, active && styles.marketNameActive]} numberOfLines={1}>
                      {item.name}
                    </Text>
                    {subtitle ? (
                      <Text style={[styles.marketAddress, active && styles.marketAddressActive]} numberOfLines={1}>
                        {subtitle}
                      </Text>
                    ) : null}
                  </View>
                  <Text style={[styles.marketDist, active && styles.marketDistActive]}>
                    {formatDist(dist)}
                  </Text>
                </Pressable>
              );
            }}
          />
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe:    { flex: 1, backgroundColor: colors.background },
  header:  { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingTop: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: colors.border },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  reloadBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary },

  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  centerText: { fontSize: 14, color: colors.textSecondary },
  errorTitle: { fontSize: 18, fontWeight: "700", color: colors.textPrimary, textAlign: "center" },
  errorText:  { fontSize: 14, color: colors.textSecondary, textAlign: "center", lineHeight: 20 },
  actionBtn:  { marginTop: 8, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24 },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 14 },

  content: { flex: 1 },
  map: { height: 300 },

  list:        { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 24 },
  listHeader:  { fontSize: 13, color: colors.textMuted, fontWeight: "600", paddingVertical: 10 },

  marketCard: { flexDirection: "row", alignItems: "center", backgroundColor: colors.surface, borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: colors.border, gap: 12 },
  marketCardActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  marketIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: colors.primaryLight, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  marketIconActive: { backgroundColor: "rgba(255,255,255,0.2)" },
  marketInfo: { flex: 1 },
  marketName: { fontSize: 14, fontWeight: "700", color: colors.textPrimary },
  marketNameActive: { color: "#fff" },
  marketAddress: { fontSize: 12, color: colors.textMuted, marginTop: 2 },
  marketAddressActive: { color: "rgba(255,255,255,0.75)" },
  marketDist: { fontSize: 13, fontWeight: "700", color: colors.primary, flexShrink: 0 },
  marketDistActive: { color: "#fff" },
});
