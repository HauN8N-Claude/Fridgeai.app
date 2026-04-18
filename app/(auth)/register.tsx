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
import { COLORS } from "../../lib/theme";
import { useAuthStore } from "../../store/auth-store";
import { useQuizStore } from "../../store/quiz-store";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
  const { step: quizStep } = useQuizStore();
  const router = useRouter();

  const handleRegister = async () => {
    if (!name || !email || !password) {
      Alert.alert("Erreur", "Veuillez remplir tous les champs");
      return;
    }
    if (password.length < 8) {
      Alert.alert("Erreur", "Le mot de passe doit faire au moins 8 caractères");
      return;
    }
    setLoading(true);
    try {
      await register(name, email, password);
      // Si l'utilisateur venait du quiz (step 6), il est redirigé automatiquement
      // vers /onboarding par l'auth guard (needsOnboarding: true après register)
    } catch (err) {
      Alert.alert("Erreur", (err as Error).message);
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
            <Text style={styles.title}>Créer un compte ✨</Text>
            <Text style={styles.subtitle}>Rejoignez FridAI — c'est gratuit</Text>
          </View>

          {/* Form */}
          <View style={styles.form}>
            {[
              { key: "name", label: "Prénom", value: name, setter: setName, placeholder: "Jean", autoCapitalize: "words" as const },
              { key: "email", label: "Email", value: email, setter: setEmail, placeholder: "votre@email.com", keyboard: "email-address" as const, autoCapitalize: "none" as const },
            ].map(({ key, label, value, setter, placeholder, keyboard, autoCapitalize }) => (
              <View key={key} style={styles.field}>
                <Text style={styles.label}>{label}</Text>
                <TextInput
                  style={[styles.input, focused === key && styles.inputFocused]}
                  value={value}
                  onChangeText={setter}
                  placeholder={placeholder}
                  placeholderTextColor={COLORS.muted}
                  keyboardType={keyboard ?? "default"}
                  autoCapitalize={autoCapitalize ?? "none"}
                  onFocus={() => setFocused(key)}
                  onBlur={() => setFocused(null)}
                />
              </View>
            ))}

            <View style={styles.field}>
              <Text style={styles.label}>Mot de passe</Text>
              <View style={[styles.inputRow, focused === "password" && styles.inputFocused]}>
                <TextInput
                  style={styles.inputInner}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="8 caractères minimum"
                  placeholderTextColor={COLORS.muted}
                  secureTextEntry={!showPassword}
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
              onPress={handleRegister}
              disabled={loading}
            >
              {loading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.btnText}>Créer mon compte →</Text>
              }
            </Pressable>

            <Text style={styles.terms}>
              En créant un compte, vous acceptez nos{" "}
              <Text style={styles.termsLink}>CGU</Text> et notre{" "}
              <Text style={styles.termsLink}>politique de confidentialité</Text>.
            </Text>

            <Pressable onPress={() => router.push("/(auth)/login")} style={styles.linkWrap}>
              <Text style={styles.linkText}>
                Déjà un compte ?{" "}
                <Text style={styles.linkBold}>Se connecter</Text>
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

  terms: { fontSize: 12, color: COLORS.muted, textAlign: "center", lineHeight: 18 },
  termsLink: { color: COLORS.primary, fontWeight: "600" },

  linkWrap: { alignItems: "center", paddingTop: 4 },
  linkText: { textAlign: "center", color: COLORS.muted, fontSize: 14 },
  linkBold: { color: COLORS.primary, fontWeight: "700" },
});
