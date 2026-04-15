import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
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
import { useAuthStore } from "../../store/auth-store";

type Preferences = {
  dietaryType: string | null;
  allergies: string[];
  numberOfPeople: number | null;
};

const DIETARY_OPTIONS = [
  { label: "Aucun", value: "none" },
  { label: "Végétarien", value: "vegetarian" },
  { label: "Végétalien", value: "vegan" },
  { label: "Pescétarien", value: "pescatarian" },
  { label: "Sans gluten", value: "gluten_free" },
  { label: "Sans lactose", value: "dairy_free" },
  { label: "Cétogène", value: "keto" },
  { label: "Paléo", value: "paleo" },
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
  const { user, org, logout } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: prefs, isLoading } = useQuery<Preferences>({
    queryKey: ["preferences"],
    queryFn: () => apiRequest("/api/mobile/preferences"),
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

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 20 }}>
        {/* User info */}
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{user?.name?.[0]?.toUpperCase() ?? "?"}</Text>
          </View>
          <View>
            <Text style={styles.userName}>{user?.name}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
            {org && <Text style={styles.orgName}>{org.name}</Text>}
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
  userCard: { backgroundColor: "#fff", borderRadius: 12, padding: 16, flexDirection: "row", alignItems: "center", gap: 14, borderWidth: 1, borderColor: COLORS.border },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: COLORS.primaryLight, justifyContent: "center", alignItems: "center" },
  avatarText: { fontSize: 22, fontWeight: "700", color: COLORS.primary },
  userName: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  userEmail: { fontSize: 13, color: COLORS.muted },
  orgName: { fontSize: 12, color: COLORS.primary, marginTop: 2 },
  section: { backgroundColor: "#fff", borderRadius: 12, padding: 16, gap: 16, borderWidth: 1, borderColor: COLORS.border },
  sectionTitle: { fontSize: 16, fontWeight: "600", color: COLORS.text },
  field: { gap: 8 },
  label: { fontSize: 14, fontWeight: "500", color: COLORS.text },
  optionsWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  optionBtn: { borderWidth: 1.5, borderColor: COLORS.border, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7 },
  optionBtnActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  optionText: { fontSize: 13, color: COLORS.muted, fontWeight: "500" },
  optionTextActive: { color: COLORS.primary },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 14, alignItems: "center", marginTop: 4 },
  btnDisabled: { opacity: 0.6 },
  saveBtnText: { color: "#fff", fontSize: 15, fontWeight: "600" },
  logoutBtn: { borderWidth: 1.5, borderColor: COLORS.destructive, borderRadius: 12, padding: 14, alignItems: "center" },
  logoutText: { color: COLORS.destructive, fontSize: 15, fontWeight: "600" },
});
