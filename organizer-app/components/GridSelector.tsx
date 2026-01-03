import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, Dimensions } from "react-native";

interface GridSelectorProps {
    days: number; // 7 or 14
    startHour?: number; // Default 8 (8 AM)
    endHour?: number; // Default 22 (10 PM)
    onSelectionChange: (selectedSlots: string[]) => void;
}

export function GridSelector({
    days = 7,
    startHour = 8,
    endHour = 22,
    onSelectionChange,
}: GridSelectorProps) {
    // Store selected slots as "dayIndex-hour" strings
    const [selected, setSelected] = useState<Set<string>>(new Set());

    // Generate hours range
    const hours = Array.from(
        { length: endHour - startHour + 1 },
        (_, i) => startHour + i
    );

    // Generate days (placeholders for now)
    const dayLabels = Array.from({ length: days }, (_, i) => {
        const d = new Date();
        d.setDate(d.getDate() + i);
        return {
            day: d.toLocaleDateString("en-US", { weekday: "short" }),
            date: d.getDate(),
        };
    });

    const toggleSlot = (dayIndex: number, hour: number) => {
        const key = `${dayIndex}-${hour}`;
        const newSelected = new Set(selected);
        if (newSelected.has(key)) {
            newSelected.delete(key);
        } else {
            newSelected.add(key);
        }
        setSelected(newSelected);
        onSelectionChange(Array.from(newSelected));
    };

    return (
        <View className="flex-1 bg-white">
            {/* Header Row */}
            <View className="flex-row border-b border-inactive bg-background pt-2 pb-2">
                <View className="w-12" /> {/* Spacing for time column */}
                {dayLabels.map((d, i) => (
                    <View key={i} className="flex-1 items-center justify-center">
                        <Text className="text-xs font-bold text-gray-600">{d.day}</Text>
                        <Text className="text-xs text-gray-500">{d.date}</Text>
                    </View>
                ))}
            </View>

            <ScrollView className="flex-1">
                {hours.map((hour) => (
                    <View key={hour} className="flex-row border-b border-inactive h-12">
                        {/* Time Label */}
                        <View className="w-12 items-center justify-start pt-1 pr-1 border-r border-inactive bg-background">
                            <Text className="text-[10px] text-gray-500 font-medium">
                                {hour}:00
                            </Text>
                        </View>

                        {/* Day Slots */}
                        {Array.from({ length: days }).map((_, dayIndex) => {
                            const key = `${dayIndex}-${hour}`;
                            const isSelected = selected.has(key);

                            return (
                                <Pressable
                                    key={key}
                                    onPress={() => toggleSlot(dayIndex, hour)}
                                    className={`flex-1 border-r border-inactive ${isSelected ? "bg-action" : "bg-white"
                                        }`}
                                />
                            );
                        })}
                    </View>
                ))}
                {/* Bottom padding */}
                <View className="h-8" />
            </ScrollView>
        </View>
    );
}
