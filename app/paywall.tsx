import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  Alert,
  Animated,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Check, X } from "lucide-react-native";
import { PurchasesPackage } from "react-native-purchases";
import { useAuthStore } from "../store/auth-store";
import { useSubscriptionStore } from "../store/subscription-store";
import { RC_PRODUCT_IDS } from "../lib/purchases";
import { COLORS } from "../lib/theme";

const PLAN_META: Record<string, {
  label: string;
  badge: string | null;
  savings: string | null;
  sub: string;
  highlight: boolean;
}> = {
  [RC_PRODUCT_IDS.annual]: {
    label: "Annuel",
    badge: "Meilleur prix",
    savings: "Économisez 35%",
    sub: "soit 3,25€ / mois",
    highlight: true,
  },
  [RC_PRODUCT_IDS.monthly]: {
    label: "Mensuel",
    badge: null,
    savings: null,
    sub: "par mois",
    highlight: false,
  },
  [RC_PRODUCT_IDS.lifetime]: {
    label: "À vie",
    badge: null,
    savings: null,
    sub: "paiement unique",
    highlight: false,
  },
};

const PLAN_ORDER = [RC_PRODUCT_IDS.annual, RC_PRODUCT_IDS.monthly, RC_PRODUCT_IDS.lifetime];

const FEATURES = [
  "Liste de courses complète",
  "Plans repas illimités",
  "Scans illimités",
  "Partage familial (5 membres)",
  "Historique des plans",
];

export default function PaywallScreen() {
  const { completeOnboarding } = useAuthStore();
  const { offerings, isLoading, fetchOfferings, purchasePackage, restorePurchases } =
    useSubscriptionStore();
  const router = useRouter();

  const [selectedId, setSelectedId] = useState(RC_PRODUCT_IDS.annual);
  const [purchasing, setPurchasing] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const scaleAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showSuccess) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 12,
        stiffness: 160,
      }).start();
    }
  }, [showSuccess]);

  useEffect(() => {
    fetchOfferings();
  }, []);

  const packages: PurchasesPackage[] = (
    offerings?.current?.availablePackages ?? []
  ).sort((a, b) => {
    const ai = PLAN_ORDER.indexOf(a.product.identifier);
    const bi = PLAN_ORDER.indexOf(b.product.identifier);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  const selectedPackage = packages.find((p) => p.product.identifier === selectedId);

  const handlePurchase = async () => {
    if (!selectedPackage) {
      // RC non configuré (dev) → compléter onboarding directement
      completeOnboarding();
      return;
    }

    setPurchasing(true);
    const result = await purchasePackage(selectedPackage);
    setPurchasing(false);

    if (result.success) {
      setShowSuccess(true);
    } else if (result.error) {
      Alert.alert("Erreur de paiement", result.error);
    }
  };

  const handleRestore = async () => {
    setPurchasing(true);
    const result = await restorePurchases();
    setPurchasing(false);

    if (result.restored) {
      setShowSuccess(true);
    } else if (result.error) {
      Alert.alert("Erreur", result.error);
    } else {
      Alert.alert("Aucun achat trouvé", "Aucun abonnement actif n'a été trouvé sur ce compte.");
    }
  };

  const busy = isLoading || purchasing;

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable style={styles.closeBtn} onPress={() => router.back()} disabled={busy}>
        <X size={20} color={COLORS.muted} />
      </Pressable>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>Déverrouillez votre liste</Text>
          <Text style={styles.subtitle}>
            Votre liste de courses est prête.{"\n"}Abonnez-vous pour y accéder.
          </Text>
        </View>

        <View style={styles.features}>
          {FEATURES.map((f) => (
            <View key={f} style={styles.featureRow}>
              <View style={styles.featureCheck}>
                <Check size={13} color="#fff" />
              </View>
              <Text style={styles.featureText}>{f}</Text>
            </View>
          ))}
        </View>

        {isLoading && !packages.length ? (
          <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 24 }} />
        ) : (
          <View style={styles.plans}>
            {(packages.length ? packages : FALLBACK_PACKAGES).map((pkg) => {
              const id = typeof pkg === "string" ? pkg : pkg.product.identifier;
              const price = typeof pkg === "string" ? null : pkg.product.priceString;
              const meta = PLAN_META[id];
              if (!meta) return null;
              const active = selectedId === id;

              return (
                <Pressable
                  key={id}
                  style={[
                    styles.planCard,
                    meta.highlight && styles.planCardHighlight,
                    active && styles.planCardSelected,
                  ]}
                  onPress={() => setSelectedId(id)}
                  disabled={busy}
                >
                  {meta.badge && (
                    <View style={styles.planBadge}>
                      <Text style={styles.planBadgeText}>{meta.badge}</Text>
                    </View>
                  )}
                  <View style={styles.planRow}>
                    <View style={[styles.radio, active && styles.radioActive]}>
                      {active && <View style={styles.radioDot} />}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.planLabel}>{meta.label}</Text>
                      {meta.savings && (
                        <Text style={styles.planSavings}>{meta.savings}</Text>
                      )}
                    </View>
                    <View style={{ alignItems: "flex-end" }}>
                      <Text style={styles.planPrice}>
                        {price ?? FALLBACK_PRICES[id] ?? "—"}
                      </Text>
                      <Text style={styles.planSub}>{meta.sub}</Text>
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}

        <Pressable
          style={[styles.ctaBtn, busy && styles.ctaBtnDisabled]}
          onPress={handlePurchase}
          disabled={busy}
        >
          {busy ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.ctaBtnText}>Continuer →</Text>
          )}
        </Pressable>

        <View style={styles.legal}>
          <Text style={styles.legalText}>Annulation à tout moment depuis les Réglages iOS</Text>
          <Pressable onPress={handleRestore} disabled={busy}>
            <Text style={styles.legalLink}>Restaurer un achat</Text>
          </Pressable>
          <View style={styles.legalLinks}>
            <Pressable onPress={() => {}}>
              <Text style={styles.legalLink}>CGU</Text>
            </Pressable>
            <Text style={styles.legalSep}>·</Text>
            <Pressable onPress={() => {}}>
              <Text style={styles.legalLink}>Confidentialité</Text>
            </Pressable>
          </View>
        </View>
      </ScrollView>

      {showSuccess && (
        <View style={styles.successOverlay}>
          <Animated.View style={[styles.successCircle, { transform: [{ scale: scaleAnim }] }]}>
            <Check size={44} color="#fff" strokeWidth={3} />
          </Animated.View>
          <Text style={styles.successTitle}>Abonnement activé !</Text>
          <Text style={styles.successSubtitle}>
            Bienvenue dans FridAI Premium.{"\n"}Ta liste de courses t'attend.
          </Text>
          <Pressable style={styles.successBtn} onPress={completeOnboarding}>
            <Text style={styles.successBtnText}>Accéder à FridAI →</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

// Affiché si RC n'est pas encore configuré (dev / avant EAS Build)
const FALLBACK_PACKAGES = [
  RC_PRODUCT_IDS.annual,
  RC_PRODUCT_IDS.monthly,
  RC_PRODUCT_IDS.lifetime,
];
const FALLBACK_PRICES: Record<string, string> = {
  [RC_PRODUCT_IDS.annual]: "39€",
  [RC_PRODUCT_IDS.monthly]: "4,99€",
  [RC_PRODUCT_IDS.lifetime]: "69,99€",
};

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: 24, gap: 24, paddingBottom: 48 },

  closeBtn: {
    position: "absolute",
    top: 56,
    right: 20,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },

  header: { gap: 8, paddingTop: 8 },
  title: { fontSize: 28, fontWeight: "800", color: COLORS.text, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: COLORS.muted, lineHeight: 22 },

  features: { gap: 10 },
  featureRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  featureCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  featureText: { fontSize: 14, color: COLORS.text, fontWeight: "500" },

  plans: { gap: 10 },
  planCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    padding: 16,
  },
  planCardHighlight: { borderColor: COLORS.primary },
  planCardSelected: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryLight },
  planBadge: {
    alignSelf: "flex-start",
    backgroundColor: COLORS.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginBottom: 10,
  },
  planBadgeText: { color: "#fff", fontSize: 11, fontWeight: "700" },
  planRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  radio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  radioActive: { borderColor: COLORS.primary },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: COLORS.primary },
  planLabel: { fontSize: 15, fontWeight: "700", color: COLORS.text },
  planSavings: { fontSize: 12, color: COLORS.primary, fontWeight: "600", marginTop: 2 },
  planPrice: { fontSize: 18, fontWeight: "800", color: COLORS.text },
  planSub: { fontSize: 11, color: COLORS.muted },

  ctaBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 56,
  },
  ctaBtnDisabled: { opacity: 0.6 },
  ctaBtnText: { color: "#fff", fontSize: 17, fontWeight: "800" },

  legal: { alignItems: "center", gap: 6 },
  legalText: { fontSize: 12, color: COLORS.muted, textAlign: "center" },
  legalLink: { fontSize: 12, color: COLORS.primary, fontWeight: "600", textAlign: "center" },
  legalSep: { fontSize: 12, color: COLORS.muted },
  legalLinks: { flexDirection: "row", gap: 8, alignItems: "center" },

  // Success overlay
  successOverlay: {
    position: "absolute",
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: COLORS.darkBg,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 40,
  },
  successCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 30,
    fontWeight: "800",
    color: "#fff",
    textAlign: "center",
    letterSpacing: -0.5,
  },
  successSubtitle: {
    fontSize: 16,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    lineHeight: 24,
  },
  successBtn: {
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 17,
    paddingHorizontal: 40,
    marginTop: 12,
  },
  successBtnText: {
    color: COLORS.darkBg,
    fontSize: 16,
    fontWeight: "800",
  },
});
