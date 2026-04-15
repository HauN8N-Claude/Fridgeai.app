import { create } from "zustand";
import { apiRequest, storage } from "../lib/api";

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

  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  loadSession: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  org: null,
  isLoading: true,
  isAuthenticated: false,

  login: async (email, password) => {
    const response = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000"}/api/auth/sign-in/email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      },
    );

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message ?? "Email ou mot de passe incorrect");
    }

    // Extraire le token de session depuis les cookies
    const setCookie = response.headers.get("set-cookie") ?? "";
    const match = setCookie.match(/better-auth\.session_token=([^;]+)/);
    const token = match?.[1];

    if (!token) {
      throw new Error("Session introuvable après connexion");
    }

    await storage.setSession(token);

    const data = await response.json();
    const user: User = data.user;

    // Charger l'organisation de l'utilisateur
    const orgs = await apiRequest<Org[]>("/api/mobile/orgs");
    const org = orgs[0] ?? null;

    if (org) {
      await storage.setOrgId(org.id);
    }

    set({ user, org, isAuthenticated: true });
  },

  logout: async () => {
    await Promise.all([
      storage.clearSession(),
      storage.clearOrgId(),
    ]);
    set({ user: null, org: null, isAuthenticated: false });
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

      if (org) {
        await storage.setOrgId(org.id);
      }

      set({ user: data.user, org, isAuthenticated: true, isLoading: false });
    } catch {
      await storage.clearSession();
      set({ isLoading: false, isAuthenticated: false });
    }
  },
}));
