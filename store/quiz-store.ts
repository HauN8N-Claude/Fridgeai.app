import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import * as SecureStore from "expo-secure-store";

type ScanIngredient = { name: string; quantity?: number; unit?: string };
type ScanResult = { scanId: string; imageUrl: string; ingredients: ScanIngredient[] };

type QuizState = {
  // Navigation
  step: number;

  // Step 1 — Diet
  dietary: string;

  // Step 2 — Allergies
  allergies: string[];
  customAllergies: string[];

  // Step 3 — Household
  householdType: string;
  householdNames: string;

  // Step 4 — Cuisines
  cuisines: string[];

  // Step 5 — Disliked
  dislikedIngredients: string[];

  // Step 6 — Scan (ou saisie manuelle guest)
  scanResult: ScanResult | null;
  selectedIngredients: number[];
  manualIngredients: string[];

  // Actions
  setStep: (step: number) => void;
  setDietary: (value: string) => void;
  setAllergies: (value: string[]) => void;
  setCustomAllergies: (value: string[]) => void;
  setHouseholdType: (value: string) => void;
  setHouseholdNames: (value: string) => void;
  setCuisines: (value: string[]) => void;
  setDislikedIngredients: (value: string[]) => void;
  setScanResult: (result: ScanResult | null) => void;
  setSelectedIngredients: (indices: number[]) => void;
  addManualIngredient: (name: string) => void;
  removeManualIngredient: (name: string) => void;
  reset: () => void;
};

const DEFAULT_STATE = {
  step: 0,
  dietary: "omnivore",
  allergies: ["none"],
  customAllergies: [],
  householdType: "",
  householdNames: "",
  cuisines: [],
  dislikedIngredients: [],
  scanResult: null,
  selectedIngredients: [],
  manualIngredients: [],
};

const secureStorage = createJSONStorage(() => ({
  getItem: (name: string) => SecureStore.getItemAsync(name),
  setItem: (name: string, value: string) => SecureStore.setItemAsync(name, value),
  removeItem: (name: string) => SecureStore.deleteItemAsync(name),
}));

export const useQuizStore = create<QuizState>()(
  persist(
    (set) => ({
      ...DEFAULT_STATE,

      setStep: (step) => set({ step }),
      setDietary: (dietary) => set({ dietary }),
      setAllergies: (allergies) => set({ allergies }),
      setCustomAllergies: (customAllergies) => set({ customAllergies }),
      setHouseholdType: (householdType) => set({ householdType }),
      setHouseholdNames: (householdNames) => set({ householdNames }),
      setCuisines: (cuisines) => set({ cuisines }),
      setDislikedIngredients: (dislikedIngredients) => set({ dislikedIngredients }),
      setScanResult: (scanResult) => set({ scanResult }),
      setSelectedIngredients: (selectedIngredients) => set({ selectedIngredients }),
      addManualIngredient: (name) =>
        set((s) =>
          s.manualIngredients.includes(name)
            ? s
            : { manualIngredients: [...s.manualIngredients, name] }
        ),
      removeManualIngredient: (name) =>
        set((s) => ({ manualIngredients: s.manualIngredients.filter((i) => i !== name) })),
      reset: () => set(DEFAULT_STATE),
    }),
    {
      name: "fridai_quiz",
      storage: secureStorage,
      // Ne pas persister les données de scan (trop volumineuses pour SecureStore)
      partialize: (state) => ({
        step: state.step,
        dietary: state.dietary,
        allergies: state.allergies,
        customAllergies: state.customAllergies,
        householdType: state.householdType,
        householdNames: state.householdNames,
        cuisines: state.cuisines,
        dislikedIngredients: state.dislikedIngredients,
      }),
    }
  )
);
