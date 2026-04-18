import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Eye, EyeOff } from "lucide-react-native";
import { useAuthStore } from "../../store/auth-store";
import { COLORS } from "../../lib/theme";

export default function LoginScreen() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      Alert.alert("Connexion impossible", (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          bounces={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Text style={styles.backText}>← Retour</Text>
            </Pressable>
            <Text style={styles.title}>Bon retour 👋</Text>
            <Text style={styles.subtitle}>Connectez-vous à votre compte FridAI</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.field}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, focused === "email" && styles.inputFocused]}
                value={email}
                onChangeText={setEmail}
                placeholder="votre@email.com"
                placeholderTextColor={COLORS.muted}
                autoCapitalize="none"
                keyboardType="email-address"
                autoComplete="email"
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>Mot de passe</Text>
              <View style={[styles.inputRow, focused === "password" && styles.inputFocused]}>
                <TextInput
                  style={styles.inputInner}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.muted}
                  secureTextEntry={!showPassword}
                  autoComplete="password"
                  onFocus={() => setFocused("password")}
                  onBlur={() => setFocused(null)}
                />
                <Pressable onPress={() => setShowPassword((v) => !v)} hitSlop={8} style={styles.eye}>
                  {showPassword
                    ? <EyeOff size={18} color={COLORS.muted} />
                    : <Eye size={18} color={COLORS.muted} />
                  }
                </Pressable>
              </View>
            </View>

            <Pressable
              style={[styles.btn, loading && styles.btnDisabled]}
              onPress={handleLogin}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Se connecter</Text>
              }
            </Pressable>

            <Pressable onPress={() => router.push("/(auth)/register")} style={styles.linkWrap}>
              <Text style={styles.linkText}>
                Pas encore de compte ?{" "}
                <Text style={styles.linkBold}>Créer un compte</Text>
              </Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 24, paddingBottom: 40 },

  header: { marginBottom: 36 },
  backBtn: { marginBottom: 24 },
  backText: { color: COLORS.muted, fontSize: 15, fontWeight: "500" },
  title: { fontSize: 28, fontWeight: "800", color: COLORS.text, marginBottom: 6, letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: COLORS.muted },

  form: { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: "700", color: COLORS.text, textTransform: "uppercase", letterSpacing: 0.3 },

  input: {
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  inputFocused: { borderColor: COLORS.primary },
  inputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderWidth: 1.5,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
  },
  inputInner: { flex: 1, paddingVertical: 14, fontSize: 16, color: COLORS.text },
  eye: { padding: 4 },

  btn: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  btnDisabled: { opacity: 0.6 },
  btnText: { color: "#fff", fontSize: 16, fontWeight: "800" },

  linkWrap: { alignItems: "center", paddingTop: 4 },
  linkText: { textAlign: "center", color: COLORS.muted, fontSize: 14 },
  linkBold: { color: COLORS.primary, fontWeight: "700" },
});
