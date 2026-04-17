import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Camera,
  Check,
  ChevronRight,
  ScanLine,
  Share2,
  Sparkles,
  X,
} from "lucide-react-native";
import { useState } from "react";
import { apiRequest } from "../lib/api";
import { COLORS } from "../lib/theme";
import { useAuthStore } from "../store/auth-store";

// ─────────────────────────── Types ───────────────────────────

type DetectedIngredient = { name: string; quantity?: number; unit?: string };
type ScanResult = { scanId: string; imageUrl: string; ingredients: DetectedIngredient[] };
type ShoppingItem = {
  id: string;
  checked: boolean;
  quantity: number | null;
  unit: string | null;
  ingredient: { name: string };
};
type ScanSubStep = "idle" | "uploading" | "review";
type Step = 1 | 2 | 3 | 4 | 5 | 6;

// ─────────────────────────── Data ───────────────────────────

const DIETARY_OPTIONS = [
  { label: "Aucun", value: "none" },
  { label: "Végétarien", value: "vegetarian" },
  { label: "Végétalien", value: "vegan" },
  { label: "Pescétarien", value: "pescatarian" },
  { label: "Cétogène", value: "keto" },
  { label: "Paléo", value: "paleo" },
  { label: "Halal", value: "halal" },
  { label: "Casher", value: "kosher" },
];

const CUISINE_OPTIONS = [
  { label: "Française", value: "french" },
  { label: "Italienne", value: "italian" },
  { label: "Asiatique", value: "asian" },
  { label: "Japonaise", value: "japanese" },
  { label: "Mexicaine", value: "mexican" },
  { label: "Méditerranéenne", value: "mediterranean" },
  { label: "Indienne", value: "indian" },
  { label: "Américaine", value: "american" },
  { label: "Libanaise", value: "lebanese" },
  { label: "Thaïlandaise", value: "thai" },
];

const ALLERGY_OPTIONS = [
  { label: "Gluten", value: "gluten" },
  { label: "Lactose", value: "dairy" },
  { label: "Arachides", value: "peanuts" },
  { label: "Fruits à coque", value: "tree_nuts" },
  { label: "Œufs", value: "eggs" },
  { label: "Soja", value: "soy" },
  { label: "Fruits de mer", value: "shellfish" },
  { label: "Poisson", value: "fish" },
  { label: "Sésame", value: "sesame" },
];

const INTOLERANCE_OPTIONS = [
  { label: "Gluten", value: "gluten" },
  { label: "Lactose", value: "lactose" },
  { label: "Fructose", value: "fructose" },
  { label: "Histamine", value: "histamine" },
  { label: "FODMAP", value: "fodmap" },
  { label: "Sulfites", value: "sulfites" },
];

const DISH_SUGGESTIONS = [
  "Poulet rôti", "Pâtes carbonara", "Pizza maison", "Risotto", "Curry de légumes",
  "Salade César", "Steak frites", "Soupe de légumes", "Burger maison", "Saumon grillé",
  "Quiche lorraine", "Tajine", "Pad thaï", "Ramen", "Gratin dauphinois",
];

const PEOPLE_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8];
const DURATION_OPTIONS = [
  { label: "3 jours", value: 3 },
  { label: "5 jours", value: 5 },
  { label: "7 jours", value: 7 },
];

const GEN_STEPS = [
  { label: "Analyse du contenu du frigo", emoji: "🔍" },
  { label: "Création du plan repas personnalisé", emoji: "🍽️" },
  { label: "Génération de la liste de courses", emoji: "🛒" },
];

// ─────────────────────────── Component ───────────────────────────

export default function OnboardingScreen() {
  const { user, completeOnboarding } = useAuthStore();
  const [step, setStep] = useState<Step>(1);

  // Step 2 — Preferences
  const [dietary, setDietary] = useState("none");
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [intolerances, setIntolerances] = useState<string[]>([]);

  // Step 3 — Scan
  const [scanSubStep, setScanSubStep] = useState<ScanSubStep>("idle");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<number>>(new Set());
  const [scanSkipped, setScanSkipped] = useState(false);

  // Step 4 — Meal wishes
  const [wantedDishes, setWantedDishes] = useState<string[]>([]);
  const [dishInput, setDishInput] = useState("");
  const [duration, setDuration] = useState(7);
  const [numberOfPeople, setNumberOfPeople] = useState(2);

  // Step 5 — Generation
  const [genCurrentStep, setGenCurrentStep] = useState(-1);
  const [genCompletedSteps, setGenCompletedSteps] = useState<number[]>([]);
  const [genError, setGenError] = useState<string | null>(null);

  // Step 6 — Shopping list
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);

  // ── Helpers ──

  const toggleList = (value: string, list: string[], setList: (v: string[]) => void) => {
    setList(list.includes(value) ? list.filter((x) => x !== value) : [...list, value]);
  };

  const addDish = (dish: string) => {
    const trimmed = dish.trim();
    if (!trimmed || wantedDishes.includes(trimmed)) return;
    setWantedDishes((prev) => [...prev, trimmed]);
    setDishInput("");
  };

  // ── Scan logic ──

  const pickImage = async (fromCamera: boolean) => {
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, quality: 0.8 });

    if (result.canceled || !result.assets[0]) return;
    setScanSubStep("uploading");

    try {
      const formData = new FormData();
      formData.append("image", {
        uri: result.assets[0].uri,
        type: "image/jpeg",
        name: "fridge.jpg",
      } as unknown as Blob);
      const data = await apiRequest<ScanResult>("/api/mobile/scan", { method: "POST", formData });
      setScanResult(data);
      setSelectedIngredients(new Set(data.ingredients.map((_, i) => i)));
      setScanSubStep("review");
    } catch (err) {
      Alert.alert("Erreur", (err as Error).message);
      setScanSubStep("idle");
    }
  };

  const toggleIngredient = (index: number) => {
    setSelectedIngredients((prev) => {
      const next = new Set(prev);
      next.has(index) ? next.delete(index) : next.add(index);
      return next;
    });
  };

  // ── Generation ──

  const handleGenerate = async () => {
    setStep(5);
    setGenCurrentStep(0);
    setGenCompletedSteps([]);
    setGenError(null);

    try {
      // Phase 0: save preferences + confirm scan
      await apiRequest("/api/mobile/preferences", {
        method: "POST",
        body: {
          dietaryType: dietary,
          allergies,
          intolerances,
          cuisinePreferences: cuisines,
          numberOfPeople,
        },
      });
      if (scanResult && !scanSkipped) {
        const confirmed = scanResult.ingredients.filter((_, i) => selectedIngredients.has(i));
        await apiRequest("/api/mobile/scan/confirm", {
          method: "POST",
          body: { scanId: scanResult.scanId, ingredients: confirmed },
        });
      }
      setGenCompletedSteps([0]);
      setGenCurrentStep(1);

      // Phase 1: generate meal plan
      await apiRequest("/api/mobile/meal-plan", {
        method: "POST",
        body: { duration, numberOfPeople, wishList: wantedDishes },
      });
      setGenCompletedSteps([0, 1]);
      setGenCurrentStep(2);

      // Phase 2: generate shopping list
      const shopping = await apiRequest<ShoppingItem[]>("/api/mobile/shopping", { method: "POST" });
      setShoppingList(Array.isArray(shopping) ? shopping : []);
      setGenCompletedSteps([0, 1, 2]);
      setGenCurrentStep(-1);

      await new Promise((r) => setTimeout(r, 600));
      setStep(6);
    } catch (err) {
      setGenError((err as Error).message);
    }
  };

  // ── Share ──

  const handleShare = async () => {
    const lines = shoppingList
      .filter((i) => !i.checked)
      .map((i) => `• ${i.ingredient.name}${i.quantity ? ` — ${i.quantity}${i.unit ? " " + i.unit : ""}` : ""}`)
      .join("\n");

    try {
      await Share.share({
        message: `🛒 Liste de courses — FridAI\n\n${lines || "Aucun article à acheter."}\n\nGénérée avec FridAI`,
        title: "Liste de courses",
      });
    } catch {
      // user dismissed share sheet — no-op
    }
  };

  // ── Step indicator (steps 2–4) ──

  const StepIndicator = ({ current }: { current: number }) => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((i) => (
        <View key={i} style={styles.stepIndicatorRow}>
          <View style={[styles.stepDot, i <= current && styles.stepDotActive]} />
          {i < 3 && <View style={[styles.stepLine, i < current && styles.stepLineActive]} />}
        </View>
      ))}
    </View>
  );

  // ─────────────────────────── Step 1: Welcome ───────────────────────────

  if (step === 1) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.welcomeHeader}>
            <Text style={styles.logo}>FridAI</Text>
            <Text style={styles.welcomeTagline}>Votre assistant cuisine intelligent</Text>
          </View>

          <View style={styles.featureCards}>
            {[
              {
                emoji: "📸",
                title: "Scannez votre frigo",
                desc: "Prenez une photo, l'IA détecte automatiquement vos ingrédients",
              },
              {
                emoji: "🍽️",
                title: "Plan repas personnalisé",
                desc: "Généré en 90 secondes selon vos goûts et vos restes",
              },
              {
                emoji: "🛒",
                title: "Liste de courses",
                desc: "Uniquement ce qui manque, rien de superflu",
              },
            ].map((f) => (
              <View key={f.title} style={styles.featureCard}>
                <Text style={styles.featureEmoji}>{f.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}
          </View>

          <Pressable style={styles.btn} onPress={() => setStep(2)}>
            <Text style={styles.btnText}>Commencer</Text>
            <ChevronRight size={18} color="#fff" />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────── Step 2: Preferences quiz ───────────────────────────

  if (step === 2) {
    return (
      <SafeAreaView style={styles.safe}>
        <StepIndicator current={1} />
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.stepHeader}>
            <Text style={styles.stepTitle}>Vos préférences</Text>
            <Text style={styles.stepSubtitle}>Personnalisez votre expérience FridAI</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Régime alimentaire</Text>
            <View style={styles.chips}>
              {DIETARY_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.chip, dietary === opt.value && styles.chipActive]}
                  onPress={() => setDietary(opt.value)}
                >
                  <Text style={[styles.chipText, dietary === opt.value && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Cuisines favorites</Text>
            <View style={styles.chips}>
              {CUISINE_OPTIONS.map((opt) => {
                const active = cuisines.includes(opt.value);
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleList(opt.value, cuisines, setCuisines)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Allergies</Text>
            <View style={styles.chips}>
              {ALLERGY_OPTIONS.map((opt) => {
                const active = allergies.includes(opt.value);
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleList(opt.value, allergies, setAllergies)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Intolérances</Text>
            <View style={styles.chips}>
              {INTOLERANCE_OPTIONS.map((opt) => {
                const active = intolerances.includes(opt.value);
                return (
                  <Pressable
                    key={opt.value}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() => toggleList(opt.value, intolerances, setIntolerances)}
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{opt.label}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <Pressable style={styles.btn} onPress={() => setStep(3)}>
            <Text style={styles.btnText}>Suivant</Text>
            <ChevronRight size={18} color="#fff" />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────── Step 3: Scan ───────────────────────────

  if (step === 3) {
    if (scanSubStep === "uploading") {
      return (
        <SafeAreaView style={[styles.safe, styles.center]}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={styles.loadingTitle}>Analyse en cours...</Text>
          <Text style={styles.loadingSubtext}>L'IA détecte vos ingrédients</Text>
        </SafeAreaView>
      );
    }

    if (scanSubStep === "review" && scanResult) {
      return (
        <SafeAreaView style={styles.safe} edges={["bottom"]}>
          <StepIndicator current={2} />
          <Image source={{ uri: scanResult.imageUrl }} style={styles.previewImage} />

          <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
            <Text style={styles.stepTitle}>Vérifiez les aliments</Text>
            <Text style={styles.stepSubtitle}>Décochez les aliments incorrects</Text>
          </View>

          <FlatList
            data={scanResult.ingredients}
            keyExtractor={(_, i) => String(i)}
            contentContainerStyle={{ paddingHorizontal: 16, gap: 8, paddingBottom: 100 }}
            renderItem={({ item, index }) => (
              <Pressable style={styles.ingredientRow} onPress={() => toggleIngredient(index)}>
                <View style={[styles.checkbox, selectedIngredients.has(index) && styles.checkboxActive]}>
                  {selectedIngredients.has(index) && <Check size={14} color="#fff" />}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.ingredientName}>{item.name}</Text>
                  {(item.quantity || item.unit) && (
                    <Text style={styles.ingredientQty}>
                      {[item.quantity, item.unit].filter(Boolean).join(" ")}
                    </Text>
                  )}
                </View>
              </Pressable>
            )}
          />

          <View style={styles.reviewActions}>
            <Pressable style={styles.btnSecondary} onPress={() => setScanSubStep("idle")}>
              <Text style={styles.btnSecondaryText}>Recommencer</Text>
            </Pressable>
            <Pressable style={[styles.btn, { flex: 1 }]} onPress={() => setStep(4)}>
              <Text style={styles.btnText}>Confirmer ({selectedIngredients.size})</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.safe}>
        <StepIndicator current={2} />
        <View style={[styles.center, { flex: 1 }]}>
          <View style={styles.scanIconWrap}>
            <ScanLine size={64} color={COLORS.primary} />
          </View>
          <Text style={styles.stepTitle}>Scannez votre frigo</Text>
          <Text style={[styles.stepSubtitle, { textAlign: "center", paddingHorizontal: 32 }]}>
            Prenez une photo pour que l'IA détecte automatiquement vos ingrédients disponibles
          </Text>

          <View style={styles.scanActions}>
            <Pressable style={styles.btn} onPress={() => pickImage(true)}>
              <Camera size={20} color="#fff" />
              <Text style={styles.btnText}>Prendre une photo</Text>
            </Pressable>
            <Pressable style={styles.btnSecondary} onPress={() => pickImage(false)}>
              <Text style={styles.btnSecondaryText}>Choisir depuis la galerie</Text>
            </Pressable>
            <Pressable
              style={styles.skipBtn}
              onPress={() => {
                setScanSkipped(true);
                setStep(4);
              }}
            >
              <Text style={styles.skipText}>Passer cette étape</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────── Step 4: Meal wishes ───────────────────────────

  if (step === 4) {
    return (
      <SafeAreaView style={styles.safe}>
        <StepIndicator current={3} />
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.stepHeader}>
            <Text style={styles.stepTitle}>Vos envies du moment</Text>
            <Text style={styles.stepSubtitle}>Dites-nous ce que vous aimeriez manger cette semaine</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Suggestions</Text>
            <View style={styles.chips}>
              {DISH_SUGGESTIONS.map((dish) => {
                const active = wantedDishes.includes(dish);
                return (
                  <Pressable
                    key={dish}
                    style={[styles.chip, active && styles.chipActive]}
                    onPress={() =>
                      active
                        ? setWantedDishes((prev) => prev.filter((d) => d !== dish))
                        : addDish(dish)
                    }
                  >
                    <Text style={[styles.chipText, active && styles.chipTextActive]}>{dish}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Ajouter un plat</Text>
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Ex: Lasagnes, Couscous..."
                placeholderTextColor={COLORS.muted}
                value={dishInput}
                onChangeText={setDishInput}
                onSubmitEditing={() => addDish(dishInput)}
                returnKeyType="done"
              />
              <Pressable
                style={[styles.inputAddBtn, !dishInput.trim() && { opacity: 0.4 }]}
                onPress={() => addDish(dishInput)}
                disabled={!dishInput.trim()}
              >
                <Text style={styles.inputAddBtnText}>+</Text>
              </Pressable>
            </View>

            {wantedDishes.length > 0 && (
              <View style={styles.selectedDishes}>
                {wantedDishes.map((dish) => (
                  <View key={dish} style={styles.selectedDish}>
                    <Text style={styles.selectedDishText}>{dish}</Text>
                    <Pressable onPress={() => setWantedDishes((prev) => prev.filter((d) => d !== dish))}>
                      <X size={14} color={COLORS.primary} />
                    </Pressable>
                  </View>
                ))}
              </View>
            )}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Durée du plan</Text>
            <View style={styles.chips}>
              {DURATION_OPTIONS.map((opt) => (
                <Pressable
                  key={opt.value}
                  style={[styles.chip, duration === opt.value && styles.chipActive]}
                  onPress={() => setDuration(opt.value)}
                >
                  <Text style={[styles.chipText, duration === opt.value && styles.chipTextActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Nombre de personnes</Text>
            <View style={styles.chips}>
              {PEOPLE_OPTIONS.map((n) => (
                <Pressable
                  key={n}
                  style={[styles.chip, styles.chipSquare, numberOfPeople === n && styles.chipActive]}
                  onPress={() => setNumberOfPeople(n)}
                >
                  <Text style={[styles.chipText, numberOfPeople === n && styles.chipTextActive]}>{n}</Text>
                </Pressable>
              ))}
            </View>
          </View>

          <Pressable style={styles.btn} onPress={handleGenerate}>
            <Sparkles size={18} color="#fff" />
            <Text style={styles.btnText}>Générer ma liste de courses</Text>
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────── Step 5: Generation ───────────────────────────

  if (step === 5) {
    return (
      <SafeAreaView style={[styles.safe, styles.center]}>
        <Text style={styles.genTitle}>FridAI prépare votre semaine</Text>
        <Text style={styles.genSubtitle}>
          Votre liste de courses personnalisée est en cours de création
        </Text>

        <View style={styles.genStepsList}>
          {GEN_STEPS.map((s, i) => {
            const isDone = genCompletedSteps.includes(i);
            const isCurrent = genCurrentStep === i;
            return (
              <View key={s.label} style={styles.genStepRow}>
                <View
                  style={[
                    styles.genStepBubble,
                    isDone && styles.genStepBubbleDone,
                    isCurrent && styles.genStepBubbleActive,
                  ]}
                >
                  {isDone ? (
                    <Check size={16} color="#fff" />
                  ) : isCurrent ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.genStepEmoji}>{s.emoji}</Text>
                  )}
                </View>
                <Text
                  style={[
                    styles.genStepLabel,
                    isDone && styles.genStepLabelDone,
                    isCurrent && styles.genStepLabelActive,
                  ]}
                >
                  {s.label}
                </Text>
              </View>
            );
          })}
        </View>

        {genError && (
          <View style={styles.genError}>
            <Text style={styles.genErrorText}>{genError}</Text>
            <Pressable style={[styles.btnSecondary, { marginTop: 8 }]} onPress={handleGenerate}>
              <Text style={styles.btnSecondaryText}>Réessayer</Text>
            </Pressable>
          </View>
        )}
      </SafeAreaView>
    );
  }

  // ─────────────────────────── Step 6: Shopping list + share ───────────────────────────

  const unchecked = shoppingList.filter((i) => !i.checked);
  const checked = shoppingList.filter((i) => i.checked);

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <View style={styles.step6Header}>
        <Text style={styles.step6Title}>🛒 Votre liste de courses</Text>
        <Text style={styles.step6Subtitle}>
          {unchecked.length > 0
            ? `${unchecked.length} article${unchecked.length > 1 ? "s" : ""} à acheter`
            : "Votre frigo est déjà bien fourni !"}
        </Text>
      </View>

      <FlatList
        data={[...unchecked, ...checked]}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, gap: 8, paddingBottom: 190 }}
        renderItem={({ item }) => (
          <View style={styles.shoppingRow}>
            <View style={[styles.checkbox, item.checked && styles.checkboxActive]}>
              {item.checked && <Check size={14} color="#fff" />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.ingredientName, item.checked && styles.textDone]}>
                {item.ingredient.name}
              </Text>
              {(item.quantity || item.unit) && (
                <Text style={styles.ingredientQty}>
                  {[item.quantity, item.unit].filter(Boolean).join(" ")}
                </Text>
              )}
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={[styles.center, { paddingVertical: 32 }]}>
            <Text style={{ color: COLORS.muted, fontSize: 15, textAlign: "center" }}>
              Votre frigo est déjà bien fourni !{"\n"}Aucun ingrédient manquant.
            </Text>
          </View>
        }
      />

      <View style={styles.step6Actions}>
        <Pressable style={styles.shareBtn} onPress={handleShare}>
          <Share2 size={18} color={COLORS.primary} />
          <Text style={styles.shareBtnText}>Partager la liste</Text>
        </Pressable>
        <Pressable style={styles.btn} onPress={completeOnboarding}>
          <Text style={styles.btnText}>Accéder à l'app</Text>
          <ChevronRight size={18} color="#fff" />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

// ─────────────────────────── Styles ───────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 24, gap: 24 },
  center: { justifyContent: "center", alignItems: "center", padding: 24, gap: 16 },

  // Step indicator
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 0,
  },
  stepIndicatorRow: { flexDirection: "row", alignItems: "center" },
  stepDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.border },
  stepDotActive: { backgroundColor: COLORS.primary },
  stepLine: { width: 40, height: 2, backgroundColor: COLORS.border },
  stepLineActive: { backgroundColor: COLORS.primary },

  // Welcome
  welcomeHeader: { alignItems: "center", gap: 8, paddingTop: 16 },
  logo: { fontSize: 36, fontWeight: "800", color: COLORS.primary, letterSpacing: -1 },
  welcomeTagline: { fontSize: 17, color: COLORS.muted, textAlign: "center" },
  featureCards: { gap: 12 },
  featureCard: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 16,
    gap: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "flex-start",
  },
  featureEmoji: { fontSize: 28 },
  featureTitle: { fontSize: 15, fontWeight: "600", color: COLORS.text, marginBottom: 4 },
  featureDesc: { fontSize: 13, color: COLORS.muted, lineHeight: 18 },

  // Step header
  stepHeader: { gap: 6 },
  stepTitle: { fontSize: 22, fontWeight: "700", color: COLORS.text },
  stepSubtitle: { fontSize: 14, color: COLORS.muted, lineHeight: 20 },

  // Sections & chips
  section: { gap: 10 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipSquare: { minWidth: 44, alignItems: "center", borderRadius: 10, paddingHorizontal: 8 },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  chipText: { fontSize: 14, color: COLORS.muted, fontWeight: "500" },
  chipTextActive: { color: COLORS.primary, fontWeight: "600" },

  // Scan
  scanIconWrap: { marginBottom: 8 },
  previewImage: { width: "100%", height: 200, resizeMode: "cover" },
  scanActions: { width: "100%", gap: 12, paddingHorizontal: 24, marginTop: 24 },
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  ingredientName: { fontSize: 15, fontWeight: "500", color: COLORS.text },
  ingredientQty: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  checkboxActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  reviewActions: { flexDirection: "row", gap: 12, padding: 16 },

  // Step 4 — dishes
  inputRow: { flexDirection: "row", gap: 8 },
  input: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.text,
  },
  inputAddBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  inputAddBtnText: { color: "#fff", fontSize: 22, fontWeight: "600" },
  selectedDishes: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 8 },
  selectedDish: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
  },
  selectedDishText: { fontSize: 13, color: COLORS.primary, fontWeight: "500" },

  // Step 5 — generation
  genTitle: { fontSize: 22, fontWeight: "700", color: COLORS.text, textAlign: "center" },
  genSubtitle: { fontSize: 14, color: COLORS.muted, textAlign: "center", lineHeight: 20 },
  genStepsList: { gap: 20, marginTop: 32, width: "100%" },
  genStepRow: { flexDirection: "row", alignItems: "center", gap: 14 },
  genStepBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  genStepBubbleActive: { backgroundColor: COLORS.primary },
  genStepBubbleDone: { backgroundColor: COLORS.primary },
  genStepEmoji: { fontSize: 18 },
  genStepLabel: { fontSize: 15, color: COLORS.muted, fontWeight: "500", flex: 1 },
  genStepLabelActive: { color: COLORS.text, fontWeight: "600" },
  genStepLabelDone: { color: COLORS.primary, fontWeight: "600" },
  genError: { alignItems: "center", marginTop: 24, gap: 4 },
  genErrorText: { fontSize: 14, color: COLORS.destructive, textAlign: "center" },
  loadingTitle: { fontSize: 18, fontWeight: "600", color: COLORS.text },
  loadingSubtext: { fontSize: 14, color: COLORS.muted },

  // Step 6 — shopping + share
  step6Header: { padding: 20, paddingBottom: 4 },
  step6Title: { fontSize: 22, fontWeight: "700", color: COLORS.text },
  step6Subtitle: { fontSize: 14, color: COLORS.muted, marginTop: 4 },
  shoppingRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  textDone: { color: COLORS.muted, textDecorationLine: "line-through" },
  step6Actions: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    padding: 16,
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  shareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 12,
    padding: 14,
  },
  shareBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: "600" },

  // Buttons
  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 8,
  },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "700" },
  btnSecondary: {
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 12,
    padding: 14,
    alignItems: "center",
  },
  btnSecondaryText: { color: COLORS.primary, fontSize: 15, fontWeight: "600" },
  skipBtn: { alignItems: "center", padding: 12 },
  skipText: { color: COLORS.muted, fontSize: 14 },
});
