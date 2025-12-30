"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { PulseGrid } from "@/components/PulseGrid";
import { ConfirmedView } from "@/components/ConfirmedView";

export default function PulseEntryPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [nickname, setNickname] = useState("");
    const [loading, setLoading] = useState(false);
    const [pulse, setPulse] = useState<any>(null); // Ideally typed
    const [error, setError] = useState("");

    // Check if already joined
    const [joinedParticipantId, setJoinedParticipantId] = useState<string | null>(null);

    // Check if organizer
    const [isOrganizer, setIsOrganizer] = useState(false);

    const supabase = createClient();

    useEffect(() => {
        if (typeof window !== "undefined" && pulse) {
            const createdIds = JSON.parse(localStorage.getItem("created_pulse_ids") || "[]");
            if (createdIds.includes(pulse.id)) {
                setIsOrganizer(true);
            }
        }
    }, [pulse]);

    useEffect(() => {
        // Check if pulse exists
        async function checkPulse() {
            if (!id) return;

            const { data, error } = await supabase
                .from("pulses")
                .select("id, title, view_type, organizer_id, status, finalized_start, finalized_end, start_date, mode")
                .eq("id", id)
                .single();

            if (error || !data) {
                setError("Pulse not found or invalid link.");
            } else {
                setPulse(data);
            }
        }

        checkPulse();

        // Realtime subscription for status change
        const channel = supabase.channel(`pulse_${id}`)
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'pulses', filter: `id=eq.${id}` },
                (payload) => {
                    setPulse((prev: any) => ({ ...prev, ...payload.new }));
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); }

    }, [id, supabase]);

    useEffect(() => {
        if (typeof window !== "undefined" && id) {
            const stored = localStorage.getItem(`pulse_participant_${id}`);
            if (stored) setJoinedParticipantId(stored);
        }
    }, [id]);

    const handleJoin = async () => {
        if (!nickname.trim()) return;
        setLoading(true);

        try {
            // Create participant record
            const { data, error } = await supabase
                .from("participants")
                .insert({
                    pulse_id: id,
                    name: nickname,
                    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                })
                .select("id")
                .single();

            if (error) throw error;

            // Store participant ID in localStorage
            localStorage.setItem(`pulse_participant_${id}`, data.id);
            setJoinedParticipantId(data.id);

        } catch (e) {
            console.error(e);
            setError("Failed to join. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    if (error) {
        return (
            <div className="flex h-screen items-center justify-center bg-slate-50">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-red-500">Error</h1>
                    <p className="text-gray-600">{error}</p>
                </div>
            </div>
        );
    }

    if (pulse && pulse.status === 'confirmed') {
        return <ConfirmedView pulse={pulse} participantId={joinedParticipantId || undefined} />;
    }

    // Only show the grid if we have a valid participant ID, OR if we are an organizer who has joined.
    // If we are organizer but haven't joined, we fall through to the Join Form.
    if (joinedParticipantId) {
        return (
            <div className="flex h-screen flex-col bg-slate-50">
                <header className="bg-white shadow-sm p-4 flex justify-between items-center z-10">
                    <h1 className="text-xl font-bold text-slate-800">{pulse?.title || "Pulse Map"}</h1>
                    <div className="text-sm font-medium text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                        {isOrganizer ? "Organizer View" : "You are joined"}
                    </div>
                </header>

                <main className="flex-1 overflow-auto p-4">
                    <PulseGrid
                        pulseId={id}
                        participantId={joinedParticipantId}
                        viewType={pulse?.view_type || "7-day"}
                        organizerId={pulse?.organizer_id || ""}
                        startDate={pulse?.start_date}
                        isOrganizer={isOrganizer}
                        mode={pulse?.mode || "times"}
                    />
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-xl">
                <div className="mb-6 text-center">
                    <h1 className="text-3xl font-bold text-slate-800">Pulse Map</h1>
                    <p className="mt-2 text-slate-500">
                        {pulse ? `Join "${pulse.title || "Social Event"}"` : "Loading..."}
                    </p>
                </div>

                <div className="space-y-4">
                    <div>
                        <label htmlFor="nickname" className="block text-sm font-medium text-slate-700">
                            Your Nickname
                        </label>
                        <input
                            type="text"
                            id="nickname"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="e.g. Alice"
                            className="mt-1 block w-full rounded-lg border border-slate-300 px-4 py-3 text-slate-900 focus:border-blue-500 focus:ring-blue-500"
                            suppressHydrationWarning
                        />
                    </div>

                    <button
                        onClick={handleJoin}
                        disabled={loading || !pulse || !nickname.trim()}
                        className="w-full rounded-xl bg-blue-600 py-3.5 font-bold text-white shadow-md transition hover:bg-blue-700 disabled:opacity-50"
                    >
                        {loading ? "Joining..." : "Continue"}
                    </button>
                </div>
            </div>
        </div>
    );
}
