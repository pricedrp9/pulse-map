import React from "react";
import { View, Text, Pressable } from "react-native";
import { styled } from "nativewind";

export type ViewType = "7-day" | "14-day" | "month";

interface ViewToggleProps {
    currentView: ViewType;
    onViewChange: (view: ViewType) => void;
}

const options: { label: string; value: ViewType }[] = [
    { label: "7 Days", value: "7-day" },
    { label: "14 Days", value: "14-day" },
    { label: "Month", value: "month" },
];

export function ViewToggle({ currentView, onViewChange }: ViewToggleProps) {
    return (
        <View className="flex-row rounded-xl bg-inactive p-1">
            {options.map((option) => {
                const isActive = currentView === option.value;
                return (
                    <Pressable
                        key={option.value}
                        onPress={() => onViewChange(option.value)}
                        className={`flex-1 items-center justify-center rounded-lg py-2 ${isActive ? "bg-white shadow-sm" : "bg-transparent"
                            }`}
                    >
                        <Text
                            className={`font-semibold ${isActive ? "text-action" : "text-gray-500"
                                }`}
                        >
                            {option.label}
                        </Text>
                    </Pressable>
                );
            })}
        </View>
    );
}
