import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Slot, useRouter, useSegments } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { useEffect } from "react";
import { useAuthStore } from "../store/auth-store";

const queryClient = new QueryClient();

function AuthGuard() {
  const { isAuthenticated, isLoading, needsOnboarding, loadSession } = useAuthStore();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    loadSession();
  }, []);

  useEffect(() => {
    if (isLoading) return;

    const seg = segments as string[];
    const inAuthGroup = seg[0] === "(auth)";
    const inOnboarding = seg[0] === "onboarding";

    if (!isAuthenticated && !inAuthGroup) {
      router.replace("/(auth)/login");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } else if (isAuthenticated && needsOnboarding && !inOnboarding) {
      router.replace("/onboarding" as any);
    } else if (isAuthenticated && !needsOnboarding && (inAuthGroup || inOnboarding)) {
      router.replace("/(tabs)");
    }
  }, [isAuthenticated, isLoading, needsOnboarding, segments]);

  return <Slot />;
}

export default function RootLayout() {
  return (
    <QueryClientProvider client={queryClient}>
      <StatusBar style="dark" />
      <AuthGuard />
    </QueryClientProvider>
  );
}
