import React from 'react';
import { createClient } from "@/utils/supabase/client";

interface ConfirmedViewProps {
    pulse: any;
    participantId?: string;
    isOrganizer?: boolean;
}

export function ConfirmedView({ pulse, isOrganizer }: ConfirmedViewProps) {
    const supabase = createClient();
    // Check for new Multi-Select format first, otherwise fall back to legacy single slot
    const selections = pulse.finalized_selection || (pulse.finalized_start ? [{ start: pulse.finalized_start, end: pulse.finalized_end }] : []);

    if (selections.length === 0) return <div className="p-4">Loading details...</div>;

    const handleDownloadCalendar = () => {
        let icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//PulseMap//EN
CALSCALE:GREGORIAN
METHOD:PUBLISH
`;

        selections.forEach((sel: any) => {
            const start = new Date(sel.start).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            const end = new Date(sel.end).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
            const uid = crypto.randomUUID();

            icsContent += `BEGIN:VEVENT
UID:${uid}
SUMMARY:${pulse.title || "Pulse Event"}
DTSTART:${start}
DTEND:${end}
DESCRIPTION:Confirmed via Pulse Map.
STATUS:CONFIRMED
END:VEVENT
`;
        });

        icsContent += `END:VCALENDAR`;

        const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
        const link = document.createElement("a");
        link.href = window.URL.createObjectURL(blob);
        link.setAttribute("download", `${pulse.title || "event"}.ics`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleReOpen = async () => {
        if (!confirm("Are you sure? This will un-finalize the event and allow everyone to vote again.")) return;

        await supabase.from("pulses").update({
            status: "active",
            finalized_selection: null,
            finalized_start: null,
            finalized_end: null
        }).eq("id", pulse.id);

        // Page should auto-reload via realtime subscription in parent
    };

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-green-50 dark:bg-slate-900 p-6 text-center transition-colors">
            <div className="bg-white dark:bg-slate-800 p-8 rounded-2xl shadow-xl max-w-md w-full border border-green-100 dark:border-green-900/30 max-h-screen overflow-y-auto transition-colors">
                <div className="mb-6">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                        <svg className="h-8 w-8 text-green-600 dark:text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="mt-4 text-2xl font-bold text-slate-800 dark:text-white">It's Official!</h1>
                    <p className="text-slate-500 dark:text-slate-400">{pulse.title || "Social Event"}</p>
                </div>

                <div className="space-y-4 mb-6">
                    {selections.map((sel: any, i: number) => {
                        const s = new Date(sel.start);
                        const e = new Date(sel.end);
                        return (
                            <div key={i} className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-100 dark:border-slate-700">
                                <p className="text-sm font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Option {i + 1}</p>
                                <div className="mt-2 text-slate-900 dark:text-white">
                                    <p className="text-lg font-bold">
                                        {s.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                                    </p>
                                    <p className="text-xl font-extrabold text-blue-600 dark:text-blue-400 mt-1">
                                        {/* For Dates Mode, show "All Day" or similar if needed, otherwise show time range */}
                                        {pulse.mode === 'dates'
                                            ? "All Day"
                                            : `${s.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} - ${e.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`
                                        }
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="space-y-3">
                    <button
                        onClick={handleDownloadCalendar}
                        className="w-full rounded-xl bg-slate-900 dark:bg-sky-600 py-3.5 font-bold text-white shadow-md hover:bg-slate-800 dark:hover:bg-sky-500 hover:scale-[1.02] transition-all"
                    >
                        Add to Calendar (.ics)
                    </button>

                    {isOrganizer && (
                        <button
                            onClick={handleReOpen}
                            className="w-full rounded-xl bg-white dark:bg-transparent border-2 border-slate-100 dark:border-slate-700 py-3.5 font-bold text-slate-500 dark:text-slate-400 hover:text-red-500 hover:border-red-100 dark:hover:border-red-900 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors"
                        >
                            Re-Open Voting
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
