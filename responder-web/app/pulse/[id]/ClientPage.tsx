"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { PulseGrid } from "@/components/PulseGrid";
import { ConfirmedView } from "@/components/ConfirmedView";
import { OrganizerDashboardPulse } from "@/components/OrganizerDashboardPulse";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";
import { HowToModal } from "@/components/HowToModal";

export default function PulseClientPage() {
    const params = useParams();
    const router = useRouter();
    const id = params?.id as string;

    const [nickname, setNickname] = useState("");
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [pulse, setPulse] = useState<any>(null); // Ideally typed
    const [error, setError] = useState("");

    // Check if already joined
    const [joinedParticipantId, setJoinedParticipantId] = useState<string | null>(null);

    // Check if organizer
    const [isOrganizer, setIsOrganizer] = useState(false);

    const supabase = createClient();

    // Completion Status
    const [isCompleted, setIsCompleted] = useState(false);

    // Help Widget State
    const [showHelp, setShowHelp] = useState(false);

    // Help Guide Auto-Open Logic
    useEffect(() => {
        if (joinedParticipantId) {
            const hasSeen = localStorage.getItem('pulse_has_seen_guide');
            if (!hasSeen) {
                setShowHelp(true);
                localStorage.setItem('pulse_has_seen_guide', 'true');
            }
        }
    }, [joinedParticipantId]);

    useEffect(() => {
        if (!joinedParticipantId) return;
        const checkStatus = async () => {
            const { data } = await supabase.from("participants").select("is_completed, name").eq("id", joinedParticipantId).single();
            if (data) {
                setIsCompleted(data.is_completed);
                if (data.name) setNickname(data.name);
            }
        };
        checkStatus();
    }, [joinedParticipantId, supabase]);

    const handleToggleCompletion = async () => {
        const newVal = !isCompleted;
        setIsCompleted(newVal);
        await supabase.from("participants").update({ is_completed: newVal }).eq("id", joinedParticipantId);
    };

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
                    email: email || null, // Optional
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
        return <ConfirmedView pulse={pulse} participantId={joinedParticipantId || undefined} isOrganizer={isOrganizer} />;
    }



    // Only show the grid if we have a valid participant ID, OR if we are an organizer who has joined.
    // If we are organizer but haven't joined, we fall through to the Join Form.
    if (joinedParticipantId) {
        return (
            <div className="flex min-h-screen flex-col bg-slate-50 dark:bg-slate-900 transition-colors">
                <header className="bg-white dark:bg-slate-800 shadow-sm dark:shadow-slate-900 p-4 flex justify-between items-center z-10 transition-colors">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors">
                            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                            </svg>
                        </Link>
                        <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-tight">{pulse?.title || "Pulse Map"}</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <ThemeToggle />
                        {isOrganizer && (
                            <OrganizerDashboardPulse id={id} />
                        )}
                        <button
                            onClick={() => setShowHelp(true)}
                            className="w-10 h-10 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 font-bold hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center justify-center"
                            title="How to use"
                        >
                            ?
                        </button>
                        <button
                            onClick={async () => {
                                const url = window.location.href;
                                if (navigator.share) {
                                    try {
                                        await navigator.share({
                                            title: pulse?.title || "Join Pulse",
                                            text: "Join my Pulse Map availability poll!",
                                            url: url
                                        });
                                    } catch (err) {
                                        console.error("Share failed", err);
                                    }
                                } else {
                                    try {
                                        await navigator.clipboard.writeText(url);
                                        const btn = document.getElementById('share-btn-text');
                                        if (btn) {
                                            const original = btn.innerText;
                                            btn.innerText = "Copied!";
                                            setTimeout(() => btn.innerText = original, 2000);
                                        }
                                    } catch (err) {
                                        console.error("Clipboard failed", err);
                                    }
                                }
                            }}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 rounded-full text-xs font-bold transition-colors"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                            <span id="share-btn-text">Share</span>
                        </button>
                        <div className="text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800">
                            {isOrganizer ? "Organizer" : "Joined"}
                        </div>
                    </div>
                </header>

                <main className="flex-1 flex flex-col relative bg-sky-50 dark:bg-slate-900 transition-colors">
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

                <button
                    onClick={handleToggleCompletion}
                    className={`fixed right-6 z-[1000] flex items-center gap-2 px-6 py-3 rounded-full shadow-2xl transition-all duration-300 font-bold border-2 
                    ${isOrganizer ? "bottom-24" : "bottom-12"} 
                    ${isCompleted
                            ? "bg-green-500 text-white border-green-600 shadow-green-200 dark:shadow-green-900/50"
                            : "bg-slate-900 dark:bg-sky-600 text-white border-slate-900 dark:border-sky-500 hover:bg-slate-800 dark:hover:bg-sky-500 hover:scale-105"
                        }`}
                >
                    {isCompleted ? (
                        <>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                            </svg>
                            <span>Done</span>
                        </>
                    ) : (
                        <>
                            <span>Done</span>
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                        </>
                    )}
                </button>
                <HowToModal isOpen={showHelp} onClose={() => setShowHelp(false)} isOrganizer={isOrganizer} />
            </div>
        );
    }

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-sky-50 dark:bg-slate-900 p-6 transition-colors">
            <div className="absolute top-6 right-6 z-50">
                <ThemeToggle />
            </div>
            <div className="w-full max-w-md rounded-[2rem] bg-white dark:bg-slate-800 p-8 shadow-2xl shadow-sky-100 dark:shadow-slate-900 border border-sky-50 dark:border-slate-700 transition-colors">
                <div className="mb-8 text-center">
                    <h1 className="text-4xl font-black tracking-tighter text-slate-900 dark:text-white mb-2 bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                        Pulse Map
                    </h1>
                    <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">
                        {pulse ? `Join "${pulse.title || "Social Event"}"` : "Loading..."}
                    </p>
                </div>

                <div className="space-y-6">
                    <div>
                        <label htmlFor="nickname" className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 pl-4">
                            Your Nickname
                        </label>
                        <input
                            type="text"
                            id="nickname"
                            value={nickname}
                            onChange={(e) => setNickname(e.target.value)}
                            placeholder="e.g. Alice"
                            className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl px-6 py-4 text-lg font-bold text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900 transition-all outline-none"
                            suppressHydrationWarning
                        />
                    </div>

                    <div>
                        <label htmlFor="email" className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 pl-4">
                            Email (Optional)
                        </label>
                        <input
                            type="email"
                            id="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="To get notified when finalized"
                            className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl px-6 py-4 text-lg font-bold text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900 transition-all outline-none"
                            suppressHydrationWarning
                        />
                    </div>

                    <button
                        onClick={handleJoin}
                        disabled={loading || !pulse || !nickname.trim()}
                        className="w-full mt-2 bg-slate-900 dark:bg-sky-600 text-white rounded-2xl py-5 text-lg font-black tracking-wide shadow-xl hover:bg-black dark:hover:bg-sky-500 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all duration-300"
                    >
                        {loading ? "Joining..." : "Continue"}
                    </button>
                </div>
            </div>
        </div>
    );
}
