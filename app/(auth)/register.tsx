import { useRouter } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS } from "../../lib/theme";
import { useAuthStore } from "../../store/auth-store";

export default function RegisterScreen() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const { register } = useAuthStore();
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
      // AuthGuard will redirect to /onboarding automatically
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
        style={styles.container}
      >
        <View style={styles.header}>
          <Text style={styles.title}>FridAI</Text>
          <Text style={styles.subtitle}>Créer votre compte</Text>
        </View>

        <View style={styles.form}>
          {[
            { label: "Nom", value: name, setter: setName, placeholder: "Jean Dupont" },
            {
              label: "Email",
              value: email,
              setter: setEmail,
              placeholder: "votre@email.com",
              keyboard: "email-address" as const,
            },
            {
              label: "Mot de passe",
              value: password,
              setter: setPassword,
              placeholder: "••••••••",
              secure: true,
            },
          ].map(({ label, value, setter, placeholder, keyboard, secure }) => (
            <View key={label} style={styles.field}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={setter}
                placeholder={placeholder}
                placeholderTextColor={COLORS.muted}
                keyboardType={keyboard ?? "default"}
                secureTextEntry={secure}
                autoCapitalize={label === "Nom" ? "words" : "none"}
              />
            </View>
          ))}

          <Pressable
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Créer mon compte</Text>
            )}
          </Pressable>

          <Pressable onPress={() => router.back()}>
            <Text style={styles.link}>
              Déjà un compte ?{" "}
              <Text style={styles.linkBold}>Se connecter</Text>
            </Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  container: { flex: 1, justifyContent: "center", paddingHorizontal: 24 },
  header: { alignItems: "center", marginBottom: 40 },
  title: { fontSize: 36, fontWeight: "700", color: COLORS.primary, marginBottom: 8 },
  subtitle: { fontSize: 16, color: COLORS.muted },
  form: { gap: 16 },
  field: { gap: 6 },
  label: { fontSize: 14, fontWeight: "500", color: COLORS.text },
  input: {
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    fontSize: 16,
    color: COLORS.text,
  },
  button: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
  link: { textAlign: "center", color: COLORS.muted, marginTop: 8 },
  linkBold: { color: COLORS.primary, fontWeight: "600" },
});
