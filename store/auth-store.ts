import { create } from "zustand";
import { apiRequest, storage } from "../lib/api";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

type User = {
  id: string;
  name: string;
  email: string;
  image?: string | null;
};

type Org = {
  id: string;
  name: string;
  slug: string;
};

type AuthState = {
  user: User | null;
  org: Org | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  needsOnboarding: boolean;

  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
  completeOnboarding: () => void;
  resetOnboarding: () => void;
};

const signInAndStore = async (
  email: string,
  password: string,
): Promise<{ user: User; org: Org | null }> => {
  const res = await fetch(`${API_URL}/api/auth/sign-in/email`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message ?? "Email ou mot de passe incorrect");
  }

  const setCookie = res.headers.get("set-cookie") ?? "";
  const match = setCookie.match(/better-auth\.session_token=([^;]+)/);
  const token = match?.[1];
  if (!token) throw new Error("Session introuvable après connexion");

  await storage.setSession(token);

  const data = await res.json();
  const user: User = data.user;

  const orgs = await apiRequest<Org[]>("/api/mobile/orgs");
  const org = orgs[0] ?? null;
  if (org) await storage.setOrgId(org.id);

  return { user, org };
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  org: null,
  isLoading: true,
  isAuthenticated: false,
  needsOnboarding: false,

  login: async (email, password) => {
    const { user, org } = await signInAndStore(email, password);
    set({ user, org, isAuthenticated: true, needsOnboarding: false });
  },

  register: async (name, email, password) => {
    const signUpRes = await fetch(`${API_URL}/api/auth/sign-up/email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!signUpRes.ok) {
      const err = await signUpRes.json().catch(() => ({}));
      throw new Error(err.message ?? "Erreur lors de la création du compte");
    }

    const { user, org } = await signInAndStore(email, password);
    set({ user, org, isAuthenticated: true, needsOnboarding: true });
  },

  logout: async () => {
    await Promise.all([storage.clearSession(), storage.clearOrgId()]);
    set({ user: null, org: null, isAuthenticated: false, needsOnboarding: false });
  },

  loadSession: async () => {
    try {
      const session = await storage.getSession();
      if (!session) {
        set({ isLoading: false, isAuthenticated: false });
        return;
      }

      const data = await apiRequest<{ user: User }>("/api/mobile/me");
      const orgs = await apiRequest<Org[]>("/api/mobile/orgs");
      const org = orgs[0] ?? null;

      if (org) await storage.setOrgId(org.id);

      set({ user: data.user, org, isAuthenticated: true, isLoading: false });
    } catch {
      await storage.clearSession();
      set({ isLoading: false, isAuthenticated: false });
    }
  },

  completeOnboarding: () => {
    set({ needsOnboarding: false });
  },

  resetOnboarding: () => {
    set({ needsOnboarding: true });
  },
}));
