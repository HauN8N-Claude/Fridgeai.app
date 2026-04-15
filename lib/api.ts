import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const API_URL =
  (Constants.expoConfig?.extra?.apiUrl as string) ?? "http://localhost:3000";

const SESSION_KEY = "fridai_session";
const ORG_ID_KEY = "fridai_org_id";

export const storage = {
  getSession: () => SecureStore.getItemAsync(SESSION_KEY),
  setSession: (token: string) => SecureStore.setItemAsync(SESSION_KEY, token),
  clearSession: () => SecureStore.deleteItemAsync(SESSION_KEY),
  getOrgId: () => SecureStore.getItemAsync(ORG_ID_KEY),
  setOrgId: (id: string) => SecureStore.setItemAsync(ORG_ID_KEY, id),
  clearOrgId: () => SecureStore.deleteItemAsync(ORG_ID_KEY),
};

type RequestOptions = {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  formData?: FormData;
};

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export const apiRequest = async <T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> => {
  const { method = "GET", body, formData } = options;

  const session = await storage.getSession();
  const orgId = await storage.getOrgId();

  const headers: Record<string, string> = {};

  if (!formData) {
    headers["Content-Type"] = "application/json";
  }

  if (session) {
    headers["Cookie"] = `better-auth.session_token=${session}`;
  }

  if (orgId) {
    headers["x-org-id"] = orgId;
  }

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: formData ?? (body ? JSON.stringify(body) : undefined),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "Erreur réseau" }));
    throw new ApiError(response.status, error.message ?? "Erreur inconnue");
  }

  return response.json() as Promise<T>;
};
