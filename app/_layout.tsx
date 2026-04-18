import * as SplashScreen from "expo-splash-screen";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useAuthStore } from "../store/auth-store";
import { useSubscriptionStore } from "../store/subscription-store";
import { initPurchases } from "../lib/purchases";

SplashScreen.preventAutoHideAsync();
initPurchases();

const queryClient = new QueryClient();

function AuthGuard() {
  const { isAuthenticated, isLoading, needsOnboarding, loadSession, user } = useAuthStore();
  const { checkSubscription, loadPremiumFromStorage } = useSubscriptionStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    loadSession();
    loadPremiumFromStorage();
  }, []);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      initPurchases(user.id);
      checkSubscription();
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (isLoading) return;

    SplashScreen.hideAsync();

    const seg = segments as string[];
    const inAuthGroup = seg[0] === "(auth)";
    const inOnboarding = seg[0] === "onboarding";
    const inPaywall = seg[0] === "paywall";

    // Guest autorisé sur /onboarding (steps 0-5 sans auth) et /paywall
    if (!isAuthenticated && !inAuthGroup && !inOnboarding && !inPaywall) {
      router.replace("/(auth)/landing");
    } else if (isAuthenticated && needsOnboarding && !inOnboarding && !inPaywall) {
      router.replace("/onboarding" as any);
    } else if (isAuthenticated && !needsOnboarding && (inAuthGroup || inOnboarding)) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, needsOnboarding, segments]);

  if (isLoading) return null;

  return <Slot />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="auto" />
      <AuthGuard />
    </QueryClientProvider>
  );
}
