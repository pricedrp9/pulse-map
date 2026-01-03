import React, { useState } from "react";
import { View, Text, SafeAreaView, Pressable, Alert } from "react-native";
import { Stack, useRouter } from "expo-router";
import { ViewToggle, ViewType } from "../components/ViewToggle";
import { GridSelector } from "../components/GridSelector";
import { MonthSelector } from "../components/MonthSelector";
import { createPulse } from "../lib/api";

export default function CreatePulseScreen() {
    const router = useRouter();
    const [viewType, setViewType] = useState<ViewType>("7-day");
    const [selection, setSelection] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    const handleCreate = async () => {
        if (selection.length === 0) {
            Alert.alert("Selection Required", "Please select at least one time slot or day.");
            return;
        }

        try {
            setLoading(true);
            const newPulseId = await createPulse({ viewType, selection });
            router.push(`/pulse/${newPulseId}`);
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to create pulse. Please ensure you have configured your Supabase keys.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView className="flex-1 bg-background">
            <Stack.Screen options={{ title: "New Pulse", headerShadowVisible: false }} />

            <View className="flex-1 p-4">
                <View className="mb-4">
                    <ViewToggle currentView={viewType} onViewChange={setViewType} />
                </View>

                <View className="flex-1 rounded-xl overflow-hidden border border-inactive bg-white shadow-sm">
                    {viewType === "month" ? (
                        <MonthSelector onSelectionChange={setSelection} />
                    ) : (
                        <GridSelector
                            days={viewType === "7-day" ? 7 : 14}
                            onSelectionChange={setSelection}
                        />
                    )}
                </View>

                <Pressable
                    onPress={handleCreate}
                    disabled={loading}
                    className={`mt-4 bg-action rounded-xl py-3 items-center shadow-md ${loading ? "opacity-50" : "active:opacity-90"
                        }`}
                >
                    <Text className="text-white font-bold text-lg">
                        {loading ? "Creating..." : "Create Pulse"}
                    </Text>
                </Pressable>
            </View>
        </SafeAreaView>
    );
}
