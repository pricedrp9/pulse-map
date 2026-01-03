"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { OrganizerToolbar } from "./OrganizerToolbar";

interface PulseGridProps {
    pulseId: string;
    participantId: string;
    viewType: "1-day" | "7-day" | "14-day" | "month" | "3-months";
    organizerId: string;
    isOrganizer?: boolean;
    startDate?: string;
    mode?: "times" | "dates";
}

const getDates = (viewType: string, startDate?: string) => {
    let days = 7;
    if (viewType === '1-day') days = 1;
    else if (viewType === '14-day') days = 14;
    else if (viewType === 'month') days = 30;
    else if (viewType === '3-months') days = 90;

    const dates = [];
    const start = startDate ? new Date(startDate) : new Date();

    for (let i = 0; i < days; i++) {
        const d = new Date(start);
        d.setDate(start.getDate() + i);
        dates.push(d);
    }
    return dates;
};



const formatHour = (h: number) => {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 || 12;
    return `${hour12} ${ampm}`;
}

const getHeatmapClass = (count: number, maxCount: number) => {
    if (count === 0) return "bg-white dark:bg-slate-800";
    const ratio = count / Math.max(maxCount, 2);
    if (ratio < 0.33) return "bg-sky-100 dark:bg-sky-900/40";
    if (ratio < 0.66) return "bg-sky-300 dark:bg-sky-600/60";
    return "bg-sky-600 dark:bg-sky-500";
};

export function PulseGrid({ pulseId, participantId, viewType, isOrganizer, startDate, mode = "times" }: PulseGridProps) {
    const [dates, setDates] = useState(() => getDates(viewType, startDate));

    // Dynamic rows based on mode
    const hours = mode === 'dates' ? [0] : Array.from({ length: 24 }, (_, i) => i);

    useEffect(() => {
        setDates(getDates(viewType, startDate));
    }, [viewType, startDate]);

    const [myAvailability, setMyAvailability] = useState<Set<string>>(new Set());
    const [heatmapCounts, setHeatmapCounts] = useState<Record<string, number>>({});
    const [maxCount, setMaxCount] = useState(1);
    const supabase = createClient();

    // Organizer Selection State
    const [selectedFinal, setSelectedFinal] = useState<Set<string>>(new Set());
    const [isFinalizing, setIsFinalizing] = useState(false);

    // Drag Selection State
    const [isDragging, setIsDragging] = useState(false);
    const [dragAction, setDragAction] = useState<'add' | 'remove' | null>(null);

    // Global mouse up to stop dragging
    useEffect(() => {
        const handleGlobalMouseUp = () => {
            setIsDragging(false);
            setDragAction(null);
        };
        window.addEventListener('mouseup', handleGlobalMouseUp);
        return () => window.removeEventListener('mouseup', handleGlobalMouseUp);
    }, []);

    const [cellParticipants, setCellParticipants] = useState<Record<string, string[]>>({});

    useEffect(() => {
        const fetchAvailability = async () => {
            const { data, error } = await supabase
                .from("availability")
                .select("start_time, end_time, participant_id, participants(name)")
                .eq("pulse_id", pulseId);

            if (error || !data) return;

            const newCounts: Record<string, number> = {};
            const newCellParticipants: Record<string, string[]> = {};
            const mySet = new Set<string>();
            let max = 1;

            data.forEach((row: any) => {
                const localDate = new Date(row.start_time);
                // In Date mode, we use hour 0 as the key for distinctness
                const hKey = mode === 'dates' ? 0 : localDate.getHours();
                const key = `${localDate.getFullYear()}-${localDate.getMonth()}-${localDate.getDate()}-${hKey}`;

                newCounts[key] = (newCounts[key] || 0) + 1;

                // Add name to list
                if (!newCellParticipants[key]) newCellParticipants[key] = [];
                if (row.participants?.name) newCellParticipants[key].push(row.participants.name);

                if (newCounts[key] > max) max = newCounts[key];

                if (row.participant_id === participantId) {
                    mySet.add(key);
                }
            });

            setHeatmapCounts(newCounts);
            setCellParticipants(newCellParticipants);
            setMyAvailability(mySet);
            setMaxCount(max);
        };

        fetchAvailability();

        const channel = supabase
            .channel(`grid_${pulseId}`)
            .on("postgres_changes", { event: "*", schema: "public", table: "availability", filter: `pulse_id=eq.${pulseId}` }, () => fetchAvailability())
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [pulseId, participantId, supabase, mode]);

    const toggleSlot = async (d: Date, hour: number, action: 'add' | 'remove') => {

        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${hour}`;
        const isAvailable = myAvailability.has(key);

        // Optimization: Don't fire if state already matches action
        if (action === 'add' && isAvailable) return;
        if (action === 'remove' && !isAvailable) return;

        // Optimistic Update
        const newMySet = new Set(myAvailability);
        if (action === 'remove') newMySet.delete(key);
        else newMySet.add(key);
        setMyAvailability(newMySet);

        // Optimistic Heatmap Update
        setHeatmapCounts(prev => {
            const newCounts = { ...prev };
            const currentCount = newCounts[key] || 0;
            if (action === 'add') {
                newCounts[key] = currentCount + 1;
                // Update Max Count if needed for scaling
                if (newCounts[key] > maxCount) setMaxCount(newCounts[key]);
            } else {
                newCounts[key] = Math.max(0, currentCount - 1);
            }
            return newCounts;
        });

        // Optimistic Name Update
        setCellParticipants(prev => {
            const newMap = { ...prev };
            const list = newMap[key] || [];
            const myName = "You"; // Default to "You" for immediate feedback

            if (action === 'add') {
                // Avoid duplicates if name already there (unlikely if 'You')
                if (!list.includes(myName)) {
                    newMap[key] = [...list, myName];
                }
            } else {
                newMap[key] = list.filter(n => n !== myName); // Remove "You" (or actual name if we knew it fully)
            }
            return newMap;
        });

        // Calculate Times
        const start = new Date(d);
        let end = new Date(start);

        if (mode === 'dates') {
            start.setHours(0, 0, 0, 0);
            end.setHours(23, 59, 59, 999);
        } else {
            start.setHours(hour, 0, 0, 0);
            end = new Date(start);
            end.setHours(hour + 1, 0, 0, 0);
        }

        // DB Call
        if (action === 'remove') {
            await supabase.from("availability").delete().match({ participant_id: participantId, start_time: start.toISOString() });
        } else {
            await supabase.from("availability").insert({ participant_id: participantId, pulse_id: pulseId, start_time: start.toISOString(), end_time: end.toISOString() });
        }
    };

    // Organizer Mode State (Voting vs Finalizing)
    const [adminMode, setAdminMode] = useState(false); // false = Voting, true = Finalizing

    const handleMouseDown = (d: Date, hour: number) => {
        // Validation: If Finalizing, use Multi-Select Logic
        if (isOrganizer && adminMode) {
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${hour}`;
            const newSet = new Set(selectedFinal);
            if (newSet.has(key)) newSet.delete(key);
            else newSet.add(key);
            setSelectedFinal(newSet);
            return;
        }

        // Standard Voting Logic (Drag Enabled)
        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${hour}`;
        const isCurrentlySelected = myAvailability.has(key);
        const action = isCurrentlySelected ? 'remove' : 'add';

        setIsDragging(true);
        setDragAction(action);
        toggleSlot(d, hour, action);
    };

    const handleMouseEnter = (d: Date, hour: number) => {
        if (isOrganizer && adminMode) return; // No drag in admin mode
        if (isDragging && dragAction) {
            toggleSlot(d, hour, dragAction);
        }
    };

    const handleFinalize = async () => {
        if (selectedFinal.size === 0) return;
        setIsFinalizing(true);

        const selectionArray: { start: string, end: string }[] = [];

        selectedFinal.forEach(key => {
            const [y, m, d, h] = key.split('-').map(Number);
            const start = new Date(y, m, d, h, 0, 0);
            let end = new Date(start);

            if (mode === 'dates') {
                end.setHours(23, 59, 59, 999);
            } else {
                end.setHours(h + 1);
            }
            selectionArray.push({ start: start.toISOString(), end: end.toISOString() });
        });

        // Store first choice in legacy columns for backward compatibility, and full array in new column
        const first = selectionArray[0];

        const { error } = await supabase.from("pulses").update({
            status: "confirmed",
            finalized_start: first.start,
            finalized_end: first.end,
            finalized_selection: selectionArray
        }).eq("id", pulseId);

        if (!error) {
            // Trigger Notification API
            fetch("/api/finalize", {
                method: "POST",
                body: JSON.stringify({ pulseId }),
            }).catch(e => console.error("Notification trigger failed", e));
        }
    };

    // Render Date Mode (Calendar Grid)
    if (mode === 'dates') {
        const startOffset = dates.length > 0 ? dates[0].getDay() : 0;
        const spacers = Array.from({ length: startOffset }, (_, i) => i);

        return (
            <div className="pb-32 p-4 max-w-7xl mx-auto">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4 select-none">
                    {/* Spacers for Grid Alignment */}
                    {spacers.map((s) => (
                        <div key={`spacer-${s}`} className="hidden lg:block"></div>
                    ))}

                    {dates.map((d, i) => {
                        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-0`;
                        const count = heatmapCounts[key] || 0;
                        const isSelected = myAvailability.has(key);
                        const isFinalSelection = selectedFinal.has(key);

                        let bgClass = getHeatmapClass(count, maxCount);

                        if (isOrganizer && adminMode && isFinalSelection) bgClass = "bg-blue-600 shadow-blue-300/50 shadow-lg scale-105 z-10 text-white";

                        const today = new Date();
                        const isCurrentMonth = d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();

                        let monthBorder = "";
                        if (isCurrentMonth) {
                            monthBorder = "border-sky-400";
                        } else {
                            const colors = ["border-sky-200", "border-blue-200", "border-cyan-200", "border-indigo-200"];
                            monthBorder = colors[d.getMonth() % colors.length];
                        }

                        // Staggered Animation Delay
                        const delay = i * 20; // 20ms stagger

                        return (
                            <div
                                key={key}
                                onMouseDown={() => handleMouseDown(d, 0)}
                                onMouseEnter={() => handleMouseEnter(d, 0)}
                                className={`
                                    relative flex flex-col items-center justify-center p-6 rounded-3xl border transition-all duration-300 cursor-pointer touch-pan-y group
                                    ${bgClass}
                                    ${isSelected && !isOrganizer ? 'ring-4 ring-sky-400/30 border-sky-500 shadow-xl scale-105 z-20' : `${monthBorder} dark:border-slate-700 hover:shadow-xl hover:scale-105 hover:-translate-y-1`}
                                    ring-1 ring-black/5 dark:ring-white/5
                                `}
                            >
                                <div className={`text-xs font-bold uppercase mb-2 tracking-widest ${count / maxCount > 0.5 ? 'text-white/90' : 'text-slate-400 dark:text-slate-500'}`}>
                                    {d.toLocaleDateString("en-US", { weekday: "short" })}
                                </div>
                                <div className={`text-3xl font-black mb-1 ${count / maxCount > 0.5 ? 'text-white' : 'text-slate-800 dark:text-white'}`}>
                                    <span className="text-[10px] font-bold block uppercase mb-1 tracking-widest opacity-60 text-center leading-none">
                                        {d.toLocaleDateString("en-US", { month: "short" })}
                                    </span>
                                    {d.getDate()}
                                </div>
                                <div className={`text-[10px] font-bold uppercase tracking-wide bg-black/10 px-2 py-1 rounded-full ${count / maxCount > 0.5 ? 'text-white' : 'text-slate-400'}`}>
                                    {count > 0 ? `${count} Free` : 'Add'}
                                </div>

                                {/* Participant Names List (Desktop Hover / Mobile Visible) */}
                                {count > 0 && (
                                    <div className={`absolute top-2 right-2 flex flex-col items-end opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none ${count / maxCount > 0.5 ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                                        {cellParticipants[key]?.slice(0, 3).map((name, i) => (
                                            <span key={i} className="text-[9px] font-bold bg-white/90 dark:bg-slate-700/90 text-slate-600 dark:text-slate-300 px-1.5 py-0.5 rounded-full mb-0.5 shadow-sm whitespace-nowrap">
                                                {name}
                                            </span>
                                        ))}
                                        {cellParticipants[key]?.length > 3 && (
                                            <span className="text-[9px] font-bold px-1.5">+ {cellParticipants[key].length - 3}</span>
                                        )}
                                    </div>
                                )}

                                {/* Mobile: Show names below count if plenty of space, or just keep it clean */}
                                {count > 0 && (
                                    <div className="mt-2 flex flex-wrap justify-center gap-1 max-w-[90%] lg:hidden pointer-events-none">
                                        {cellParticipants[key]?.slice(0, 3).map((name, i) => (
                                            <span key={i} className="text-[8px] font-bold text-slate-600 dark:text-slate-300 bg-white/50 dark:bg-slate-700/50 px-1.5 py-0.5 rounded-sm truncate max-w-[60px]">
                                                {name}
                                            </span>
                                        ))}
                                        {((cellParticipants[key]?.length || 0) > 3) && (
                                            <span className={`text-[8px] font-bold px-1 ${count / maxCount > 0.5 ? 'text-white' : 'text-slate-400 dark:text-slate-500'}`}>+ {(cellParticipants[key]?.length || 0) - 3}</span>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {isOrganizer && (
                    <OrganizerToolbar
                        adminMode={adminMode}
                        setAdminMode={setAdminMode}
                        handleFinalize={handleFinalize}
                        isFinalizing={isFinalizing}
                        selectedFinalSize={selectedFinal.size}
                    />
                )}
            </div>
        );
    }

    // Render Time Mode (Timeline)
    const timeMonths: { name: string; colspan: number; color: string }[] = [];
    let currentMonth = "";
    let span = 0;

    dates.forEach((d, i) => {
        const m = d.toLocaleString('default', { month: 'short' });
        if (m !== currentMonth) {
            if (currentMonth) {
                timeMonths.push({
                    name: currentMonth,
                    colspan: span,
                    color: timeMonths.length % 2 === 0 ? "bg-sky-50/50" : "bg-white"
                });
            }
            currentMonth = m;
            span = 1;
        } else {
            span++;
        }

        if (i === dates.length - 1) {
            timeMonths.push({
                name: currentMonth,
                colspan: span,
                color: timeMonths.length % 2 === 0 ? "bg-sky-50/50" : "bg-white"
            });
        }
    });

    return (
        <div className="w-full relative select-none p-4 pb-32">
            <div className="min-w-[800px] bg-white/70 dark:bg-slate-800/70 backdrop-blur-md rounded-3xl shadow-sm border border-white/50 dark:border-slate-700/50 ring-1 ring-black/5 dark:ring-white/5 mx-auto overflow-visible transition-colors">
                {/* Sticky Header Wrapper */}
                <div className="sticky top-0 z-30 shadow-sm dark:shadow-slate-900 rounded-t-[1.5rem] overflow-hidden">
                    {/* Month Header */}
                    <div className="flex bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur border-b border-slate-100 dark:border-slate-700/50 transition-colors">
                        <div className="sticky left-0 z-40 w-20 flex-shrink-0 bg-slate-50 dark:bg-slate-900 border-r border-slate-100 dark:border-slate-700/50 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.05)] dark:shadow-none"></div>
                        {timeMonths.map((m, i) => (
                            <div
                                key={i}
                                style={{ flexGrow: m.colspan, flexBasis: 0 }}
                                className={`py-3 text-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] border-r border-slate-100 dark:border-slate-700/50 last:border-r-0 ${m.color === "bg-white" ? "bg-white dark:bg-slate-800" : "bg-sky-50/50 dark:bg-slate-800/50"}`}
                            >
                                {m.name}
                            </div>
                        ))}
                    </div>

                    {/* Day Header */}
                    <div className="flex border-b border-slate-100 dark:border-slate-700/50 bg-white/95 dark:bg-slate-800/95 backdrop-blur transition-colors">
                        <div className="sticky left-0 z-40 w-20 flex-shrink-0 border-r border-slate-100 dark:border-slate-700/50 bg-white dark:bg-slate-800 shadow-[4px_0_24px_-2px_rgba(0,0,0,0.05)] dark:shadow-none"></div>
                        {dates.map((d, i) => {
                            const isWeekend = d.getDay() === 0 || d.getDay() === 6;
                            return (
                                <div key={i} className={`flex-1 px-1 py-4 text-center border-r border-slate-50 dark:border-slate-700/30 ${isWeekend ? 'bg-sky-50/30 dark:bg-slate-700/20' : 'bg-white dark:bg-slate-800'}`}>
                                    <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-1">{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
                                    <div className="text-xl font-black text-slate-800 dark:text-white">{d.getDate()}</div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Rows */}
                {hours.map((hour) => (
                    <div key={hour} className="flex border-b border-slate-50 dark:border-slate-700/30 h-16 group/row hover:bg-sky-50/30 dark:hover:bg-slate-700/30 transition-colors">
                        <div className="sticky left-0 z-20 w-20 flex-shrink-0 flex items-center justify-end pr-4 text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-800 border-r border-slate-100 dark:border-slate-700/50 uppercase tracking-wider shadow-[4px_0_24px_-2px_rgba(0,0,0,0.05)] dark:shadow-none transition-colors">
                            {formatHour(hour)}
                        </div>

                        {dates.map((d) => {
                            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${hour}`;
                            const count = heatmapCounts[key] || 0;
                            const isSelected = myAvailability.has(key);
                            const isFinalSelection = selectedFinal.has(key);

                            let bgClass = count > 0 ? getHeatmapClass(count, maxCount) : "bg-transparent";

                            if (isOrganizer && adminMode && isFinalSelection) bgClass = "bg-blue-500 shadow-inner";

                            return (
                                <div
                                    key={key}
                                    onMouseDown={() => handleMouseDown(d, hour)}
                                    onMouseEnter={() => handleMouseEnter(d, hour)}
                                    // Tooltip Logic for Time Mode (simpler)
                                    className="flex-1 border-r border-slate-50 dark:border-slate-700/30 cursor-pointer relative group"
                                >
                                    <div className={`absolute inset-1 rounded-lg transition-all duration-200 ${bgClass} ${isSelected && !isOrganizer ? 'ring-2 ring-sky-500 bg-sky-50 dark:bg-sky-900/50 z-10 scale-90 shadow-lg' : 'group-hover:scale-95 group-hover:-translate-y-0.5 group-hover:shadow-md'}`}>
                                        {count > 0 && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <span className={`text-[10px] font-bold ${count / maxCount > 0.5 ? 'text-white' : 'text-sky-900/50 dark:text-sky-200/50'}`}>{count}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Hover Tooltip for Names in Time Mode */}
                                    {count > 0 && (
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col bg-slate-800 dark:bg-slate-950 text-white text-[10px] p-2 rounded-lg shadow-xl z-50 whitespace-nowrap min-w-[100px] pointer-events-none ring-1 ring-white/10">
                                            <div className="max-h-32 overflow-y-auto scrollbar-hide flex flex-col gap-0.5">
                                                {cellParticipants[key]?.length > 0 ? (
                                                    cellParticipants[key].map((name, i) => (
                                                        <div key={i} className="px-1">{name}</div>
                                                    ))
                                                ) : (
                                                    <div className="opacity-50 px-1">Loading...</div>
                                                )}
                                            </div>
                                            <div className="mt-1 pt-1 border-t border-slate-700/50 text-center font-bold text-slate-400 text-[9px]">
                                                {count} Participants
                                            </div>
                                            {/* Arrow */}
                                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-800 dark:border-t-slate-950"></div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {isOrganizer && (
                <OrganizerToolbar
                    adminMode={adminMode}
                    setAdminMode={setAdminMode}
                    handleFinalize={handleFinalize}
                    isFinalizing={isFinalizing}
                    selectedFinalSize={selectedFinal.size}
                />
            )}
        </div>
    );
}
