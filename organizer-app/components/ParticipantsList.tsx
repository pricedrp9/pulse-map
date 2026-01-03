import React, { useEffect, useState } from "react";
import { View, Text, ScrollView } from "react-native";
import { supabase } from "../lib/supabase";
import { getParticipants } from "../lib/api";

interface Participant {
    id: string;
    name: string;
    is_completed: boolean;
}

export function ParticipantsList({ pulseId }: { pulseId: string }) {
    const [participants, setParticipants] = useState<Participant[]>([]);

    const fetchParticipants = async () => {
        try {
            const data = await getParticipants(pulseId);
            if (data) setParticipants(data);
        } catch (e) {
            console.error("Failed to participants", e);
        }
    };

    useEffect(() => {
        fetchParticipants();

        // Subscribe to changes
        const channel = supabase
            .channel(`participants_${pulseId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "participants",
                    filter: `pulse_id=eq.${pulseId}`,
                },
                () => fetchParticipants()
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [pulseId]);

    if (participants.length === 0) return null;

    return (
        <View className="mb-4 px-4">
            <Text className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-2">Team Status</Text>
            <View className="flex-row flex-wrap gap-2">
                {participants.map((p) => (
                    <View
                        key={p.id}
                        className={`flex-row items-center px-3 py-1.5 rounded-full border ${p.is_completed
                                ? "bg-green-50 border-green-200"
                                : "bg-white border-gray-200 dashed"
                            }`}
                    >
                        <Text className={`text-xs font-medium ${p.is_completed ? "text-green-700" : "text-gray-500"}`}>
                            {p.name}
                        </Text>
                        {p.is_completed && (
                            <Text className="ml-1 text-green-600 font-bold">✓</Text>
                        )}
                    </View>
                ))}
            </View>
        </View>
    );
}
