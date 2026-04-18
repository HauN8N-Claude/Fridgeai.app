import Purchases, { LOG_LEVEL } from "react-native-purchases";

export const ENTITLEMENT_ID = "premium";

export const RC_PRODUCT_IDS = {
  annual: "fridai_annual",
  monthly: "fridai_monthly",
  lifetime: "fridai_lifetime",
} as const;

export function initPurchases(userId?: string) {
  const apiKey = process.env.EXPO_PUBLIC_RC_API_KEY;
  if (!apiKey) {
    console.warn("[Purchases] EXPO_PUBLIC_RC_API_KEY manquante — RevenueCat désactivé");
    return;
  }

  if (__DEV__) {
    Purchases.setLogLevel(LOG_LEVEL.DEBUG);
  }

  Purchases.configure({
    apiKey,
    appUserID: userId ?? null,
  });
}

export function isPremiumCustomer(
  customerInfo: import("react-native-purchases").CustomerInfo
): boolean {
  return customerInfo.entitlements.active[ENTITLEMENT_ID] !== undefined;
}
