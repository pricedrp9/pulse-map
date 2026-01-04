"use client";

import { createClient } from "@/utils/supabase/client";
import { useEffect, useState } from "react";

export function OrganizerDashboardPulse({ id }: { id: string }) {
    const [isOpen, setIsOpen] = useState(false);
    const [participants, setParticipants] = useState<any[]>([]);
    const supabase = createClient();

    useEffect(() => {


        const fetchParticipants = async () => {
            const { data } = await supabase
                .from("participants")
                .select("*")
                .eq("pulse_id", id);
            if (data) setParticipants(data);
        };

        fetchParticipants();

        // Realtime Subscription
        const channel = supabase.channel(`participants_${id}`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'participants', filter: `pulse_id=eq.${id}` },
                () => fetchParticipants()
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [id, supabase]);

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 dark:bg-blue-900/40 hover:bg-blue-200 dark:hover:bg-blue-900/60 text-blue-800 dark:text-blue-200 rounded-full text-xs font-bold transition-colors"
            >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
                <span className="md:hidden">({participants.filter(p => p.is_completed).length}/{participants.length})</span>
                <span className="hidden md:inline">Participants ({participants.filter(p => p.is_completed).length}/{participants.length} Done)</span>
            </button>

            {isOpen && (
                <>
                    <div className="fixed inset-0 z-40 bg-black/20 backdrop-blur-sm transition-opacity" onClick={() => setIsOpen(false)} />
                    <div className="absolute right-0 top-full mt-2 w-72 md:w-80 max-w-[90vw] translate-x-[20%] md:translate-x-0 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl dark:shadow-slate-900 border border-slate-100 dark:border-slate-700 p-4 z-50 origin-top-right animate-in fade-in zoom-in-95 duration-200 transition-all">
                        <div className="flex justify-between items-center mb-3">
                            <h3 className="font-bold text-slate-800 dark:text-white">Who's In?</h3>
                            <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase">{participants.filter(p => p.is_completed).length}/{participants.length} Done</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-2 bg-slate-100 dark:bg-slate-700 rounded-full mb-4 overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-blue-400 to-indigo-500 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${participants.length > 0 ? (participants.filter(p => p.is_completed).length / participants.length) * 100 : 0}%` }}
                            />
                        </div>

                        <div className="space-y-2 max-h-64 overflow-y-auto pr-1 scrollbar-thin">
                            {participants.length === 0 ? (
                                <p className="text-sm text-slate-400 italic">No one has joined yet.</p>
                            ) : (
                                participants.map((p) => (
                                    <div key={p.id} className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-700/50">
                                        <div className="flex items-center gap-2">
                                            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-indigo-400 to-purple-400 flex items-center justify-center text-[10px] font-bold text-white">
                                                {p.name.charAt(0).toUpperCase()}
                                            </div>
                                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">{p.name}</span>
                                        </div>
                                        {p.is_completed ? (
                                            <span className="text-[10px] font-bold text-green-600 bg-green-100 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                                Done
                                            </span>
                                        ) : (
                                            <span className="text-[10px] font-bold text-slate-400 bg-slate-200 dark:bg-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-full flex items-center gap-1">
                                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                                                </svg>
                                                Thinking
                                            </span>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
