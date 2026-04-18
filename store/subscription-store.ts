import { create } from "zustand";
import Purchases, {
  CustomerInfo,
  PurchasesOfferings,
  PurchasesPackage,
  PURCHASES_ERROR_CODE,
} from "react-native-purchases";
import * as SecureStore from "expo-secure-store";
import { isPremiumCustomer } from "../lib/purchases";

const PREMIUM_KEY = "fridai_is_premium";

const persistPremium = async (value: boolean) => {
  try {
    await SecureStore.setItemAsync(PREMIUM_KEY, value ? "true" : "false");
  } catch {
    // SecureStore indisponible (simulateur sans enclave) — on ignore
  }
};

type SubscriptionState = {
  isPremium: boolean;
  isLoading: boolean;
  offerings: PurchasesOfferings | null;
  customerInfo: CustomerInfo | null;

  loadPremiumFromStorage: () => Promise<void>;
  checkSubscription: () => Promise<void>;
  fetchOfferings: () => Promise<void>;
  purchasePackage: (pkg: PurchasesPackage) => Promise<{ success: boolean; error?: string }>;
  restorePurchases: () => Promise<{ success: boolean; restored: boolean; error?: string }>;
};

export const useSubscriptionStore = create<SubscriptionState>((set, get) => ({
  isPremium: false,
  isLoading: false,
  offerings: null,
  customerInfo: null,

  loadPremiumFromStorage: async () => {
    try {
      const stored = await SecureStore.getItemAsync(PREMIUM_KEY);
      if (stored === "true") {
        set({ isPremium: true });
      }
    } catch {
      // ignore
    }
  },

  checkSubscription: async () => {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      const isPremium = isPremiumCustomer(customerInfo);
      set({ customerInfo, isPremium });
      await persistPremium(isPremium);
    } catch {
      // RC non configuré ou réseau — état SecureStore conservé
    }
  },

  fetchOfferings: async () => {
    if (get().offerings) return;
    try {
      set({ isLoading: true });
      const offerings = await Purchases.getOfferings();
      set({ offerings, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  purchasePackage: async (pkg) => {
    try {
      set({ isLoading: true });
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const isPremium = isPremiumCustomer(customerInfo);
      set({ customerInfo, isPremium, isLoading: false });
      await persistPremium(isPremium);
      return { success: isPremium };
    } catch (err: any) {
      set({ isLoading: false });
      if (err?.code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR) {
        return { success: false };
      }
      return {
        success: false,
        error: err?.message ?? "Une erreur est survenue lors du paiement.",
      };
    }
  },

  restorePurchases: async () => {
    try {
      set({ isLoading: true });
      const customerInfo = await Purchases.restorePurchases();
      const isPremium = isPremiumCustomer(customerInfo);
      set({ customerInfo, isPremium, isLoading: false });
      await persistPremium(isPremium);
      return { success: true, restored: isPremium };
    } catch (err: any) {
      set({ isLoading: false });
      return {
        success: false,
        restored: false,
        error: err?.message ?? "Impossible de restaurer les achats.",
      };
    }
  },
}));
