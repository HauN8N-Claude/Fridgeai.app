import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiRequest } from "../../lib/api";
import { COLORS } from "../../lib/theme";

type Meal = { id: string; mealType: string; recipeName: string; description?: string };
type MealPlanDay = { id: string; date: string; dayNumber: number; meals: Meal[] };
type MealPlan = { id: string; duration: number; days: MealPlanDay[] };

const MEAL_LABELS: Record<string, string> = {
  breakfast: "Petit-déjeuner",
  lunch: "Déjeuner",
  dinner: "Dîner",
};

const MEAL_ORDER = ["breakfast", "lunch", "dinner"];

const DURATIONS = [
  { label: "3 jours", value: 3 },
  { label: "5 jours", value: 5 },
  { label: "7 jours", value: 7 },
];

const DAY_NAMES = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

export default function MealPlanScreen() {
  const queryClient = useQueryClient();
  const [duration, setDuration] = useState(7);

  const { data: plan, isLoading } = useQuery<MealPlan | null>({
    queryKey: ["meal-plan"],
    queryFn: () => apiRequest("/api/mobile/meal-plan").catch(() => null),
  });

  const generateMutation = useMutation({
    mutationFn: () => apiRequest("/api/mobile/meal-plan", { method: "POST", body: { duration } }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["meal-plan"] }),
    onError: (err) => Alert.alert("Erreur", (err as Error).message),
  });

  const confirmGenerate = () => {
    if (plan) {
      Alert.alert("Nouveau plan", "Cela remplacera le plan actuel. Continuer ?", [
        { text: "Annuler", style: "cancel" },
        { text: "Générer", onPress: () => generateMutation.mutate() },
      ]);
    } else {
      generateMutation.mutate();
    }
  };

  const getDayLabel = (day: MealPlanDay) => {
    const date = new Date(day.date);
    return `${DAY_NAMES[date.getDay() === 0 ? 6 : date.getDay() - 1]} ${date.getDate()}`;
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 16 }}>
        {/* Duration selector */}
        <View style={styles.durationRow}>
          {DURATIONS.map((d) => (
            <Pressable
              key={d.value}
              style={[styles.durationBtn, duration === d.value && styles.durationBtnActive]}
              onPress={() => setDuration(d.value)}
            >
              <Text style={[styles.durationText, duration === d.value && styles.durationTextActive]}>
                {d.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Generate button */}
        <Pressable
          style={[styles.generateBtn, generateMutation.isPending && styles.btnDisabled]}
          onPress={confirmGenerate}
          disabled={generateMutation.isPending}
        >
          {generateMutation.isPending ? (
            <>
              <ActivityIndicator color="#fff" />
              <Text style={styles.generateText}>Génération en cours...</Text>
            </>
          ) : (
            <>
              <Sparkles size={18} color="#fff" />
              <Text style={styles.generateText}>
                {plan ? "Régénérer le plan" : "Générer mon plan"}
              </Text>
            </>
          )}
        </Pressable>

        {isLoading && <ActivityIndicator color={COLORS.primary} />}

        {!isLoading && !plan && !generateMutation.isPending && (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>Aucun plan actif</Text>
            <Text style={styles.emptyText}>
              Appuyez sur "Générer mon plan" pour créer un plan de repas basé sur votre frigo et vos préférences.
            </Text>
          </View>
        )}

        {plan?.days.map((day) => (
          <View key={day.id} style={styles.dayCard}>
            <Text style={styles.dayTitle}>{getDayLabel(day)}</Text>
            {MEAL_ORDER.map((mealType) => {
              const meal = day.meals.find((m) => m.mealType === mealType);
              if (!meal) return null;
              return (
                <View key={meal.id} style={styles.mealRow}>
                  <Text style={styles.mealType}>{MEAL_LABELS[mealType]}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.mealName}>{meal.recipeName}</Text>
                    {meal.description && (
                      <Text style={styles.mealDesc} numberOfLines={2}>{meal.description}</Text>
                    )}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  durationRow: { flexDirection: "row", gap: 8 },
  durationBtn: { flex: 1, borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 10, padding: 10, alignItems: "center" },
  durationBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  durationText: { fontSize: 14, fontWeight: "500", color: COLORS.muted },
  durationTextActive: { color: COLORS.primary },
  generateBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: "center", flexDirection: "row", justifyContent: "center", gap: 8 },
  btnDisabled: { opacity: 0.6 },
  generateText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  empty: { alignItems: "center", paddingVertical: 32, gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: COLORS.text },
  emptyText: { fontSize: 14, color: COLORS.muted, textAlign: "center", lineHeight: 20 },
  dayCard: { backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: COLORS.border, overflow: "hidden" },
  dayTitle: { fontSize: 14, fontWeight: "700", color: COLORS.primary, padding: 12, paddingBottom: 8, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  mealRow: { flexDirection: "row", gap: 12, padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  mealType: { fontSize: 11, fontWeight: "600", color: COLORS.muted, width: 80, paddingTop: 2, textTransform: "uppercase" },
  mealName: { fontSize: 14, fontWeight: "500", color: COLORS.text },
  mealDesc: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
});
