import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react-native";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiRequest } from "../../lib/api";
import { COLORS } from "../../lib/theme";

type FridgeItem = {
  id: string;
  quantity: number | null;
  unit: string | null;
  expiresAt: string | null;
  ingredient: { name: string };
};

function expiryLabel(expiresAt: string | null): { label: string; color: string } | null {
  if (!expiresAt) return null;
  const diff = Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86400000);
  if (diff < 0) return { label: "Expiré", color: COLORS.destructive };
  if (diff <= 3) return { label: `Expire dans ${diff}j`, color: COLORS.warning };
  return { label: `Expire dans ${diff}j`, color: COLORS.muted };
}

function AddItemModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [expiresAt, setExpiresAt] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      apiRequest("/api/mobile/frigo", {
        method: "POST",
        body: { name, quantity: quantity ? Number(quantity) : undefined, unit: unit || undefined, expiresAt: expiresAt || undefined },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fridge"] });
      setName(""); setQuantity(""); setUnit(""); setExpiresAt("");
      onClose();
    },
    onError: (err) => Alert.alert("Erreur", (err as Error).message),
  });

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <SafeAreaView style={{ flex: 1, backgroundColor: "#fff" }}>
        <View style={modal.header}>
          <Text style={modal.title}>Ajouter un aliment</Text>
          <Pressable onPress={onClose}><Text style={modal.cancel}>Annuler</Text></Pressable>
        </View>
        <ScrollView style={{ padding: 24 }} keyboardShouldPersistTaps="handled">
          {[
            { label: "Nom *", value: name, setter: setName, placeholder: "Ex: Tomates" },
            { label: "Quantité", value: quantity, setter: setQuantity, placeholder: "Ex: 500", keyboard: "numeric" as const },
            { label: "Unité", value: unit, setter: setUnit, placeholder: "Ex: g, ml, pièce" },
            { label: "Date d'expiration (AAAA-MM-JJ)", value: expiresAt, setter: setExpiresAt, placeholder: "2025-12-31" },
          ].map(({ label, value, setter, placeholder, keyboard }) => (
            <View key={label} style={modal.field}>
              <Text style={modal.label}>{label}</Text>
              <TextInput
                style={modal.input}
                value={value}
                onChangeText={setter}
                placeholder={placeholder}
                placeholderTextColor={COLORS.muted}
                keyboardType={keyboard ?? "default"}
              />
            </View>
          ))}
          <Pressable
            style={[modal.button, (!name || mutation.isPending) && modal.buttonDisabled]}
            onPress={() => mutation.mutate()}
            disabled={!name || mutation.isPending}
          >
            {mutation.isPending ? <ActivityIndicator color="#fff" /> : <Text style={modal.buttonText}>Ajouter</Text>}
          </Pressable>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

export default function FrigoScreen() {
  const queryClient = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);

  const { data: items = [], isLoading } = useQuery<FridgeItem[]>({
    queryKey: ["fridge"],
    queryFn: () => apiRequest("/api/mobile/frigo"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => apiRequest(`/api/mobile/frigo/${id}`, { method: "DELETE" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fridge"] }),
    onError: (err) => Alert.alert("Erreur", (err as Error).message),
  });

  const confirmDelete = (item: FridgeItem) => {
    Alert.alert("Supprimer", `Supprimer ${item.ingredient.name} ?`, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: () => deleteMutation.mutate(item.id) },
    ]);
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <AddItemModal visible={showAdd} onClose={() => setShowAdd(false)} />

      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <Text style={styles.emptyTitle}>Frigo vide</Text>
          <Text style={styles.emptyText}>Ajoutez des aliments ou scannez votre frigo</Text>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          contentContainerStyle={{ padding: 16, gap: 10 }}
          renderItem={({ item }) => {
            const expiry = expiryLabel(item.expiresAt);
            return (
              <View style={styles.card}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.itemName}>{item.ingredient.name}</Text>
                  {(item.quantity || item.unit) && (
                    <Text style={styles.itemQty}>
                      {[item.quantity, item.unit].filter(Boolean).join(" ")}
                    </Text>
                  )}
                  {expiry && <Text style={[styles.expiry, { color: expiry.color }]}>{expiry.label}</Text>}
                </View>
                <Pressable onPress={() => confirmDelete(item)} hitSlop={8}>
                  <Trash2 size={18} color={COLORS.muted} />
                </Pressable>
              </View>
            );
          }}
        />
      )}

      <View style={styles.fab}>
        <Pressable style={styles.fabButton} onPress={() => setShowAdd(true)}>
          <Text style={styles.fabText}>+ Ajouter</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  loader: { flex: 1 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", gap: 8 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: COLORS.text },
  emptyText: { fontSize: 14, color: COLORS.muted, textAlign: "center" },
  card: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 14,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  itemName: { fontSize: 16, fontWeight: "500", color: COLORS.text },
  itemQty: { fontSize: 13, color: COLORS.muted, marginTop: 2 },
  expiry: { fontSize: 12, marginTop: 4 },
  fab: { padding: 16 },
  fabButton: {
    backgroundColor: COLORS.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
  },
  fabText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});

const modal = StyleSheet.create({
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 18, fontWeight: "600", color: COLORS.text },
  cancel: { fontSize: 16, color: COLORS.muted },
  field: { gap: 6, marginBottom: 16 },
  label: { fontSize: 14, fontWeight: "500", color: COLORS.text },
  input: { backgroundColor: COLORS.background, borderWidth: 1, borderColor: COLORS.border, borderRadius: 12, padding: 14, fontSize: 16, color: COLORS.text },
  button: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: "center", marginTop: 8 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
