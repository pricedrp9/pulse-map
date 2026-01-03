import React, { useEffect, useState } from "react";
import { View, Text, SafeAreaView, Pressable, Share, ActivityIndicator, Alert } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { getPulse, finalizePulse } from "../lib/api";
import { HeatmapGrid } from "../components/HeatmapGrid";
import { ParticipantsList } from "../components/ParticipantsList";
import { toUTC } from "../lib/time";

export default function PulseViewScreen() {
    const { id } = useLocalSearchParams();
    const router = useRouter();
    const [pulse, setPulse] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    const [selectedSlot, setSelectedSlot] = useState<{ start: Date, end: Date } | null>(null);
    const [isFinalizing, setIsFinalizing] = useState(false);

    // In a real app we'd construct this from Env vars or linking config
    const webUrl = process.env.EXPO_PUBLIC_WEB_URL || "https://pulse-map-chi.vercel.app";
    const shareUrl = `${webUrl}/pulse/${id}`;

    useEffect(() => {
        async function fetchPulse() {
            try {
                if (typeof id === 'string') {
                    const data = await getPulse(id);
                    setPulse(data);
                }
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
        fetchPulse();
    }, [id]);

    const handleShare = async () => {
        try {
            await Share.share({
                message: `Join my Pulse! ${shareUrl}`,
            });
        } catch (error) {
            console.error(error);
        }
    };

    const handleFinalize = async () => {
        if (!selectedSlot || typeof id !== 'string') return;
        setIsFinalizing(true);
        try {
            await finalizePulse(id, toUTC(selectedSlot.start), toUTC(selectedSlot.end));
            Alert.alert("Success!", "Pulse confirmed. Everyone can now see the final time.");
            router.replace("/");
        } catch (e) {
            Alert.alert("Error", "Failed to finalize pulse.");
            console.error(e);
        } finally {
            setIsFinalizing(false);
        }
    }

    if (loading) {
        return (
            <SafeAreaView className="flex-1 bg-background items-center justify-center">
                <ActivityIndicator size="large" color="#2563EB" />
            </SafeAreaView>
        );
    }

    if (!pulse) {
        return (
            <SafeAreaView className="flex-1 bg-background items-center justify-center">
                <Text className="text-red-500">Pulse not found.</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className="flex-1 bg-background">
            <View className="p-4 border-b border-inactive bg-white">
                <Text className="text-xl font-bold text-gray-800">Pulse Heatmap</Text>
                <Text className="text-xs text-slate-500 mt-1">ID: {id}</Text>

                <Pressable onPress={handleShare} className="mt-3 bg-action py-2 px-4 rounded-lg self-start">
                    <Text className="text-white font-semibold">Share Link</Text>
                </Pressable>
            </View>

            <View className="flex-1">
                <ParticipantsList pulseId={id as string} />
                <HeatmapGrid
                    pulseId={id as string}
                    viewType={pulse.view_type}
                    onSelectSlot={(start, end) => setSelectedSlot({ start, end })}
                />
            </View>

            <View className="p-4 bg-white border-t border-inactive">
                <Text className="text-center text-slate-400 text-xs mb-2">
                    {pulse.status === 'confirmed'
                        ? "This Pulse is already confirmed!"
                        : (selectedSlot
                            ? `Selected: ${selectedSlot.start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${selectedSlot.end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : "Tap a block to select final time")
                    }
                </Text>
                {pulse.status !== 'confirmed' && (
                    <Pressable
                        disabled={!selectedSlot || isFinalizing}
                        onPress={handleFinalize}
                        className={`py-3 rounded-xl items-center ${selectedSlot ? 'bg-consensus' : 'bg-gray-300'}`}
                    >
                        <Text className="text-white font-bold">{isFinalizing ? "Finalizing..." : "Finalize Time"}</Text>
                    </Pressable>
                )}
            </View>
        </SafeAreaView>
    );
}
