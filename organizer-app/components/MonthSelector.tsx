import React, { useState } from "react";
import { View, Text, Pressable } from "react-native";
import { styled } from "nativewind";

interface MonthSelectorProps {
    onSelectionChange: (selectedDays: string[]) => void;
}

export function MonthSelector({ onSelectionChange }: MonthSelectorProps) {
    const [selectedDays, setSelectedDays] = useState<Set<string>>(new Set());
    const [currentDate] = useState(new Date()); // Default to current month for MVP

    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    // Get days in month
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, month, 1).getDay();

    // Generate calendar grid
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
    const blanks = Array.from({ length: firstDayOfWeek }, () => null);

    const toggleDay = (day: number) => {
        const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(
            day
        ).padStart(2, "0")}`;
        const newSelected = new Set(selectedDays);
        if (newSelected.has(dateStr)) {
            newSelected.delete(dateStr);
        } else {
            newSelected.add(dateStr);
        }
        setSelectedDays(newSelected);
        onSelectionChange(Array.from(newSelected));
    };

    const monthName = currentDate.toLocaleString("default", { month: "long" });

    return (
        <View className="flex-1 bg-white p-4">
            <View className="mb-4 items-center">
                <Text className="text-xl font-bold text-gray-800">
                    {monthName} {year}
                </Text>
                <Text className="text-sm text-gray-500">
                    Select days (Default: 6 PM - 10 PM)
                </Text>
            </View>

            <View className="flex-row flex-wrap">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
                    <View key={day} className="w-[14.28%] items-center mb-2">
                        <Text className="text-gray-400 font-bold">{day}</Text>
                    </View>
                ))}

                {blanks.map((_, i) => (
                    <View key={`blank-${i}`} className="w-[14.28%] h-12" />
                ))}

                {days.map((day) => {
                    const dateStr = `${year}-${String(month + 1).padStart(
                        2,
                        "0"
                    )}-${String(day).padStart(2, "0")}`;
                    const isSelected = selectedDays.has(dateStr);

                    return (
                        <View key={day} className="w-[14.28%] h-12 p-1">
                            <Pressable
                                onPress={() => toggleDay(day)}
                                className={`flex-1 items-center justify-center rounded-lg ${isSelected ? "bg-action" : "bg-gray-50"
                                    }`}
                            >
                                <Text
                                    className={`font-semibold ${isSelected ? "text-white" : "text-gray-700"
                                        }`}
                                >
                                    {day}
                                </Text>
                            </Pressable>
                        </View>
                    );
                })}
            </View>
        </View>
    );
}
