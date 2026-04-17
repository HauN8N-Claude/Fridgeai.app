import * as ImagePicker from "expo-image-picker";
import { useQueryClient } from "@tanstack/react-query";
import { Camera, Check, ScanLine } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiRequest } from "../../lib/api";
import { COLORS } from "../../lib/theme";

type DetectedIngredient = { name: string; quantity?: number; unit?: string };

type ScanResult = {
  scanId: string;
  imageUrl: string;
  ingredients: DetectedIngredient[];
};

type Step = "idle" | "uploading" | "review" | "saving" | "done";

export default function ScanScreen() {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<Step>("idle");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const pickImage = async (fromCamera: boolean) => {
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });

    if (result.canceled || !result.assets[0]) return;

    const uri = result.assets[0].uri;
    setStep("uploading");

    try {
      const formData = new FormData();
      formData.append("image", { uri, type: "image/jpeg", name: "fridge.jpg" } as unknown as Blob);

      const data = await apiRequest<ScanResult>("/api/mobile/scan", { method: "POST", formData });
      setScanResult(data);
      setSelected(new Set(data.ingredients.map((_, i) => i)));
      setStep("review");
    } catch (err) {
      Alert.alert("Erreur", (err as Error).message);
      setStep("idle");
    }
  };

  const confirmIngredients = async () => {
    if (!scanResult) return;
    setStep("saving");
    try {
      const ingredients = scanResult.ingredients.filter((_, i) => selected.has(i));
      await apiRequest("/api/mobile/scan/confirm", {
        method: "POST",
        body: { scanId: scanResult.scanId, ingredients },
      });
      queryClient.invalidateQueries({ queryKey: ["fridge"] });
      setStep("done");
    } catch (err) {
      Alert.alert("Erreur", (err as Error).message);
      setStep("review");
    }
  };

  const reset = () => {
    setStep("idle");
    setScanResult(null);
    setSelected(new Set());
  };

  const toggleItem = (index: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  if (step === "saving") {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Enregistrement...</Text>
      </SafeAreaView>
    );
  }

  if (step === "uploading") {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={styles.loadingText}>Analyse en cours...</Text>
      </SafeAreaView>
    );
  }

  if (step === "done") {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <View style={styles.doneIcon}>
          <Check size={40} color="#fff" />
        </View>
        <Text style={styles.doneTitle}>Frigo mis à jour !</Text>
        <Text style={styles.doneText}>Les aliments ont été ajoutés à votre frigo</Text>
        <Pressable style={styles.button} onPress={reset}>
          <Text style={styles.buttonText}>Scanner à nouveau</Text>
        </Pressable>
      </SafeAreaView>
    );
  }

  if (step === "review" && scanResult) {
    return (
      <SafeAreaView style={styles.safe} edges={["bottom"]}>
        <Image source={{ uri: scanResult.imageUrl }} style={styles.previewImage} />
        <Text style={styles.reviewTitle}>Aliments détectés</Text>
        <Text style={styles.reviewSubtitle}>Décochez les aliments incorrects</Text>

        <FlatList
          data={scanResult.ingredients}
          keyExtractor={(_, i) => String(i)}
          contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
          renderItem={({ item, index }) => (
            <Pressable style={styles.ingredientRow} onPress={() => toggleItem(index)}>
              <View style={[styles.checkbox, selected.has(index) && styles.checkboxSelected]}>
                {selected.has(index) && <Check size={14} color="#fff" />}
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.ingredientName}>{item.name}</Text>
                {(item.quantity || item.unit) && (
                  <Text style={styles.ingredientQty}>{[item.quantity, item.unit].filter(Boolean).join(" ")}</Text>
                )}
              </View>
            </Pressable>
          )}
        />

        <View style={styles.reviewActions}>
          <Pressable style={styles.buttonSecondary} onPress={reset}>
            <Text style={styles.buttonSecondaryText}>Recommencer</Text>
          </Pressable>
          <Pressable
            style={[styles.button, { flex: 1 }, selected.size === 0 && styles.buttonDisabled]}
            onPress={confirmIngredients}
            disabled={selected.size === 0}
          >
            <Text style={styles.buttonText}>Confirmer ({selected.size})</Text>
          </Pressable>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, styles.center]}>
      <View style={styles.iconWrap}>
        <ScanLine size={64} color={COLORS.primary} />
      </View>
      <Text style={styles.idleTitle}>Scanner votre frigo</Text>
      <Text style={styles.idleText}>Prenez une photo ou importez une image pour détecter les aliments automatiquement</Text>

      <View style={styles.idleActions}>
        <Pressable style={styles.button} onPress={() => pickImage(true)}>
          <Camera size={20} color="#fff" style={{ marginRight: 8 }} />
          <Text style={styles.buttonText}>Prendre une photo</Text>
        </Pressable>
        <Pressable style={styles.buttonSecondary} onPress={() => pickImage(false)}>
          <Text style={styles.buttonSecondaryText}>Choisir depuis la galerie</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  center: { justifyContent: "center", alignItems: "center", padding: 24, gap: 16 },
  loadingText: { fontSize: 16, color: COLORS.muted, marginTop: 8 },
  doneIcon: { backgroundColor: COLORS.primary, borderRadius: 40, padding: 16, marginBottom: 8 },
  doneTitle: { fontSize: 22, fontWeight: "700", color: COLORS.text },
  doneText: { fontSize: 15, color: COLORS.muted, textAlign: "center" },
  iconWrap: { marginBottom: 8 },
  idleTitle: { fontSize: 22, fontWeight: "700", color: COLORS.text },
  idleText: { fontSize: 15, color: COLORS.muted, textAlign: "center", lineHeight: 22 },
  idleActions: { width: "100%", gap: 12, marginTop: 8 },
  previewImage: { width: "100%", height: 200, resizeMode: "cover" },
  reviewTitle: { fontSize: 18, fontWeight: "600", color: COLORS.text, paddingHorizontal: 16, marginTop: 12 },
  reviewSubtitle: { fontSize: 13, color: COLORS.muted, paddingHorizontal: 16, marginBottom: 8 },
  ingredientRow: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 14, gap: 12, borderWidth: 1, borderColor: COLORS.border },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: COLORS.border, justifyContent: "center", alignItems: "center" },
  checkboxSelected: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  ingredientName: { fontSize: 15, fontWeight: "500", color: COLORS.text },
  ingredientQty: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  reviewActions: { flexDirection: "row", gap: 12, padding: 16 },
  button: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  buttonSecondary: { borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: "center" },
  buttonSecondaryText: { color: COLORS.primary, fontSize: 16, fontWeight: "600" },
});
