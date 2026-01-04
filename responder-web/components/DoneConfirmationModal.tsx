"use client";

import React from "react";

interface DoneConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
}

export function DoneConfirmationModal({ isOpen, onClose, onConfirm }: DoneConfirmationModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-sm p-6 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
                <div className="text-center mb-6">
                    <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Ready to submit?</h3>
                    <p className="text-slate-600 dark:text-slate-400">
                        The organizer will be notified that you're finished.
                    </p>
                    <p className="text-sm text-slate-500 dark:text-slate-500 mt-2 bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50">
                        Don't worry, you can still come back and edit your availability later!
                    </p>
                </div>

                <div className="flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-xl font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                    >
                        Keep Editing
                    </button>
                    <button
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }}
                        className="flex-1 py-3 rounded-xl font-bold bg-slate-900 dark:bg-sky-600 text-white hover:bg-black dark:hover:bg-sky-500 transition-colors shadow-lg shadow-sky-500/20"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}
