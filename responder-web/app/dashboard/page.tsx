"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/utils/supabase/client";

export default function DashboardPage() {
    const [pulses, setPulses] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSelectionMode, setIsSelectionMode] = useState(false);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const supabase = createClient();

    // Helper to refresh
    const refreshHistory = async () => {
        if (typeof window === "undefined") return;

        setLoading(true);
        // 1. Get IDs from LocalStorage
        const createdIds = JSON.parse(localStorage.getItem("created_pulse_ids") || "[]");

        const joinedMap: Record<string, string> = {}; // pulseId -> participantId
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith("pulse_participant_")) {
                const pulseId = key.replace("pulse_participant_", "");
                if (!createdIds.includes(pulseId)) {
                    joinedMap[pulseId] = localStorage.getItem(key) || "";
                }
            }
        }
        const joinedIds = Object.keys(joinedMap);
        const allIds = [...createdIds, ...joinedIds];

        if (allIds.length === 0) {
            setPulses([]);
            setLoading(false);
            return;
        }

        // 2. Fetch Pulse Data
        const { data: pulsesData } = await supabase
            .from("pulses")
            .select("id, title, status, created_at, start_date")
            .in("id", allIds)
            .order("created_at", { ascending: false });

        if (!pulsesData) {
            setLoading(false);
            return;
        }

        // 3. Fetch Participant Status for Joined Events
        let participantStatusMap: Record<string, boolean> = {}; // pulseId -> is_completed
        if (joinedIds.length > 0) {
            const { data: participantsData } = await supabase
                .from("participants")
                .select("pulse_id, is_completed")
                .in("pulse_id", joinedIds)
                .in("id", Object.values(joinedMap)); // Fetch specific participant records

            if (participantsData) {
                participantsData.forEach(p => {
                    participantStatusMap[p.pulse_id] = p.is_completed;
                });
            }
        }

        // 4. Merge Data
        const merged = pulsesData.map(p => ({
            ...p,
            type: createdIds.includes(p.id) ? 'created' : 'joined',
            isMyCompleted: participantStatusMap[p.id] || false
        }));

        setPulses(merged);
        setLoading(false);
    };

    useEffect(() => {
        refreshHistory();
    }, [supabase]);

    const handleDelete = (id: string, type: 'created' | 'joined') => {
        // Direct delete (single item)
        if (!confirm("Remove this event from your history? It won't delete the event itself.")) return;

        removeFromStorage([id], type === 'created');
        refreshHistory();
    };

    const handleBulkDelete = () => {
        if (!confirm(`Remove ${selectedIds.size} events from your history?`)) return;

        const idsToRemove = Array.from(selectedIds);

        // Split IDs by type for correct removal
        const createdToRemove = idsToRemove.filter(id => pulses.find(p => p.id === id)?.type === 'created');
        const joinedToRemove = idsToRemove.filter(id => pulses.find(p => p.id === id)?.type === 'joined');

        if (createdToRemove.length > 0) removeFromStorage(createdToRemove, true);
        if (joinedToRemove.length > 0) removeFromStorage(joinedToRemove, false);

        setSelectedIds(new Set());
        setIsSelectionMode(false);
        refreshHistory();
    };

    const removeFromStorage = (ids: string[], isCreated: boolean) => {
        if (isCreated) {
            const current = JSON.parse(localStorage.getItem("created_pulse_ids") || "[]");
            const newIds = current.filter((cid: string) => !ids.includes(cid));
            localStorage.setItem("created_pulse_ids", JSON.stringify(newIds));
        } else {
            ids.forEach(id => {
                localStorage.removeItem(`pulse_participant_${id}`);
            });
        }
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
    };

    const createdList = pulses.filter(p => p.type === 'created');
    const joinedList = pulses.filter(p => p.type === 'joined');

    return (
        <div className="min-h-screen bg-sky-50 p-6 flex flex-col items-center">
            <div className="w-full max-w-4xl pb-24">
                <header className="flex justify-between items-center mb-10">
                    <Link href="/" className="text-2xl font-black tracking-tighter text-slate-900 bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent hover:opacity-80 transition-opacity">
                        Pulse Map
                    </Link>
                    <Link href="/" className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors">
                        Create New
                    </Link>
                </header>

                <h1 className="text-3xl font-black text-slate-800 mb-8 tracking-tight">My History</h1>

                {loading ? (
                    <div className="animate-pulse flex flex-col gap-4">
                        <div className="h-32 bg-white/50 rounded-2xl w-full"></div>
                        <div className="h-32 bg-white/50 rounded-2xl w-full"></div>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {/* Created Section */}
                        <section>
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-xl font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                    <svg className="w-5 h-5 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Created by Me
                                </h2>
                                {pulses.length > 0 && (
                                    <button
                                        onClick={() => {
                                            setIsSelectionMode(!isSelectionMode);
                                            setSelectedIds(new Set());
                                        }}
                                        className={`text-sm font-bold px-4 py-2 rounded-full transition-all ${isSelectionMode ? 'bg-slate-200 text-slate-800' : 'bg-white text-slate-500 hover:text-slate-800 shadow-sm border border-slate-100'}`}
                                    >
                                        {isSelectionMode ? 'Cancel' : 'Select'}
                                    </button>
                                )}
                            </div>
                            {createdList.length === 0 ? (
                                <p className="text-slate-400 italic">You haven't created any pulses yet.</p>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {createdList.map(pulse => (
                                        <PulseCard
                                            key={pulse.id}
                                            pulse={pulse}
                                            onDelete={() => handleDelete(pulse.id, 'created')}
                                            isSelectionMode={isSelectionMode}
                                            isSelected={selectedIds.has(pulse.id)}
                                            onToggle={() => toggleSelection(pulse.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>

                        {/* Joined Section */}
                        <section>
                            <h2 className="text-xl font-bold text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                                <svg className="w-5 h-5 text-indigo-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                Joined Events
                            </h2>
                            {joinedList.length === 0 ? (
                                <p className="text-slate-400 italic">You haven't joined any events yet.</p>
                            ) : (
                                <div className="grid gap-4 md:grid-cols-2">
                                    {joinedList.map(pulse => (
                                        <PulseCard
                                            key={pulse.id}
                                            pulse={pulse}
                                            onDelete={() => handleDelete(pulse.id, 'joined')}
                                            isSelectionMode={isSelectionMode}
                                            isSelected={selectedIds.has(pulse.id)}
                                            onToggle={() => toggleSelection(pulse.id)}
                                        />
                                    ))}
                                </div>
                            )}
                        </section>
                    </div>
                )}
            </div>

            {/* Floating Action Bar */}
            {isSelectionMode && selectedIds.size > 0 && (
                <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 z-50 animate-in slide-in-from-bottom-5 duration-300">
                    <span className="font-bold">{selectedIds.size} Selected</span>
                    <div className="h-4 w-[1px] bg-slate-700"></div>
                    <button
                        onClick={handleBulkDelete}
                        className="font-bold text-red-400 hover:text-red-300 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                        Delete
                    </button>
                    <button
                        onClick={() => setSelectedIds(new Set())}
                        className="text-slate-400 hover:text-white transition-colors ml-2"
                    >
                        Clear
                    </button>
                </div>
            )}
        </div>
    );
}

function PulseCard({ pulse, onDelete, isSelectionMode, isSelected, onToggle }: {
    pulse: any, onDelete: () => void, isSelectionMode: boolean, isSelected: boolean, onToggle: () => void
}) {
    const isConfirmed = pulse.status === 'confirmed';

    const handleClick = (e: React.MouseEvent) => {
        if (isSelectionMode) {
            e.preventDefault();
            onToggle();
        }
    };

    return (
        <div className="relative group">
            <Link
                href={`/pulse/${pulse.id}`}
                onClick={handleClick}
                className={`
                    block bg-white p-6 rounded-3xl shadow-sm border transition-all duration-300 transform h-full
                    ${isSelectionMode ? 'cursor-pointer' : 'hover:bg-white/50 hover:shadow-xl hover:-translate-y-1'}
                    ${isSelected ? 'ring-2 ring-sky-500 bg-sky-50 border-sky-200' : 'border-slate-100'}
                `}
            >
                <div className="flex justify-between items-start mb-4">
                    <div className="flex gap-2">
                        <div className={`
                            px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest
                            ${isConfirmed ? 'bg-green-100 text-green-700' : 'bg-blue-50 text-blue-600'}
                        `}>
                            {isConfirmed ? "Finalized" : "Voting"}
                        </div>
                        {pulse.type === 'joined' && (
                            <div className={`
                                px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest
                                ${pulse.isMyCompleted ? 'bg-indigo-100 text-indigo-700' : 'bg-orange-50 text-orange-600'}
                            `}>
                                {pulse.isMyCompleted ? "Submitted" : "Pending"}
                            </div>
                        )}
                    </div>

                    <span className="text-xs text-slate-300 font-medium ml-2">
                        {new Date(pulse.created_at).toLocaleDateString()}
                    </span>
                </div>

                <h3 className="text-xl font-bold text-slate-800 mb-2 max-w-full truncate group-hover:text-sky-600 transition-colors pr-8">
                    {pulse.title || "Untitled Event"}
                </h3>

                <div className="flex items-center text-sm text-slate-500 font-medium">
                    {pulse.type === 'created' ? (
                        <span className="text-slate-400">Organizer</span>
                    ) : (
                        <span className="text-indigo-400">Participant</span>
                    )}
                </div>

                {/* Selection Checkbox Overlay */}
                {isSelectionMode && (
                    <div className="absolute top-4 right-4 animate-in fade-in duration-200">
                        <div className={`
                            w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors
                            ${isSelected ? 'bg-sky-500 border-sky-500' : 'bg-white border-slate-300'}
                        `}>
                            {isSelected && (
                                <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                </svg>
                            )}
                        </div>
                    </div>
                )}
            </Link>

            {/* Individual Delete Button (Only showing when NOT in selection mode) */}
            {!isSelectionMode && (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onDelete();
                    }}
                    className="absolute bottom-4 right-4 p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors opacity-0 group-hover:opacity-100 z-10"
                    title="Remove from history"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            )}
        </div>
    );
}
