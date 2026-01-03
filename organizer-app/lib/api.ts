import { supabase } from "./supabase";
import { TimeZone, toUTC } from "./time";
// import "react-native-get-random-values"; // Ensure UUID generation works if needed

export interface CreatePulseParams {
    viewType: "7-day" | "14-day" | "month";
    selection: string[]; // "dayIndex-hour" or "YYYY-MM-DD"
}

export async function createPulse({ viewType, selection }: CreatePulseParams) {
    const organizerId = "device-id-placeholder"; // For MVP, we can use a generated UUID stored locally
    const timezone = TimeZone.getLocal();

    // 1. Create Pulse
    const { data: pulse, error: pulseError } = await supabase
        .from("pulses")
        .insert({
            organizer_id: organizerId,
            view_type: viewType,
            timezone: timezone,
            status: "active",
        })
        .select("id")
        .single();

    if (pulseError) throw pulseError;
    const pulseId = pulse.id;

    // 2. Add Organizer as Participant
    const { data: participant, error: participantError } = await supabase
        .from("participants")
        .insert({
            pulse_id: pulseId,
            name: "Organizer",
            is_organizer: true,
            timezone: timezone,
        })
        .select("id")
        .single();

    if (participantError) throw participantError;

    // 3. Convert Selection to Availability Rows
    const availabilityData = selection.map((slot) => {
        let start: Date, end: Date;

        if (viewType === "month") {
            const [y, m, d] = slot.split("-").map(Number);
            start = new Date(y, m - 1, d, 18, 0, 0);
            end = new Date(y, m - 1, d, 22, 0, 0);
        } else {
            const [dayIdx, hour] = slot.split("-").map(Number);
            const now = new Date();
            start = new Date(now);
            start.setDate(now.getDate() + dayIdx);
            start.setHours(hour, 0, 0, 0);

            end = new Date(start);
            end.setHours(hour + 1, 0, 0, 0);
        }

        return {
            participant_id: participant.id,
            pulse_id: pulseId,
            start_time: toUTC(start),
            end_time: toUTC(end),
        };
    });

    const { error: avError } = await supabase
        .from("availability")
        .insert(availabilityData);

    if (avError) throw avError;

    return pulseId;
}

export const getPulse = async (id: string) => {
    const { data, error } = await supabase
        .from("pulses")
        .select("id, title, view_type, organizer_id, status, finalized_start, finalized_end")
        .eq("id", id)
        .single();

    if (error) throw error;
    return data;
};

export const getAvailability = async (pulseId: string) => {
    const { data, error } = await supabase
        .from("availability")
        .select("start_time, end_time, participant_id")
        .eq("pulse_id", pulseId);

    if (error) throw error;
    return data;
};

export const finalizePulse = async (pulseId: string, start: string, end: string) => {
    const { error } = await supabase
        .from("pulses")
        .update({
            status: "confirmed",
            finalized_start: start,
            finalized_end: end
        })
        .eq("id", pulseId);

    if (error) throw error;

    // Trigger email notifications via the Next.js API
    // We use the public URL + /api/finalize
    try {
        const webUrl = process.env.EXPO_PUBLIC_WEB_URL || "https://pulse-map-chi.vercel.app";
        const response = await fetch(`${webUrl}/api/finalize`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ pulseId }),
        });

        if (!response.ok) {
            console.error("Failed to trigger emails:", await response.text());
        }
    } catch (emailError) {
        console.error("Email trigger failed", emailError);
        // We don't throw here because the pulse IS finalized, we just failed to notify.
    }
};
