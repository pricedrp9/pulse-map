import React, { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable } from "react-native";
import { supabase } from "../lib/supabase";
import { getAvailability } from "../lib/api";

interface HeatmapGridProps {
    pulseId: string;
    viewType: "7-day" | "14-day" | "month";
    onSelectSlot?: (start: Date, end: Date) => void;
}

const getDates = (viewType: string) => {
    const days = viewType === "14-day" ? 14 : 7;
    const dates = [];
    const today = new Date();

    for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        dates.push(d);
    }
    return dates;
};

const hours = Array.from({ length: 15 }, (_, i) => 8 + i);

export function HeatmapGrid({ pulseId, viewType, onSelectSlot }: HeatmapGridProps) {
    if (viewType === "month") {
        return (
            <View className="flex-1 items-center justify-center p-4">
                <Text className="text-slate-500 text-center">Month View Heatmap is a future feature.</Text>
            </View>
        )
    }

    const [dates] = useState(() => getDates(viewType));
    const [heatmapCounts, setHeatmapCounts] = useState<Record<string, number>>({});
    const [maxCount, setMaxCount] = useState(1);
    const [selectedSlotKey, setSelectedSlotKey] = useState<string | null>(null);

    useEffect(() => {
        const fetchAvailability = async () => {
            try {
                const data = await getAvailability(pulseId);
                if (!data) return;

                const newCounts: Record<string, number> = {};
                let max = 1;

                data.forEach((row) => {
                    const localDate = new Date(row.start_time);
                    const key = `${localDate.getFullYear()}-${localDate.getMonth()}-${localDate.getDate()}-${localDate.getHours()}`;

                    newCounts[key] = (newCounts[key] || 0) + 1;
                    if (newCounts[key] > max) max = newCounts[key];
                });

                setHeatmapCounts(newCounts);
                setMaxCount(max);
            } catch (e) {
                console.error("Failed to fetch availability", e);
            }
        };

        fetchAvailability();

        const channel = supabase
            .channel("availability_changes_organizer")
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "availability",
                    filter: `pulse_id=eq.${pulseId}`,
                },
                () => fetchAvailability()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [pulseId]);

    const handlePress = (d: Date, hour: number) => {
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${hour}`;
        setSelectedSlotKey(key);

        const start = new Date(d);
        start.setHours(hour, 0, 0, 0);
        const end = new Date(start);
        end.setHours(hour + 1, 0, 0, 0);

        onSelectSlot?.(start, end);
    };

    return (
        <View className="flex-1 bg-white">
            <View className="flex-row border-b border-inactive bg-background pt-2 pb-2">
                <View className="w-12" />
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                    {dates.map((d, i) => (
                        <View key={i} className="w-16 items-center justify-center">
                            <Text className="text-xs font-bold text-gray-600">
                                {d.toLocaleDateString("en-US", { weekday: "short" })}
                            </Text>
                            <Text className="text-xs text-gray-500">{d.getDate()}</Text>
                        </View>
                    ))}
                </ScrollView>
            </View>

            <ScrollView className="flex-1">
                {hours.map((hour) => (
                    <View key={hour} className="flex-row border-b border-inactive h-12">
                        <View className="w-12 items-center justify-start pt-1 pr-1 border-r border-inactive bg-background">
                            <Text className="text-[10px] text-gray-500 font-medium">
                                {hour}:00
                            </Text>
                        </View>

                        <ScrollView horizontal showsHorizontalScrollIndicator={false} pointerEvents="none">
                            {dates.map((d, i) => {
                                const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${hour}`;
                                const count = heatmapCounts[key] || 0;
                                const ratio = count > 0 ? count / Math.max(maxCount, 2) : 0;

                                let bgClass = "bg-white";
                                if (count > 0) {
                                    if (ratio < 0.33) bgClass = "bg-heatmap1";
                                    else if (ratio < 0.66) bgClass = "bg-heatmap2";
                                    else bgClass = "bg-consensus";
                                }

                                return (
                                    <Pressable
                                        key={key}
                                        onPress={() => handlePress(d, hour)}
                                        className={`w-16 border-r border-inactive ${bgClass} ${selectedSlotKey === key ? 'border-2 border-action z-10' : ''}`}
                                    >
                                        {count > 0 && (
                                            <View className="flex-1 items-center justify-center">
                                                <Text className={`text-[10px] font-bold ${ratio > 0.66 ? 'text-white' : 'text-blue-900'}`}>{count}</Text>
                                            </View>
                                        )}
                                    </Pressable>
                                );
                            })}
                        </ScrollView>
                    </View>
                ))}
                <View className="h-8" />
            </ScrollView>
        </View>
    );
}
