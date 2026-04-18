import * as ImagePicker from "expo-image-picker";
import {
  ActivityIndicator,
  Alert,
  Animated,
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
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Lock,
  Plus,
  ScanLine,
  X,
} from "lucide-react-native";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "expo-router";
import { apiRequest } from "../lib/api";
import { COLORS } from "../lib/theme";
import { useAuthStore } from "../store/auth-store";
import { useQuizStore } from "../store/quiz-store";

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
// 0=welcome, 1-6=quiz, 7=generation, 8=results
type Step = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;

// ─────────────────────────── Data ───────────────────────────

const DIETARY_OPTIONS = [
  { label: "Omnivore", value: "omnivore", emoji: "🍗", desc: "Je mange de tout" },
  { label: "Flexitarien", value: "flexitarian", emoji: "🥗", desc: "Viande occasionnellement" },
  { label: "Végétarien", value: "vegetarian", emoji: "🌿", desc: "Sans viande ni poisson" },
  { label: "Végan", value: "vegan", emoji: "🌱", desc: "Aucun produit animal" },
  { label: "Pescétarien", value: "pescatarian", emoji: "🐟", desc: "Poisson mais pas de viande" },
];

const ALLERGY_OPTIONS = [
  { label: "Aucune", value: "none" },
  { label: "Gluten", value: "gluten" },
  { label: "Lactose", value: "dairy" },
  { label: "Œufs", value: "eggs" },
  { label: "Arachides", value: "peanuts" },
  { label: "Fruits à coque", value: "tree_nuts" },
  { label: "Soja", value: "soy" },
  { label: "Poisson", value: "fish" },
  { label: "Crustacés", value: "shellfish" },
];


const CUISINE_OPTIONS = [
  { label: "Française", value: "french", emoji: "🇫🇷" },
  { label: "Italienne", value: "italian", emoji: "🇮🇹" },
  { label: "Japonaise", value: "japanese", emoji: "🇯🇵" },
  { label: "Méditerranéenne", value: "mediterranean", emoji: "🇬🇷" },
  { label: "Mexicaine", value: "mexican", emoji: "🇲🇽" },
  { label: "Indienne", value: "indian", emoji: "🇮🇳" },
  { label: "Américaine", value: "american", emoji: "🇺🇸" },
  { label: "Marocaine", value: "moroccan", emoji: "🇲🇦" },
  { label: "Thaïe", value: "thai", emoji: "🇹🇭" },
];

const MORE_CUISINE_OPTIONS = [
  { label: "Chinoise", value: "chinese", emoji: "🇨🇳" },
  { label: "Coréenne", value: "korean", emoji: "🇰🇷" },
  { label: "Vietnamienne", value: "vietnamese", emoji: "🇻🇳" },
  { label: "Libanaise", value: "lebanese", emoji: "🇱🇧" },
  { label: "Espagnole", value: "spanish", emoji: "🇪🇸" },
  { label: "Brésilienne", value: "brazilian", emoji: "🇧🇷" },
  { label: "Turque", value: "turkish", emoji: "🇹🇷" },
  { label: "Péruvienne", value: "peruvian", emoji: "🇵🇪" },
];

const DISLIKED_OPTIONS = [
  "Coriandre", "Olives", "Champignons", "Aubergine", "Fromage bleu",
  "Abats", "Anchois", "Brocoli", "Épinards", "Tofu",
];

const GEN_STEPS = [
  { label: "Analyse du contenu du frigo", emoji: "🔍" },
  { label: "Création du plan repas personnalisé", emoji: "🍽️" },
  { label: "Génération de la liste de courses", emoji: "🛒" },
];

// ─────────────────────────── Sub-components ───────────────────────────

type QuizHeaderProps = { quizStep: number; onBack: () => void; onSkip?: () => void };

const QuizHeader = ({ quizStep, onBack, onSkip }: QuizHeaderProps) => {
  const progressAnim = useRef(new Animated.Value((quizStep / 6) * 100)).current;

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: (quizStep / 6) * 100,
      duration: 350,
      useNativeDriver: false,
    }).start();
  }, [quizStep]);

  return (
    <View style={styles.quizHeader}>
      <Pressable style={styles.backBtn} onPress={onBack}>
        <ChevronLeft size={20} color={COLORS.text} />
      </Pressable>
      <View style={styles.progressWrap}>
        <View style={styles.progressTrack}>
          <Animated.View
            style={[
              styles.progressFill,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 100],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>
        <Text style={styles.progressLabel}>{quizStep} / 6</Text>
      </View>
      {onSkip ? (
        <Pressable style={styles.passerBtn} onPress={onSkip}>
          <Text style={styles.passerText}>Passer</Text>
        </Pressable>
      ) : (
        <View style={{ width: 52 }} />
      )}
    </View>
  );
};

// ─────────────────────────── PulsingDots ───────────────────────────

const PulsingDots = () => {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animate = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, { toValue: 1, duration: 350, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 350, useNativeDriver: true }),
        ])
      );
    const a1 = animate(dot1, 0);
    const a2 = animate(dot2, 150);
    const a3 = animate(dot3, 300);
    a1.start(); a2.start(); a3.start();
    return () => { a1.stop(); a2.stop(); a3.stop(); };
  }, []);

  return (
    <View style={{ flexDirection: "row", gap: 4, alignItems: "center" }}>
      {[dot1, dot2, dot3].map((dot, i) => (
        <Animated.View
          key={i}
          style={{ width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#fff", opacity: dot }}
        />
      ))}
    </View>
  );
};

// ─────────────────────────── Component ───────────────────────────

export default function OnboardingScreen() {
  const { completeOnboarding, isAuthenticated } = useAuthStore();
  const { step: savedStep, setStep: saveStep } = useQuizStore();
  const router = useRouter();
  const [step, setStep] = useState<Step>((savedStep as Step) ?? 0);

  // Step 1 — Diet
  const [dietary, setDietary] = useState("omnivore");

  // Step 2 — Allergies
  const [allergies, setAllergies] = useState<string[]>(["none"]);
  const [customAllergies, setCustomAllergies] = useState<string[]>([]);
  const [customAllergyInput, setCustomAllergyInput] = useState("");
  const [showAllergyInput, setShowAllergyInput] = useState(false);

  // Step 3 — People
  const [numberOfPeopleCount, setNumberOfPeopleCount] = useState(2);
  const [householdNames, setHouseholdNames] = useState("");

  // Step 4 — Cuisines
  const [cuisines, setCuisines] = useState<string[]>([]);
  const [showMoreCuisines, setShowMoreCuisines] = useState(false);
  const [cuisineError, setCuisineError] = useState(false);

  // Step 5 — Disliked ingredients
  const [dislikedIngredients, setDislikedIngredients] = useState<string[]>([]);
  const [customDislikedInput, setCustomDislikedInput] = useState("");
  const [showDislikedInput, setShowDislikedInput] = useState(false);

  // Step 6 — Scan
  const [scanSubStep, setScanSubStep] = useState<ScanSubStep>("idle");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<Set<number>>(new Set());
  const [editedQtys, setEditedQtys] = useState<Record<number, string>>({});
  const scanPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scanPulse, { toValue: 1.18, duration: 900, useNativeDriver: true }),
        Animated.timing(scanPulse, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    pulse.start();
    return () => pulse.stop();
  }, []);

  // Step 7 — Generation
  const [genCurrentStep, setGenCurrentStep] = useState(-1);
  const [genCompletedSteps, setGenCompletedSteps] = useState<number[]>([]);
  const [genError, setGenError] = useState<string | null>(null);

  // Step 8 — Results
  const [shoppingList, setShoppingList] = useState<ShoppingItem[]>([]);

  // ── Helpers ──

  const numberOfPeople = numberOfPeopleCount;

  const toggleAllergy = (value: string) => {
    if (value === "none") {
      setAllergies(["none"]);
    } else {
      setAllergies((prev) => {
        const without = prev.filter((x) => x !== "none");
        return without.includes(value) ? without.filter((x) => x !== value) : [...without, value];
      });
    }
  };

  const addCustomAllergy = () => {
    const trimmed = customAllergyInput.trim();
    if (!trimmed || customAllergies.includes(trimmed)) return;
    setCustomAllergies((prev) => [...prev, trimmed]);
    setCustomAllergyInput("");
    setAllergies((prev) => prev.filter((x) => x !== "none"));
  };

  const toggleCuisine = (value: string) => {
    setCuisines((prev) =>
      prev.includes(value) ? prev.filter((x) => x !== value) : [...prev, value]
    );
  };

  const toggleDisliked = (name: string) => {
    setDislikedIngredients((prev) =>
      prev.includes(name) ? prev.filter((x) => x !== name) : [...prev, name]
    );
  };

  const addCustomDisliked = () => {
    const trimmed = customDislikedInput.trim();
    if (!trimmed || dislikedIngredients.includes(trimmed)) return;
    setDislikedIngredients((prev) => [...prev, trimmed]);
    setCustomDislikedInput("");
  };

  // ── Scan ──

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
      setEditedQtys(
        Object.fromEntries(
          data.ingredients.map((ing, i) => [i, [ing.quantity, ing.unit].filter(Boolean).join(" ")])
        )
      );
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
    setStep(7);
    setGenCurrentStep(0);
    setGenCompletedSteps([]);
    setGenError(null);

    try {
      await apiRequest("/api/mobile/preferences", {
        method: "POST",
        body: {
          dietaryType: dietary,
          allergies: [...allergies.filter((a) => a !== "none"), ...customAllergies],
          intolerances: [],
          cuisinePreferences: cuisines,
          dislikedIngredients,
          numberOfPeople,
        },
      });

      if (scanResult) {
        const confirmed = scanResult.ingredients.filter((_, i) => selectedIngredients.has(i));
        await apiRequest("/api/mobile/scan/confirm", {
          method: "POST",
          body: { scanId: scanResult.scanId, ingredients: confirmed },
        });
      }

      setGenCompletedSteps([0]);
      setGenCurrentStep(1);

      await apiRequest("/api/mobile/meal-plan", {
        method: "POST",
        body: { duration: 7, numberOfPeople, wishList: [] },
      });
      setGenCompletedSteps([0, 1]);
      setGenCurrentStep(2);

      const shopping = await apiRequest<ShoppingItem[]>("/api/mobile/shopping", { method: "POST" });
      setShoppingList(Array.isArray(shopping) ? shopping : []);
      setGenCompletedSteps([0, 1, 2]);
      setGenCurrentStep(-1);

      await new Promise((r) => setTimeout(r, 600));
      setStep(8);
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
      // user dismissed
    }
  };

  // ─────────────────────────── Step 0: Welcome ───────────────────────────

  if (step === 0) {
    return (
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.welcomeHeader}>
            <Text style={styles.logo}>FridAI</Text>
            <Text style={styles.welcomeTagline}>Votre assistant cuisine intelligent</Text>
          </View>

          <View style={styles.featureCards}>
            {[
              { emoji: "📸", title: "Scannez votre frigo", desc: "L'IA détecte vos ingrédients en quelques secondes" },
              { emoji: "🍽️", title: "Plan repas personnalisé", desc: "Généré selon vos goûts, vos restes et votre foyer" },
            ].map((f) => (
              <View key={f.title} style={styles.featureCard}>
                <Text style={styles.featureEmoji}>{f.emoji}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={styles.featureTitle}>{f.title}</Text>
                  <Text style={styles.featureDesc}>{f.desc}</Text>
                </View>
              </View>
            ))}

            {/* Mockup liste de courses */}
            <View style={styles.featureCard}>
              <Text style={styles.featureEmoji}>🛒</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.featureTitle}>Liste de courses prête</Text>
                <Text style={styles.featureDesc}>Uniquement ce qui manque, rien de superflu</Text>
              </View>
            </View>
            <View style={styles.listMockup}>
              <View style={styles.listMockupHeader}>
                <View style={styles.listMockupBadge}>
                  <Text style={styles.listMockupBadgeText}>✓  Liste générée</Text>
                </View>
                <Text style={styles.listMockupCount}>8 articles</Text>
              </View>
              {[
                { name: "Poulet fermier", qty: "800 g", done: false },
                { name: "Tomates cerises", qty: "250 g", done: false },
                { name: "Pâtes fusilli", qty: "500 g", done: true },
                { name: "Crème fraîche", qty: "20 cl", done: false },
              ].map((item) => (
                <View key={item.name} style={styles.listMockupRow}>
                  <View style={[styles.listMockupCheck, item.done && styles.listMockupCheckDone]}>
                    {item.done && <Text style={{ color: "#fff", fontSize: 10 }}>✓</Text>}
                  </View>
                  <Text style={[styles.listMockupItem, item.done && styles.listMockupItemDone]}>
                    {item.name}
                  </Text>
                  <Text style={styles.listMockupQty}>{item.qty}</Text>
                </View>
              ))}
              <Text style={styles.listMockupMore}>+ 4 autres articles…</Text>
            </View>
          </View>

          <Pressable style={styles.btn} onPress={() => setStep(1)}>
            <Text style={styles.btnText}>Commencer</Text>
            <ChevronRight size={18} color="#fff" />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────── Step 1: Régime alimentaire ───────────────────────────

  if (step === 1) {
    return (
      <SafeAreaView style={styles.safe}>
        <QuizHeader
          quizStep={1}
          onBack={() => setStep(0)}
          onSkip={() => setStep(2)}
        />
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.stepHeader}>
            <Text style={styles.stepTitle}>Quel est ton régime alimentaire ?</Text>
            <Text style={styles.stepSubtitle}>On adapte tes recettes en conséquence.</Text>
          </View>

          <View style={styles.dietList}>
            {DIETARY_OPTIONS.map((opt) => {
              const active = dietary === opt.value;
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.dietCard, active && styles.dietCardActive]}
                  onPress={() => setDietary(opt.value)}
                >
                  <View style={styles.dietIconWrap}>
                    <Text style={styles.dietEmoji}>{opt.emoji}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.dietLabel, active && styles.dietLabelActive]}>{opt.label}</Text>
                    <Text style={styles.dietDesc}>{opt.desc}</Text>
                  </View>
                  <View style={[styles.radioOuter, active && styles.radioOuterActive]}>
                    {active && <View style={styles.radioInner} />}
                  </View>
                </Pressable>
              );
            })}
          </View>

          <Pressable style={styles.btn} onPress={() => setStep(2)}>
            <Text style={styles.btnText}>Continuer</Text>
            <ChevronRight size={18} color="#fff" />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────── Step 2: Allergies ───────────────────────────

  if (step === 2) {
    return (
      <SafeAreaView style={styles.safe}>
        <QuizHeader
          quizStep={2}
          onBack={() => setStep(1)}
          onSkip={() => setStep(3)}
        />
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.stepHeader}>
            <Text style={styles.stepTitle}>Des allergies ou intolérances ?</Text>
            <Text style={styles.stepSubtitle}>Sélectionne tout ce qui s'applique.</Text>
          </View>

          <View style={styles.chips}>
            {ALLERGY_OPTIONS.map((opt) => {
              const active = allergies.includes(opt.value);
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleAllergy(opt.value)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {active && opt.value === "none" ? "✓ " : ""}{opt.label}
                  </Text>
                </Pressable>
              );
            })}

            {customAllergies.map((name) => (
              <Pressable
                key={name}
                style={[styles.chip, styles.chipActive, styles.chipCustom]}
                onPress={() => setCustomAllergies((prev) => prev.filter((x) => x !== name))}
              >
                <Text style={[styles.chipText, styles.chipTextActive]}>{name}</Text>
                <X size={11} color="#fff" />
              </Pressable>
            ))}

            <Pressable
              style={[styles.chip, styles.chipAddBtn]}
              onPress={() => setShowAllergyInput((v) => !v)}
            >
              <Plus size={13} color={COLORS.primary} />
              <Text style={styles.chipAddText}>Autre</Text>
            </Pressable>
          </View>

          {showAllergyInput && (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Ex: Céleri, Moutarde..."
                placeholderTextColor={COLORS.muted}
                value={customAllergyInput}
                onChangeText={setCustomAllergyInput}
                onSubmitEditing={addCustomAllergy}
                returnKeyType="done"
                autoFocus
              />
              <Pressable
                style={[styles.inputAddBtn, !customAllergyInput.trim() && { opacity: 0.4 }]}
                onPress={addCustomAllergy}
                disabled={!customAllergyInput.trim()}
              >
                <Text style={styles.inputAddBtnText}>+</Text>
              </Pressable>
            </View>
          )}

          <Pressable style={styles.btn} onPress={() => setStep(3)}>
            <Text style={styles.btnText}>Continuer</Text>
            <ChevronRight size={18} color="#fff" />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────── Step 3: Nombre de personnes ───────────────────────────

  if (step === 3) {
    return (
      <SafeAreaView style={styles.safe}>
        <QuizHeader
          quizStep={3}
          onBack={() => setStep(2)}
          onSkip={() => setStep(4)}
        />
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.stepHeader}>
            <Text style={styles.stepTitle}>Tu cuisines pour combien de personnes ?</Text>
            <Text style={styles.stepSubtitle}>
              FridAI adapte les portions et les quantités à ton foyer.
            </Text>
          </View>

          <View style={styles.stepperWrap}>
            <Pressable
              style={[styles.stepperBtn, numberOfPeopleCount <= 1 && styles.stepperBtnDisabled]}
              onPress={() => setNumberOfPeopleCount((n) => Math.max(1, n - 1))}
              disabled={numberOfPeopleCount <= 1}
            >
              <Text style={styles.stepperBtnText}>−</Text>
            </Pressable>
            <View style={styles.stepperValue}>
              <Text style={styles.stepperNumber}>{numberOfPeopleCount}</Text>
              <Text style={styles.stepperUnit}>
                {numberOfPeopleCount === 1 ? "personne" : "personnes"}
              </Text>
            </View>
            <Pressable
              style={[styles.stepperBtn, numberOfPeopleCount >= 8 && styles.stepperBtnDisabled]}
              onPress={() => setNumberOfPeopleCount((n) => Math.min(8, n + 1))}
              disabled={numberOfPeopleCount >= 8}
            >
              <Text style={styles.stepperBtnText}>+</Text>
            </Pressable>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Prénom(s) (optionnel)</Text>
            <TextInput
              style={[styles.input, styles.inputDark]}
              placeholder="Sarah, Clément..."
              placeholderTextColor="rgba(255,255,255,0.45)"
              value={householdNames}
              onChangeText={setHouseholdNames}
            />
          </View>

          <Pressable style={styles.btn} onPress={() => setStep(4)}>
            <Text style={styles.btnText}>Continuer</Text>
            <ChevronRight size={18} color="#fff" />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────── Step 4: Cuisines préférées ───────────────────────────

  if (step === 4) {
    const displayedCuisines = showMoreCuisines
      ? [...CUISINE_OPTIONS, ...MORE_CUISINE_OPTIONS]
      : CUISINE_OPTIONS;

    return (
      <SafeAreaView style={styles.safe}>
        <QuizHeader
          quizStep={4}
          onBack={() => setStep(3)}
          onSkip={() => setStep(5)}
        />
        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.stepHeader}>
            <Text style={styles.stepTitle}>Tes cuisines préférées ?</Text>
            <Text style={styles.stepSubtitle}>
              Choisis-en au moins 2 — FridAI s'en souviendra pour varier tes menus.
            </Text>
          </View>

          <View style={styles.cuisineGrid}>
            {displayedCuisines.map((opt) => {
              const active = cuisines.includes(opt.value);
              return (
                <Pressable
                  key={opt.value}
                  style={[styles.cuisineCard, active && styles.cuisineCardActive]}
                  onPress={() => toggleCuisine(opt.value)}
                >
                  <Text style={styles.cuisineEmoji}>{opt.emoji}</Text>
                  <Text style={[styles.cuisineLabel, active && styles.cuisineLabelActive]}>
                    {opt.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <Pressable
            style={styles.moreCuisinesBtn}
            onPress={() => setShowMoreCuisines((v) => !v)}
          >
            {showMoreCuisines
              ? <ChevronUp size={15} color={COLORS.primary} />
              : <ChevronDown size={15} color={COLORS.primary} />}
            <Text style={styles.moreCuisinesText}>
              {showMoreCuisines ? "Voir moins" : "Voir d'autres cuisines"}
            </Text>
          </Pressable>

          {cuisineError && cuisines.length < 2 && (
            <Text style={styles.errorText}>Sélectionne au moins 2 cuisines pour continuer.</Text>
          )}
          <Pressable
            style={styles.btn}
            onPress={() => {
              if (cuisines.length < 2) { setCuisineError(true); return; }
              setStep(5);
            }}
          >
            <Text style={styles.btnText}>Continuer</Text>
            <ChevronRight size={18} color="#fff" />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────── Step 5: Ingrédients détestés ───────────────────────────

  if (step === 5) {
    const customDisliked = dislikedIngredients.filter((d) => !DISLIKED_OPTIONS.includes(d));

    return (
      <SafeAreaView style={styles.safe}>
        <QuizHeader
          quizStep={5}
          onBack={() => setStep(4)}
          onSkip={() => setStep(6)}
        />
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          <View style={styles.stepHeader}>
            <Text style={styles.stepTitle}>Des ingrédients que tu détestes ?</Text>
            <Text style={styles.stepSubtitle}>On ne te les proposera jamais. Promis.</Text>
          </View>

          <View style={styles.chips}>
            {DISLIKED_OPTIONS.map((name) => {
              const active = dislikedIngredients.includes(name);
              return (
                <Pressable
                  key={name}
                  style={[styles.chip, active && styles.chipActive]}
                  onPress={() => toggleDisliked(name)}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>{name}</Text>
                </Pressable>
              );
            })}

            {customDisliked.map((name) => (
              <Pressable
                key={name}
                style={[styles.chip, styles.chipActive, styles.chipCustom]}
                onPress={() => toggleDisliked(name)}
              >
                <Text style={[styles.chipText, styles.chipTextActive]}>{name}</Text>
                <X size={11} color="#fff" />
              </Pressable>
            ))}

            <Pressable
              style={[styles.chip, styles.chipAddBtn]}
              onPress={() => setShowDislikedInput((v) => !v)}
            >
              <Plus size={13} color={COLORS.primary} />
              <Text style={styles.chipAddText}>Ajouter</Text>
            </Pressable>
          </View>

          {showDislikedInput && (
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                placeholder="Ex: Poivrons, Betteraves..."
                placeholderTextColor={COLORS.muted}
                value={customDislikedInput}
                onChangeText={setCustomDislikedInput}
                onSubmitEditing={addCustomDisliked}
                returnKeyType="done"
                autoFocus
              />
              <Pressable
                style={[styles.inputAddBtn, !customDislikedInput.trim() && { opacity: 0.4 }]}
                onPress={addCustomDisliked}
                disabled={!customDislikedInput.trim()}
              >
                <Text style={styles.inputAddBtnText}>+</Text>
              </Pressable>
            </View>
          )}

          <Pressable style={styles.btn} onPress={() => setStep(6)}>
            <Text style={styles.btnText}>Continuer</Text>
            <ChevronRight size={18} color="#fff" />
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ─────────────────────────── Step 6: Scan ───────────────────────────

  if (step === 6) {
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
          <QuizHeader
            quizStep={6}
            onBack={() => setScanSubStep("idle")}
          />
          <Image source={{ uri: scanResult.imageUrl }} style={styles.previewImage} />

          <View style={{ paddingHorizontal: 16, paddingVertical: 10 }}>
            <Text style={styles.stepTitle}>Vérifiez les aliments détectés</Text>
            <Text style={styles.stepSubtitle}>Décochez les aliments incorrects ou ajustez les quantités</Text>
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
                <Text style={[styles.ingredientName, { flex: 1 }]}>{item.name}</Text>
                <TextInput
                  style={styles.qtyInput}
                  value={editedQtys[index] ?? ""}
                  onChangeText={(t) => setEditedQtys((prev) => ({ ...prev, [index]: t }))}
                  placeholder="qté"
                  placeholderTextColor={COLORS.muted}
                  keyboardType="default"
                />
              </Pressable>
            )}
          />

          <View style={styles.reviewActions}>
            <Pressable style={styles.btnSecondary} onPress={() => setScanSubStep("idle")}>
              <Text style={styles.btnSecondaryText}>Recommencer</Text>
            </Pressable>
            <Pressable style={[styles.btn, { flex: 1 }]} onPress={handleGenerate}>
              <Text style={styles.btnText}>Confirmer ({selectedIngredients.size})</Text>
            </Pressable>
          </View>
        </SafeAreaView>
      );
    }

    // Guest gate — scan requiert un compte
    if (!isAuthenticated) {
      return (
        <SafeAreaView style={styles.safe}>
          <QuizHeader quizStep={6} onBack={() => setStep(5)} />
          <View style={[styles.center, { flex: 1 }]}>
            <Animated.View style={[styles.scanIconWrap, { transform: [{ scale: scanPulse }] }]}>
              <ScanLine size={64} color={COLORS.primary} />
            </Animated.View>
            <Text style={styles.stepTitle}>Activez le scan IA</Text>
            <Text style={[styles.stepSubtitle, { textAlign: "center", paddingHorizontal: 32 }]}>
              Créez votre compte gratuit pour scanner votre frigo avec l'IA et générer votre liste de courses.
            </Text>
            <View style={styles.scanActions}>
              <Pressable
                style={styles.btn}
                onPress={() => {
                  saveStep(6);
                  router.push("/(auth)/register" as any);
                }}
              >
                <Text style={styles.btnText}>Créer mon compte gratuit →</Text>
              </Pressable>
              <Pressable style={styles.btnSecondary} onPress={() => router.push("/(auth)/login" as any)}>
                <Text style={styles.btnSecondaryText}>J'ai déjà un compte</Text>
              </Pressable>
            </View>
          </View>
        </SafeAreaView>
      );
    }

    return (
      <SafeAreaView style={styles.safe}>
        <QuizHeader
          quizStep={6}
          onBack={() => setStep(5)}
        />
        <View style={[styles.center, { flex: 1 }]}>
          <Animated.View style={[styles.scanIconWrap, { transform: [{ scale: scanPulse }] }]}>
            <ScanLine size={64} color={COLORS.primary} />
          </Animated.View>
          <Text style={styles.stepTitle}>Scannez votre frigo</Text>
          <Text style={[styles.stepSubtitle, { textAlign: "center", paddingHorizontal: 32 }]}>
            Prenez une photo pour que l'IA détecte automatiquement vos ingrédients et génère votre liste de courses
          </Text>

          <View style={styles.scanActions}>
            <Pressable style={styles.btn} onPress={() => pickImage(true)}>
              <Camera size={20} color="#fff" />
              <Text style={styles.btnText}>Prendre une photo</Text>
            </Pressable>
            <Pressable style={styles.btnSecondary} onPress={() => pickImage(false)}>
              <Text style={styles.btnSecondaryText}>Choisir depuis la galerie</Text>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  // ─────────────────────────── Step 7: Generation ───────────────────────────

  if (step === 7) {
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
                    <PulsingDots />
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

  // ─────────────────────────── Step 8: Résultats floutés + Paywall ───────────────────────────

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.resultsHeader}>
          <View style={styles.resultsBadge}>
            <Check size={16} color="#fff" />
            <Text style={styles.resultsBadgeText}>Liste générée !</Text>
          </View>
          <Text style={styles.resultsTitle}>🛒 Votre liste est prête</Text>
          <Text style={styles.resultsSubtitle}>
            {shoppingList.length} article{shoppingList.length > 1 ? "s" : ""} identifiés pour votre semaine
          </Text>
        </View>

        <View style={styles.lockedList}>
          {[...Array(Math.min(shoppingList.length || 5, 6))].map((_, i) => (
            <View key={i} style={styles.lockedRow}>
              <View style={styles.lockedDot} />
              <View style={[styles.lockedBar, { width: `${55 + (i % 3) * 15}%` as any }]} />
            </View>
          ))}
          <View style={styles.lockedOverlay}>
            <View style={styles.lockBadge}>
              <Lock size={20} color="#fff" />
              <Text style={styles.lockBadgeText}>Contenu verrouillé</Text>
            </View>
          </View>
        </View>

        <View style={styles.paywallCta}>
          <Pressable
            style={styles.btn}
            onPress={() => router.push("/paywall" as any)}
          >
            <Text style={styles.btnText}>Voir ma liste complète</Text>
            <ChevronRight size={18} color="#fff" />
          </Pressable>
          <Text style={styles.paywallNote}>
            Débloquez votre liste · Annulation à tout moment
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ─────────────────────────── Styles ───────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 24, gap: 24, paddingBottom: 40 },
  center: { justifyContent: "center", alignItems: "center", padding: 24, gap: 16 },

  // Quiz header + progress bar
  quizHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  progressWrap: { flex: 1 },
  progressTrack: {
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: 4,
    backgroundColor: COLORS.primary,
    borderRadius: 2,
  },
  passerBtn: { paddingHorizontal: 4 },
  passerText: { fontSize: 14, color: COLORS.muted, fontWeight: "500" },

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

  // List mockup (step 0)
  listMockup: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  listMockupHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.primaryLight,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  listMockupBadge: {
    flexDirection: "row",
    alignItems: "center",
  },
  listMockupBadgeText: { fontSize: 12, fontWeight: "700", color: COLORS.primary },
  listMockupCount: { fontSize: 12, color: COLORS.muted, fontWeight: "500" },
  listMockupRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  listMockupCheck: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  listMockupCheckDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  listMockupItem: { flex: 1, fontSize: 13, color: COLORS.text, fontWeight: "500" },
  listMockupItemDone: { color: COLORS.muted, textDecorationLine: "line-through" },
  listMockupQty: { fontSize: 12, color: COLORS.muted },
  listMockupMore: {
    fontSize: 12,
    color: COLORS.muted,
    textAlign: "center",
    paddingVertical: 10,
    fontStyle: "italic",
  },

  // Step header
  stepHeader: { gap: 6 },
  stepTitle: { fontSize: 24, fontWeight: "700", color: COLORS.text, lineHeight: 30 },
  stepSubtitle: { fontSize: 14, color: COLORS.muted, lineHeight: 20 },

  // Diet cards (step 1)
  dietList: { gap: 10 },
  dietCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    gap: 12,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  dietCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  dietIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  dietEmoji: { fontSize: 22 },
  dietLabel: { fontSize: 15, fontWeight: "600", color: COLORS.text },
  dietLabelActive: { color: COLORS.primary },
  dietDesc: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuterActive: { borderColor: COLORS.primary },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.primary,
  },

  // People stepper (step 3)
  stepperWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 28,
    gap: 28,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  stepperBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: COLORS.primaryLight,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  stepperBtnDisabled: { backgroundColor: COLORS.background, borderColor: COLORS.border, opacity: 0.35 },
  stepperBtnText: { fontSize: 30, fontWeight: "300", color: COLORS.primary, lineHeight: 36 },
  stepperValue: { alignItems: "center", minWidth: 90 },
  stepperNumber: { fontSize: 56, fontWeight: "800", color: COLORS.text, letterSpacing: -2 },
  stepperUnit: { fontSize: 14, color: COLORS.muted, fontWeight: "500", marginTop: -4 },

  // Cuisine grid (step 4)
  cuisineGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  cuisineCard: {
    width: "30%",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 6,
    borderWidth: 1.5,
    borderColor: COLORS.border,
  },
  cuisineCardActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  cuisineEmoji: { fontSize: 26 },
  cuisineLabel: { fontSize: 11, fontWeight: "500", color: COLORS.muted, textAlign: "center" },
  cuisineLabelActive: { color: COLORS.primary, fontWeight: "600" },
  moreCuisinesBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
  },
  moreCuisinesText: { fontSize: 14, color: COLORS.primary, fontWeight: "600" },

  // Chips
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  chipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primary },
  chipCustom: { paddingHorizontal: 10 },
  chipText: { fontSize: 14, color: COLORS.muted, fontWeight: "500" },
  chipTextActive: { color: "#fff", fontWeight: "600" },
  chipAddBtn: { borderColor: COLORS.primary, borderStyle: "dashed" },
  chipAddText: { fontSize: 14, color: COLORS.primary, fontWeight: "600" },

  // Sections
  section: { gap: 8 },
  sectionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.muted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Inputs
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
  inputDark: {
    backgroundColor: COLORS.darkBg,
    borderColor: "transparent",
    color: "#fff",
  },
  inputAddBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    paddingHorizontal: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  inputAddBtnText: { color: "#fff", fontSize: 22, fontWeight: "600" },

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
  qtyInput: {
    width: 60,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 13,
    color: COLORS.text,
    textAlign: "center",
  },
  errorText: {
    fontSize: 13,
    color: COLORS.destructive,
    textAlign: "center",
    fontWeight: "500",
  },
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

  // Generation (step 7)
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

  // Shopping list (step 8)
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
  btnDisabled: { backgroundColor: COLORS.border },
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

  // Progress label
  progressLabel: { fontSize: 11, color: COLORS.muted, textAlign: "center", marginTop: 4 },

  // Step 8 — Résultats floutés
  resultsHeader: { alignItems: "center", gap: 10, paddingTop: 8 },
  resultsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
  },
  resultsBadgeText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  resultsTitle: { fontSize: 26, fontWeight: "800", color: COLORS.text, textAlign: "center" },
  resultsSubtitle: { fontSize: 14, color: COLORS.muted, textAlign: "center" },

  lockedList: {
    marginTop: 20,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  lockedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  lockedDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.border,
  },
  lockedBar: {
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.border,
  },
  lockedOverlay: {
    position: "absolute",
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(249,250,251,0.85)",
    justifyContent: "center",
    alignItems: "center",
  },
  lockBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.text,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 30,
  },
  lockBadgeText: { color: "#fff", fontSize: 14, fontWeight: "700" },

  paywallCta: { gap: 12, marginTop: 24 },
  paywallNote: { fontSize: 12, color: COLORS.muted, textAlign: "center" },
});
