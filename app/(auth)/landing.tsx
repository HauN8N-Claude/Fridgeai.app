import { useRouter } from "expo-router";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { FridgeIcon } from "../../components/FridgeIcon";
import { COLORS } from "../../lib/theme";

const STEPS = [
  {
    emoji: "🧺",
    title: "Scanne ton frigo",
    subtitle: "🥕 Carottes · 🥚 Œufs ...",
    badge: "~30s",
  },
  {
    emoji: "🍽️",
    title: "Dis ce que tu veux manger",
    subtitle: '"Pasta, poulet, soupe légère..."',
    badge: "~30s",
  },
  {
    emoji: "🛒",
    title: "Ta liste est prête",
    subtitle: "Uniquement ce qui manque",
    badge: "~30s",
  },
  {
    emoji: "🔗",
    title: "Partage ta liste",
    subtitle: "En un clic, à toute la famille",
    badge: "1 clic",
  },
];

const AVATARS = [
  { initials: "SC", bg: "#4A7C59" },
  { initials: "AI", bg: "#E8643A" },
  { initials: "MI", bg: "#6B8F6B" },
  { initials: "TK", bg: "#8B6B8B" },
];

export default function LandingScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="light" />
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header row */}
        <View style={styles.header}>
          <View style={styles.logoRow}>
            <FridgeIcon size={22} color="#fff" />
            <Text style={styles.logoText}>MonFrigo.</Text>
          </View>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>+ Anti-gaspi · IA</Text>
          </View>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>90 secondes.</Text>
        <Text style={styles.headlineSub}>Voilà comment.</Text>
        <Text style={styles.heroDesc}>
          Planifie tes repas, réduis le gaspillage.{"\n"}Juste ce qu'il te faut, rien de plus.
        </Text>

        {/* Steps */}
        <View style={styles.steps}>
          {STEPS.map((step) => (
            <View key={step.title} style={styles.stepCard}>
              <View style={styles.stepEmoji}>
                <Text style={styles.stepEmojiText}>{step.emoji}</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={styles.stepTitle}>{step.title}</Text>
                <Text style={styles.stepSubtitle}>{step.subtitle}</Text>
              </View>
              <View style={styles.stepBadge}>
                <Text style={styles.stepBadgeText}>{step.badge}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Social proof */}
        <View style={styles.social}>
          <View style={styles.avatars}>
            {AVATARS.map((a, i) => (
              <View
                key={a.initials}
                style={[
                  styles.avatar,
                  { backgroundColor: a.bg, marginLeft: i === 0 ? 0 : -8 },
                ]}
              >
                <Text style={styles.avatarText}>{a.initials}</Text>
              </View>
            ))}
          </View>
          <Text style={styles.socialText}>
            12 400 foyers gaspillent{"\n"}moins chaque semaine
          </Text>
        </View>

        {/* CTAs */}
        <View style={styles.actions}>
          <Pressable
            style={({ pressed }) => [styles.btnPrimary, pressed && styles.btnPressed]}
            onPress={() => router.push("/onboarding" as any)}
          >
            <Text style={styles.btnPrimaryText}>Commencer gratuitement →</Text>
          </Pressable>

          <Pressable
            style={({ pressed }) => [pressed && styles.btnPressed]}
            onPress={() => router.push("/(auth)/login")}
          >
            <Text style={styles.btnSecondaryText}>J'ai déjà un compte</Text>
          </Pressable>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.darkBg },
  scroll: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 16, paddingBottom: 36 },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 32,
  },
  logoRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  logoText: { color: "#fff", fontSize: 17, fontWeight: "700", letterSpacing: -0.3 },
  badge: {
    borderWidth: 1,
    borderColor: COLORS.accent,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  badgeText: { color: COLORS.accent, fontSize: 12, fontWeight: "600" },

  // Headline
  headline: {
    fontSize: 44,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: -1.5,
    lineHeight: 50,
  },
  headlineSub: {
    fontSize: 26,
    fontWeight: "700",
    fontStyle: "italic",
    color: COLORS.accent,
    marginBottom: 10,
    marginTop: 2,
  },
  heroDesc: {
    fontSize: 14,
    color: "rgba(255,255,255,0.55)",
    lineHeight: 20,
    marginBottom: 24,
  },

  // Steps
  steps: { gap: 10, marginBottom: 28 },
  stepCard: {
    backgroundColor: COLORS.darkBgCard,
    borderRadius: 14,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  stepEmoji: {
    width: 42,
    height: 42,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
  },
  stepEmojiText: { fontSize: 20 },
  stepContent: { flex: 1 },
  stepTitle: { color: "#fff", fontSize: 14, fontWeight: "700", marginBottom: 2 },
  stepSubtitle: { color: "rgba(255,255,255,0.55)", fontSize: 12 },
  stepBadge: {
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  stepBadgeText: { color: "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: "600" },

  // Social proof
  social: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 28,
  },
  avatars: { flexDirection: "row" },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: COLORS.darkBg,
  },
  avatarText: { color: "#fff", fontSize: 9, fontWeight: "700" },
  socialText: { color: "rgba(255,255,255,0.7)", fontSize: 13, lineHeight: 19 },

  // Actions
  actions: { gap: 14 },
  btnPrimary: {
    backgroundColor: COLORS.accent,
    borderRadius: 14,
    paddingVertical: 17,
    alignItems: "center",
  },
  btnPrimaryText: { color: "#fff", fontSize: 16, fontWeight: "800", letterSpacing: -0.2 },
  btnSecondaryText: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
  },
  btnPressed: { opacity: 0.75 },
});
