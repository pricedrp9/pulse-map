"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";

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
    const [selectedFinal, setSelectedFinal] = useState<string | null>(null);
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

    useEffect(() => {
        const fetchAvailability = async () => {
            const { data, error } = await supabase
                .from("availability")
                .select("start_time, end_time, participant_id")
                .eq("pulse_id", pulseId);

            if (error || !data) return;

            const newCounts: Record<string, number> = {};
            const mySet = new Set<string>();
            let max = 1;

            data.forEach((row) => {
                const localDate = new Date(row.start_time);
                // In Date mode, we use hour 0 as the key for distinctness
                const hKey = mode === 'dates' ? 0 : localDate.getHours();
                const key = `${localDate.getFullYear()}-${localDate.getMonth()}-${localDate.getDate()}-${hKey}`;

                newCounts[key] = (newCounts[key] || 0) + 1;
                if (newCounts[key] > max) max = newCounts[key];

                if (row.participant_id === participantId) {
                    mySet.add(key);
                }
            });

            setHeatmapCounts(newCounts);
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
        // Validation: If Finalizing, use Single Select Logic
        if (isOrganizer && adminMode) {
            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${hour}`;
            if (selectedFinal === key) setSelectedFinal(null);
            else setSelectedFinal(key);
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
        if (!selectedFinal) return;
        setIsFinalizing(true);

        const [y, m, d, h] = selectedFinal.split('-').map(Number);
        const start = new Date(y, m, d, h, 0, 0);
        let end = new Date(start);

        if (mode === 'dates') {
            end.setHours(23, 59, 59, 999);
        } else {
            end.setHours(h + 1);
        }

        await supabase.from("pulses").update({
            status: "confirmed",
            finalized_start: start.toISOString(),
            finalized_end: end.toISOString()
        }).eq("id", pulseId);
    };

    // Render Date Mode (Calendar Grid)
    if (mode === 'dates') {
        return (
            <div className="pb-24 p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 select-none">
                    {dates.map((d) => {
                        // Key for Date Mode is just the date with hour 0
                        const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-0`;
                        const count = heatmapCounts[key] || 0;
                        const isSelected = myAvailability.has(key);
                        const isFinalSelection = selectedFinal === key;

                        let bgClass = "bg-white";
                        if (count > 0) {
                            const ratio = count / Math.max(maxCount, 2);
                            if (ratio < 0.33) bgClass = "bg-blue-100";
                            else if (ratio < 0.66) bgClass = "bg-blue-300";
                            else bgClass = "bg-blue-600";
                        }

                        if (isOrganizer && adminMode && isFinalSelection) bgClass = "bg-green-500";

                        // Define month-specific border colors
                        const today = new Date();
                        const isCurrentMonth = d.getMonth() === today.getMonth() && d.getFullYear() === today.getFullYear();

                        let monthBorder = "";
                        if (isCurrentMonth) {
                            monthBorder = "border-emerald-400"; // Green for current month
                        } else {
                            const blueShades = ["border-blue-300", "border-sky-300", "border-indigo-300", "border-cyan-300"];
                            monthBorder = blueShades[d.getMonth() % blueShades.length];
                        }

                        return (
                            <div
                                key={key}
                                onMouseDown={() => handleMouseDown(d, 0)}
                                onMouseEnter={() => handleMouseEnter(d, 0)}
                                className={`
                                    relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all shadow-sm
                                    ${bgClass}
                                    ${isSelected && !isOrganizer ? 'ring-2 ring-blue-600 border-blue-600 z-10' : `${monthBorder} hover:border-blue-400 hover:shadow-md`}
                                `}
                            >
                                <div className={`text-xs font-bold uppercase mb-1 ${count / maxCount > 0.5 ? 'text-white/80' : 'text-slate-500'}`}>
                                    {d.toLocaleDateString("en-US", { weekday: "short" })}
                                </div>
                                <div className={`text-2xl font-black ${count / maxCount > 0.5 ? 'text-white' : 'text-slate-800'}`}>
                                    <span className="text-xs font-semibold block uppercase mb-[-4px] tracking-wide opacity-60">
                                        {d.toLocaleDateString("en-US", { month: "short" })}
                                    </span>
                                    {d.getDate()}
                                </div>
                                <div className={`text-xs mt-1 font-medium ${count / maxCount > 0.5 ? 'text-white/80' : 'text-slate-400'}`}>
                                    {count > 0 ? `${count} available` : 'Available?'}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {isOrganizer && (
                    <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-lg flex justify-between items-center bg-opacity-95 backdrop-blur z-50 gap-4">
                        <button
                            onClick={() => setAdminMode(!adminMode)}
                            className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${adminMode ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'}`}
                        >
                            {adminMode ? "Back to Voting" : "Switch to Finalize"}
                        </button>

                        {adminMode ? (
                            <button
                                onClick={handleFinalize}
                                disabled={!selectedFinal || isFinalizing}
                                className="flex-1 bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 disabled:grayscale transition-all shadow-md"
                            >
                                {isFinalizing ? "Confirming..." : "Finalize Date"}
                            </button>
                        ) : (
                            <div className="text-sm text-slate-500">
                                Voting Mode Active
                            </div>
                        )}
                    </div>
                )}
            </div>
        );
    }

    // Render Time Mode (Existing Horizontal Scroll) with Month Headers
    // Group columns by Month to determine header spans
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
                    color: timeMonths.length % 2 === 0 ? "bg-slate-50" : "bg-blue-50/50"
                });
            }
            currentMonth = m;
            span = 1;
        } else {
            span++;
        }

        // Push last
        if (i === dates.length - 1) {
            timeMonths.push({
                name: currentMonth,
                colspan: span,
                color: timeMonths.length % 2 === 0 ? "bg-slate-50" : "bg-blue-50/50"
            });
        }
    });

    return (
        <div className="overflow-x-auto pb-24 relative select-none">
            <div className="min-w-[800px]">
                {/* Month Header */}
                <div className="flex bg-white sticky top-0 z-20 shadow-sm">
                    <div className="w-16 flex-shrink-0 bg-slate-50 border-r border-slate-100"></div>
                    {timeMonths.map((m, i) => (
                        <div
                            key={i}
                            style={{ flexGrow: m.colspan, flexBasis: 0 }}
                            className={`py-1 text-center text-xs font-bold text-slate-500 uppercase tracking-widest border-r last:border-r-0 border-b border-slate-200 ${m.color}`}
                        >
                            {m.name}
                        </div>
                    ))}
                </div>

                {/* Day Header */}
                <div className="flex border-b border-slate-200">
                    <div className="w-16 flex-shrink-0 bg-slate-50 border-r border-slate-100"></div>
                    {dates.map((d, i) => {
                        const isAltMonth = d.getMonth() % 2 !== 0;

                        return (
                            <div key={i} className={`flex-1 px-1 py-2 text-center border-r border-slate-100 ${isAltMonth ? 'bg-slate-50/30' : 'bg-white'}`}>
                                <div className="text-xs font-bold text-slate-500">{d.toLocaleDateString("en-US", { weekday: "short" })}</div>
                                <div className="text-sm font-bold text-slate-800">{d.getDate()}</div>
                            </div>
                        )
                    })}
                </div>

                {/* Rows */}
                {hours.map((hour) => (
                    <div key={hour} className={`flex border-b border-slate-100 ${(mode as string) === 'dates' ? 'h-32' : 'h-12'}`}>
                        <div className="w-16 flex-shrink-0 flex items-start justify-end pr-2 pt-1 text-[10px] text-slate-400 font-mono bg-slate-50 uppercase leading-none">
                            {(mode as string) === 'dates' ? 'ALL DAY' : formatHour(hour)}
                        </div>

                        {dates.map((d) => {
                            const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${hour}`;
                            const count = heatmapCounts[key] || 0;
                            const isSelected = myAvailability.has(key);
                            const isFinalSelection = selectedFinal === key;

                            // Alternate background based on month
                            const isAltMonth = d.getMonth() % 2 !== 0;
                            let baseBg = isAltMonth ? "bg-slate-50/50" : "bg-white";

                            let bgClass = baseBg;
                            if (count > 0) {
                                const ratio = count / Math.max(maxCount, 2);
                                if (ratio < 0.33) bgClass = "bg-blue-100";
                                else if (ratio < 0.66) bgClass = "bg-blue-300";
                                else bgClass = "bg-blue-600";
                            }

                            // Organizer Overlay
                            if (isOrganizer && adminMode && isFinalSelection) bgClass = "bg-green-500";

                            return (
                                <div
                                    key={key}
                                    onMouseDown={() => handleMouseDown(d, hour)}
                                    onMouseEnter={() => handleMouseEnter(d, hour)}
                                    className={`flex-1 border-r border-slate-100 cursor-pointer transition-colors relative group`}
                                >
                                    <div className={`absolute inset-0.5 rounded-md ${bgClass} ${isSelected && !isOrganizer ? 'ring-2 ring-blue-500 ring-offset-1' : ''}`}>
                                        {/* Hover Effect */}
                                        <div className="absolute inset-0 rounded-md bg-black opacity-0 group-hover:opacity-5 transition-opacity" />

                                        {/* Count Label */}
                                        {count > 0 && (
                                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                                <span className={`text-[10px] font-bold ${count / maxCount > 0.5 ? 'text-white' : 'text-slate-600'}`}>{count}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ))}
            </div>

            {isOrganizer && (
                <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 shadow-lg flex justify-between items-center bg-opacity-95 backdrop-blur z-50 gap-4">
                    <button
                        onClick={() => setAdminMode(!adminMode)}
                        className={`px-4 py-2 rounded-lg font-bold text-sm transition-all ${adminMode ? 'bg-slate-100 text-slate-600' : 'bg-blue-100 text-blue-700'}`}
                    >
                        {adminMode ? "Back to Voting" : "Switch to Finalize"}
                    </button>

                    {adminMode ? (
                        <button
                            onClick={handleFinalize}
                            disabled={!selectedFinal || isFinalizing}
                            className="flex-1 bg-green-600 text-white px-6 py-2 rounded-xl font-bold hover:bg-green-700 disabled:opacity-50 disabled:grayscale transition-all shadow-md"
                        >
                            {isFinalizing ? "Confirming..." : "Finalize Pulse"}
                        </button>
                    ) : (
                        <div className="text-sm text-slate-500">
                            Voting Mode Active
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
