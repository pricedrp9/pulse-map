import React from 'react';

interface OrganizerToolbarProps {
    adminMode: boolean;
    setAdminMode: (mode: boolean) => void;
    handleFinalize: () => void;
    isFinalizing: boolean;
    selectedFinalSize: number;
}

export function OrganizerToolbar({ adminMode, setAdminMode, handleFinalize, isFinalizing, selectedFinalSize }: OrganizerToolbarProps) {
    return (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[90%] max-w-md p-2 bg-white/80 backdrop-blur-xl border border-white/40 shadow-2xl rounded-full flex justify-between items-center z-50 gap-2 ring-1 ring-black/5">
            <button
                onClick={() => setAdminMode(!adminMode)}
                className={`px-6 py-3 rounded-full font-bold text-sm transition-all duration-300 ${adminMode ? 'bg-slate-100 text-slate-500 hover:bg-slate-200' : 'bg-sky-50 text-sky-600 hover:bg-sky-100'}`}
            >
                {adminMode ? "Cancel" : "Manage"}
            </button>

            {adminMode ? (
                <button
                    onClick={handleFinalize}
                    disabled={selectedFinalSize === 0 || isFinalizing}
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-full font-bold hover:bg-blue-700 disabled:opacity-50 disabled:grayscale transition-all shadow-lg shadow-blue-600/30"
                >
                    {isFinalizing ? "Saving..." : `Pick (${selectedFinalSize})`}
                </button>
            ) : (
                <div className="flex-1 text-center text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Voting Active
                </div>
            )}
        </div>
    );
}
