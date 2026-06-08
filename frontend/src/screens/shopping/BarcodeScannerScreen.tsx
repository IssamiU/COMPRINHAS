// RF11 — Scanner de código de barras com Open Food Facts
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { CameraView, useCameraPermissions } from "expo-camera";
import { Ionicons } from "@expo/vector-icons";
import { useDispatch, useSelector } from "react-redux";

import { RootState } from "../../store";
import { addShoppingListItem } from "../../store/slices/shoppingListSlice";
import { API_URL } from "../../services/api";
// RF23 — cores reativas ao tema claro/escuro
import { useTheme } from "../../theme/ThemeContext";

type ScanState = "idle" | "loading" | "found" | "notfound" | "error";

const BOX    = 260;
const CORNER = 24;
const BORDER = 3;

export default function BarcodeScannerScreen({ navigation, route }: any) {
  const { colors } = useTheme();
  const { listId } = route.params as { listId: string };
  const dispatch = useDispatch();
  const userId   = useSelector((s: RootState) => String(s.auth.user?.id ?? ""));

  const [permission, requestPermission] = useCameraPermissions();
  const [scanState, setScanState] = useState<ScanState>("idle");
  const [resultName, setResultName] = useState("");
  const processingRef = useRef(false);

  const styles = useMemo(() => StyleSheet.create({
    container:   { flex: 1, backgroundColor: "#000" },
    safe:        { flex: 1, backgroundColor: colors.background },
    center:      { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
    permText:    { fontSize: 15, color: colors.textSecondary, textAlign: "center" },
    permBtn:     { backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, paddingHorizontal: 32 },
    permBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    backTextBtn:     { paddingVertical: 10 },
    backTextBtnText: { color: colors.textSecondary, fontSize: 14 },
    headerOverlay: {
      position: "absolute", top: 0, left: 0, right: 0,
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 16, paddingBottom: 12,
      backgroundColor: "rgba(0,0,0,0.45)",
    },
    closeBtn: { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
    title:    { fontSize: 17, fontWeight: "700", color: "#fff" },
    overlayTop:    { position: "absolute", top: 0, left: 0, right: 0, bottom: "50%", marginBottom: BOX / 2, backgroundColor: "rgba(0,0,0,0.5)" },
    overlayBottom: { position: "absolute", bottom: 0, left: 0, right: 0, top: "50%", marginTop: BOX / 2, backgroundColor: "rgba(0,0,0,0.5)" },
    overlayLeft:   { position: "absolute", top: "50%", bottom: "50%", left: 0, right: "50%", marginTop: -(BOX / 2), marginBottom: -(BOX / 2), marginRight: BOX / 2, backgroundColor: "rgba(0,0,0,0.5)" },
    overlayRight:  { position: "absolute", top: "50%", bottom: "50%", right: 0, left: "50%", marginTop: -(BOX / 2), marginBottom: -(BOX / 2), marginLeft: BOX / 2, backgroundColor: "rgba(0,0,0,0.5)" },
    scanBox: { position: "absolute", alignSelf: "center", top: "50%", marginTop: -(BOX / 2), width: BOX, height: BOX },
    corner:  { position: "absolute", width: CORNER, height: CORNER, borderColor: "#fff", borderWidth: BORDER },
    tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 6 },
    tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 6 },
    bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 6 },
    br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 6 },
    hintBox: { position: "absolute", bottom: 80, left: 0, right: 0, alignItems: "center" },
    hint:    { color: "#fff", fontSize: 14, textAlign: "center", backgroundColor: "rgba(0,0,0,0.5)", paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    panel: {
      position: "absolute", bottom: 0, left: 0, right: 0,
      backgroundColor: colors.surface,
      borderTopLeftRadius: 24, borderTopRightRadius: 24,
      padding: 28, paddingBottom: 44,
      alignItems: "center", gap: 8,
      shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 16, elevation: 20,
    },
    panelIcon:      { marginBottom: 4 },
    panelTitle:     { fontSize: 18, fontWeight: "700", color: colors.textPrimary, textAlign: "center" },
    panelSub:       { fontSize: 14, color: colors.textSecondary, textAlign: "center", paddingHorizontal: 8 },
    panelBtns:      { flexDirection: "row", gap: 12, marginTop: 12, width: "100%" },
    btnPrimary:     { flex: 1, backgroundColor: colors.primary, borderRadius: 12, paddingVertical: 14, alignItems: "center" },
    btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 15 },
    btnSecondary:   { flex: 1, borderRadius: 12, paddingVertical: 14, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 6, borderWidth: 1, borderColor: colors.primary },
    btnSecondaryText: { color: colors.primary, fontWeight: "700", fontSize: 15 },
  }), [colors]);

  if (!permission) return <View style={styles.container} />;

  if (!permission.granted) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={64} color={colors.textMuted} />
          <Text style={styles.permText}>Permissão de câmera necessária para escanear produtos.</Text>
          <Pressable style={styles.permBtn} onPress={requestPermission}>
            <Text style={styles.permBtnText}>Permitir câmera</Text>
          </Pressable>
          <Pressable style={styles.backTextBtn} onPress={() => navigation.goBack()}>
            <Text style={styles.backTextBtnText}>Voltar</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  async function handleBarcode({ data }: { data: string }) {
    if (processingRef.current) return;
    processingRef.current = true;
    setScanState("loading");
    try {
      const res  = await fetch(`${API_URL}/proxy/barcode/${encodeURIComponent(data)}`);
      const json = await res.json() as { name: string; category: string };
      if (!json.name) {
        setScanState("notfound");
      } else {
        dispatch(addShoppingListItem({
          listId, userId,
          item: { id: Date.now().toString(), name: json.name, quantity: 1, unit: "unidade", checked: false, category: json.category },
        }));
        setResultName(json.name);
        setScanState("found");
      }
    } catch {
      setScanState("error");
    }
  }

  function resetScan() { processingRef.current = false; setScanState("idle"); setResultName(""); }
  const showPanel = scanState !== "idle";

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        barcodeScannerSettings={{ barcodeTypes: ["ean13", "ean8", "upc_a", "upc_e", "code128", "code39"] }}
        onBarcodeScanned={processingRef.current ? undefined : handleBarcode}
      />
      <View style={styles.overlayTop} />
      <View style={styles.overlayBottom} />
      <View style={styles.overlayLeft} />
      <View style={styles.overlayRight} />
      <View style={styles.scanBox}>
        <View style={[styles.corner, styles.tl]} />
        <View style={[styles.corner, styles.tr]} />
        <View style={[styles.corner, styles.bl]} />
        <View style={[styles.corner, styles.br]} />
      </View>
      <SafeAreaView style={styles.headerOverlay}>
        <Pressable style={styles.closeBtn} onPress={() => navigation.goBack()} hitSlop={12}>
          <Ionicons name="close" size={28} color="#fff" />
        </Pressable>
        <Text style={styles.title}>Escanear produto</Text>
        <View style={{ width: 44 }} />
      </SafeAreaView>
      {scanState === "idle" && (
        <View style={styles.hintBox}>
          <Text style={styles.hint}>Aponte a câmera para o código de barras</Text>
        </View>
      )}
      {showPanel && (
        <View style={styles.panel}>
          {scanState === "loading" && (
            <><ActivityIndicator color={colors.primary} size="large" /><Text style={styles.panelTitle}>Consultando produto...</Text></>
          )}
          {scanState === "found" && (
            <>
              <View style={styles.panelIcon}><Ionicons name="checkmark-circle" size={40} color={colors.primary} /></View>
              <Text style={styles.panelTitle}>Adicionado!</Text>
              <Text style={styles.panelSub} numberOfLines={2}>"{resultName}" foi adicionado à lista.</Text>
              <View style={styles.panelBtns}>
                <Pressable style={styles.btnSecondary} onPress={resetScan}>
                  <Ionicons name="scan-outline" size={16} color={colors.primary} />
                  <Text style={styles.btnSecondaryText}>Escanear mais</Text>
                </Pressable>
                <Pressable style={styles.btnPrimary} onPress={() => navigation.goBack()}>
                  <Text style={styles.btnPrimaryText}>Voltar à lista</Text>
                </Pressable>
              </View>
            </>
          )}
          {scanState === "notfound" && (
            <>
              <View style={styles.panelIcon}><Ionicons name="search-outline" size={40} color={colors.textMuted} /></View>
              <Text style={styles.panelTitle}>Produto não encontrado</Text>
              <Text style={styles.panelSub}>Código não encontrado na base de dados.</Text>
              <View style={styles.panelBtns}>
                <Pressable style={styles.btnSecondary} onPress={resetScan}>
                  <Ionicons name="scan-outline" size={16} color={colors.primary} />
                  <Text style={styles.btnSecondaryText}>Tentar outro</Text>
                </Pressable>
                <Pressable style={styles.btnPrimary} onPress={() => navigation.goBack()}>
                  <Text style={styles.btnPrimaryText}>Voltar</Text>
                </Pressable>
              </View>
            </>
          )}
          {scanState === "error" && (
            <>
              <View style={styles.panelIcon}><Ionicons name="wifi-outline" size={40} color={colors.danger} /></View>
              <Text style={styles.panelTitle}>Erro de conexão</Text>
              <Text style={styles.panelSub}>Verifique a conexão com a internet e o servidor.</Text>
              <View style={styles.panelBtns}>
                <Pressable style={[styles.btnSecondary, { flex: 1 }]} onPress={resetScan}>
                  <Text style={styles.btnSecondaryText}>Tentar novamente</Text>
                </Pressable>
              </View>
            </>
          )}
        </View>
      )}
    </View>
  );
}
