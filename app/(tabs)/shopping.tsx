import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { RefreshCw, ShoppingCart } from "lucide-react-native";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { apiRequest } from "../../lib/api";
import { COLORS } from "../../lib/theme";

type ShoppingItem = {
  id: string;
  checked: boolean;
  quantity: number | null;
  unit: string | null;
  ingredient: { name: string };
};

export default function ShoppingScreen() {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery<ShoppingItem[]>({
    queryKey: ["shopping"],
    queryFn: () => apiRequest("/api/mobile/shopping"),
  });

  const generateMutation = useMutation({
    mutationFn: () => apiRequest("/api/mobile/shopping", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopping"] }),
    onError: (err) => Alert.alert("Erreur", (err as Error).message),
  });

  const toggleMutation = useMutation({
    mutationFn: ({ id, checked }: { id: string; checked: boolean }) =>
      apiRequest(`/api/mobile/shopping/${id}`, { method: "PATCH", body: { checked } }),
    onMutate: async ({ id, checked }) => {
      await queryClient.cancelQueries({ queryKey: ["shopping"] });
      const prev = queryClient.getQueryData<ShoppingItem[]>(["shopping"]);
      queryClient.setQueryData<ShoppingItem[]>(["shopping"], (old = []) =>
        old.map((i) => (i.id === id ? { ...i, checked } : i))
      );
      return { prev };
    },
    onError: (_, __, ctx) => {
      queryClient.setQueryData(["shopping"], ctx?.prev);
    },
  });

  const uncheckAllMutation = useMutation({
    mutationFn: () => apiRequest("/api/mobile/shopping/uncheck-all", { method: "POST" }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["shopping"] }),
  });

  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

  const renderItem = (item: ShoppingItem) => (
    <Pressable
      key={item.id}
      style={styles.row}
      onPress={() => toggleMutation.mutate({ id: item.id, checked: !item.checked })}
    >
      <View style={[styles.checkbox, item.checked && styles.checkboxDone]} />
      <View style={{ flex: 1 }}>
        <Text style={[styles.itemName, item.checked && styles.itemDone]}>{item.ingredient.name}</Text>
        {(item.quantity || item.unit) && (
          <Text style={styles.itemQty}>{[item.quantity, item.unit].filter(Boolean).join(" ")}</Text>
        )}
      </View>
    </Pressable>
  );

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      {isLoading ? (
        <ActivityIndicator style={styles.loader} color={COLORS.primary} />
      ) : items.length === 0 ? (
        <View style={styles.empty}>
          <ShoppingCart size={48} color={COLORS.muted} />
          <Text style={styles.emptyTitle}>Liste vide</Text>
          <Text style={styles.emptyText}>Générez d'abord un plan de repas, puis créez votre liste de courses.</Text>
          <Pressable
            style={[styles.button, generateMutation.isPending && styles.btnDisabled]}
            onPress={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Générer la liste</Text>
            )}
          </Pressable>
        </View>
      ) : (
        <>
          <FlatList
            data={[...unchecked, ...checked]}
            keyExtractor={(item) => item.id}
            contentContainerStyle={{ padding: 16, gap: 8 }}
            ListHeaderComponent={
              <View style={styles.listHeader}>
                <Text style={styles.listCount}>{unchecked.length} restant{unchecked.length > 1 ? "s" : ""}</Text>
                {checked.length > 0 && (
                  <Pressable onPress={() => uncheckAllMutation.mutate()}>
                    <Text style={styles.uncheckAll}>Tout décocher</Text>
                  </Pressable>
                )}
              </View>
            }
            renderItem={({ item }) => renderItem(item)}
          />
          <View style={styles.bottomBar}>
            <Pressable
              style={[styles.button, { flex: 1 }, generateMutation.isPending && styles.btnDisabled]}
              onPress={() => {
                Alert.alert("Régénérer", "Cela remplacera la liste actuelle.", [
                  { text: "Annuler", style: "cancel" },
                  { text: "Régénérer", onPress: () => generateMutation.mutate() },
                ]);
              }}
              disabled={generateMutation.isPending}
            >
              {generateMutation.isPending ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <RefreshCw size={16} color="#fff" style={{ marginRight: 8 }} />
                  <Text style={styles.buttonText}>Régénérer</Text>
                </>
              )}
            </Pressable>
          </View>
        </>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: COLORS.background },
  loader: { flex: 1 },
  empty: { flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 12 },
  emptyTitle: { fontSize: 18, fontWeight: "600", color: COLORS.text },
  emptyText: { fontSize: 14, color: COLORS.muted, textAlign: "center", lineHeight: 20 },
  listHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 4 },
  listCount: { fontSize: 13, color: COLORS.muted },
  uncheckAll: { fontSize: 13, color: COLORS.primary },
  row: { flexDirection: "row", alignItems: "center", backgroundColor: "#fff", borderRadius: 12, padding: 14, gap: 12, borderWidth: 1, borderColor: COLORS.border },
  checkbox: { width: 22, height: 22, borderRadius: 11, borderWidth: 2, borderColor: COLORS.border },
  checkboxDone: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  itemName: { fontSize: 15, fontWeight: "500", color: COLORS.text },
  itemDone: { color: COLORS.muted, textDecorationLine: "line-through" },
  itemQty: { fontSize: 12, color: COLORS.muted, marginTop: 2 },
  bottomBar: { padding: 16 },
  button: { backgroundColor: COLORS.primary, borderRadius: 12, padding: 16, alignItems: "center", justifyContent: "center", flexDirection: "row" },
  btnDisabled: { opacity: 0.6 },
  buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
});
