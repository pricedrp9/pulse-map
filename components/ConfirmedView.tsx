import React from 'react';

interface ConfirmedViewProps {
    pulse: any;
    participantId?: string;
}

export function ConfirmedView({ pulse }: ConfirmedViewProps) {
    // Supabase returns timestamps as ISO strings in UTC.
    // The browser's Date constructor automatically converts UTC ISO strings to Local Time.
    const start = pulse.finalized_start ? new Date(pulse.finalized_start) : null;
    const end = pulse.finalized_end ? new Date(pulse.finalized_end) : null;

    if (!start || !end) return <div className="p-4">Loading details...</div>;

    return (
        <div className="flex min-h-screen flex-col items-center justify-center bg-green-50 p-6 text-center">
            <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-green-100">
                <div className="mb-6">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                        <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h1 className="mt-4 text-2xl font-bold text-slate-800">It's Official!</h1>
                    <p className="text-slate-500">{pulse.title || "Social Event"}</p>
                </div>

                <div className="bg-slate-50 p-4 rounded-xl mb-6 border border-slate-100">
                    <p className="text-sm font-semibold text-slate-400 uppercase tracking-wide">Finalized Time</p>
                    <div className="mt-2">
                        <p className="text-lg font-bold text-slate-900">
                            {start.toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
                        </p>
                        <p className="text-xl font-extrabold text-blue-600 mt-1">
                            {start.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })} - {end.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => alert("Calendar Integration Coming Soon!")}
                    className="w-full rounded-xl bg-slate-900 py-3.5 font-bold text-white shadow-md hover:bg-slate-800"
                >
                    Add to Calendar
                </button>
            </div>
        </div>
    );
}
