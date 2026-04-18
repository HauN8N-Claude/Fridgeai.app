import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
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
import { Calendar, ChevronRight, Crown, RefreshCw, ShoppingCart } from "lucide-react-native";
import { apiRequest } from "../../lib/api";
import { COLORS } from "../../lib/theme";
import { useAuthStore } from "../../store/auth-store";
import { useSubscriptionStore } from "../../store/subscription-store";

type MealPlan = {
  id: string;
  createdAt: string;
  duration: number;
  shoppingItemsCount?: number;
};

type Preferences = {
  dietaryType: string | null;
  allergies: string[];
  numberOfPeople: number | null;
};

const DIETARY_OPTIONS = [
  { label: "Omnivore", value: "omnivore" },
  { label: "Flexitarien", value: "flexitarian" },
  { label: "Végétarien", value: "vegetarian" },
  { label: "Végan", value: "vegan" },
  { label: "Pescétarien", value: "pescatarian" },
];

const ALLERGY_OPTIONS = [
  { label: "Gluten", value: "gluten" },
  { label: "Lactose", value: "dairy" },
  { label: "Arachides", value: "peanuts" },
  { label: "Fruits à coque", value: "tree_nuts" },
  { label: "Œufs", value: "eggs" },
  { label: "Soja", value: "soy" },
  { label: "Fruits de mer", value: "shellfish" },
];

const PEOPLE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];

function Select<T extends string | number>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { label: string; value: T }[];
  value: T | null;
  onChange: (v: T) => void;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.optionsWrap}>
        {options.map((opt) => (
          <Pressable
            key={String(opt.value)}
            style={[styles.optionBtn, value === opt.value && styles.optionBtnActive]}
            onPress={() => onChange(opt.value)}
          >
            <Text style={[styles.optionText, value === opt.value && styles.optionTextActive]}>
              {opt.label}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function AllergySelector({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const toggle = (allergy: string) => {
    onChange(value.includes(allergy) ? value.filter((a) => a !== allergy) : [...value, allergy]);
  };
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Allergies</Text>
      <View style={styles.optionsWrap}>
        {ALLERGY_OPTIONS.map((opt) => {
          const active = value.includes(opt.value);
          return (
            <Pressable
              key={opt.value}
              style={[styles.optionBtn, active && styles.optionBtnActive]}
              onPress={() => toggle(opt.value)}
            >
              <Text style={[styles.optionText, active && styles.optionTextActive]}>{opt.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, org, logout, resetOnboarding } = useAuthStore();
  const { isPremium, customerInfo } = useSubscriptionStore();
  const queryClient = useQueryClient();
  const router = useRouter();

  const { data: prefs, isLoading } = useQuery<Preferences>({
    queryKey: ["preferences"],
    queryFn: () => apiRequest("/api/mobile/preferences"),
  });

  const { data: mealPlans } = useQuery<MealPlan[]>({
    queryKey: ["meal-plans-history"],
    queryFn: () => apiRequest("/api/mobile/meal-plan/history"),
    select: (data) => data.slice(0, 3),
  });

  const [dietary, setDietary] = useState<string | null>(null);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [people, setPeople] = useState<number | null>(null);
  const [initialized, setInitialized] = useState(false);

  if (prefs && !initialized) {
    setDietary(prefs.dietaryType);
    setAllergies(prefs.allergies ?? []);
    setPeople(prefs.numberOfPeople);
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/mobile/preferences", {
        method: "POST",
        body: { dietaryType: dietary, allergies, numberOfPeople: people },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["preferences"] });
      Alert.alert("Sauvegardé", "Vos préférences ont été mises à jour.");
    },
    onError: (err) => Alert.alert("Erreur", (err as Error).message),
  });

  const handleLogout = () => {
    Alert.alert("Déconnexion", "Voulez-vous vous déconnecter ?", [
      { text: "Annuler", style: "cancel" },
      { text: "Déconnexion", style: "destructive", onPress: logout },
    ]);
  };

  const handleRefaireQuiz = () => {
    Alert.alert(
      "Refaire le quiz",
      "Vos préférences actuelles seront remplacées. Continuer ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Continuer",
          onPress: () => {
            resetOnboarding();
          },
        },
      ]
    );
  };

  const activePlan = customerInfo?.entitlements.active["premium"];
  const planLabel = !isPremium
    ? "Plan Gratuit"
    : activePlan?.productIdentifier === "fridai_lifetime"
    ? "À vie"
    : activePlan?.productIdentifier === "fridai_annual"
    ? "Annuel"
    : "Mensuel";

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* User card */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? "?"}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            {org && <Text style={styles.orgName}>{org.name}</Text>}
          </View>
        </View>

        {/* Subscription section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Abonnement</Text>

          <View style={[styles.planCard, isPremium && styles.planCardPremium]}>
            <View style={styles.planCardLeft}>
              <Crown size={18} color={isPremium ? COLORS.accent : COLORS.muted} />
              <View>
                <Text style={styles.planName}>{planLabel}</Text>
                {isPremium && activePlan?.expirationDate && (
                  <Text style={styles.planExpiry}>
                    Expire le {new Date(activePlan.expirationDate).toLocaleDateString("fr-FR")}
                  </Text>
                )}
                {!isPremium && (
                  <Text style={styles.planSub}>1 scan gratuit · liste de courses verrouillée</Text>
                )}
              </View>
            </View>
            {!isPremium && (
              <Pressable
                style={styles.upgradeBtn}
                onPress={() => router.push("/paywall" as any)}
              >
                <Text style={styles.upgradeBtnText}>Upgrader</Text>
                <ChevronRight size={14} color="#fff" />
              </Pressable>
            )}
          </View>
        </View>

        {/* Preferences */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Préférences alimentaires</Text>

          {isLoading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : (
            <>
              <Select
                label="Régime alimentaire"
                options={DIETARY_OPTIONS}
                value={dietary}
                onChange={setDietary}
              />
              <AllergySelector value={allergies} onChange={setAllergies} />
              <Select
                label="Nombre de personnes"
                options={PEOPLE_OPTIONS.map((n) => ({ label: String(n), value: n }))}
                value={people}
                onChange={setPeople}
              />

              <Pressable
                style={[styles.saveBtn, saveMutation.isPending && styles.btnDisabled]}
                onPress={() => saveMutation.mutate()}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.saveBtnText}>Sauvegarder</Text>
                )}
              </Pressable>
            </>
          )}
        </View>

        {/* Historique des plans */}
        {mealPlans && mealPlans.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Derniers plans</Text>
            {mealPlans.map((plan) => (
              <View key={plan.id} style={styles.historyRow}>
                <View style={styles.historyIcon}>
                  <Calendar size={16} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.historyDate}>
                    {new Date(plan.createdAt).toLocaleDateString("fr-FR", {
                      day: "numeric",
                      month: "long",
                    })}
                  </Text>
                  <Text style={styles.historyMeta}>
                    Plan {plan.duration}j
                    {plan.shoppingItemsCount ? ` · ${plan.shoppingItemsCount} articles` : ""}
                  </Text>
                </View>
                <ShoppingCart size={16} color={COLORS.muted} />
              </View>
            ))}
          </View>
        )}

        {/* Refaire le quiz */}
        <Pressable style={styles.quizBtn} onPress={handleRefaireQuiz}>
          <RefreshCw size={16} color={COLORS.primary} />
          <Text style={styles.quizBtnText}>Refaire le quiz de personnalisation</Text>
          <ChevronRight size={16} color={COLORS.muted} />
        </Pressable>

        {/* Logout */}
        <Pressable style={styles.logoutBtn} onPress={handleLogout}>
          <Text style={styles.logoutText}>Déconnexion</Text>
        </Pressable>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 16, gap: 16, paddingBottom: 40 },

  userCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 22, fontWeight: "700", color: COLORS.primary },
  userName: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  userEmail: { fontSize: 13, color: COLORS.muted },
  orgName: { fontSize: 12, color: COLORS.primary, marginTop: 2 },

  section: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sectionTitle: { fontSize: 16, fontWeight: "700", color: COLORS.text },

  planCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.background,
    borderRadius: 10,
    padding: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  planCardPremium: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  planCardLeft: { flexDirection: "row", alignItems: "center", gap: 10, flex: 1 },
  planName: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  planExpiry: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  planSub: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  upgradeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  upgradeBtnText: { color: "#fff", fontSize: 13, fontWeight: "700" },

  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: "500", color: COLORS.text },
  optionsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  optionBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  optionText: { fontSize: 13, color: COLORS.muted, fontWeight: "500" },
  optionTextActive: { color: COLORS.primary },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
    marginTop: 4,
  },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },

  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  historyDate: { fontSize: 14, fontWeight: "600", color: COLORS.text },
  historyMeta: { fontSize: 12, color: COLORS.muted, marginTop: 1 },

  quizBtn: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  quizBtnText: { flex: 1, fontSize: 14, fontWeight: "500", color: COLORS.text },

  logoutBtn: {
    borderWidth: 1.5,
    borderColor: COLORS.destructive,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  logoutText: { color: COLORS.destructive, fontSize: 15, fontWeight: "600" },
});
