import React from "react";

interface HowToModalProps {
    isOpen: boolean;
    onClose: () => void;
    isOrganizer?: boolean;
}

export function HowToModal({ isOpen, onClose, isOrganizer }: HowToModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
            <div
                className="bg-white dark:bg-slate-900 w-full max-w-md p-6 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-700 animate-in zoom-in-95 duration-200 relative"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="text-center mb-6">
                    <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/40 rounded-full flex items-center justify-center mx-auto mb-3 text-2xl">
                        👋
                    </div>
                    <h3 className="text-2xl font-black text-slate-800 dark:text-white mb-1">Welcome to Pulse</h3>
                    <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Quick guide to coordinating your team.</p>
                </div>

                {/* Steps */}
                <div className="space-y-4 mb-8">
                    <GuideStep
                        icon="🖱️"
                        title="Mark Availability"
                        desc="Click & Drag (or tap) to paint the times you are free."
                    />
                    <GuideStep
                        icon="✏️"
                        title="Edit"
                        desc="Tap an existing slot again to remove it."
                    />
                    <GuideStep
                        icon="🔥"
                        title="Check the Heatmap"
                        desc="Darker blue means more people are free at that time."
                    />
                    <GuideStep
                        icon="👀"
                        title="See Who's Free"
                        desc="Hover (Desktop) or Long Press (Mobile) to see names."
                    />
                    {isOrganizer && (
                        <GuideStep
                            icon="👑"
                            title="Finalize Event"
                            desc="Use the toolbar at the bottom to enter 'Finalize Mode', pick the best time, and confirm."
                        />
                    )}
                </div>

                {/* Action */}
                <button
                    onClick={onClose}
                    className="w-full py-3.5 rounded-xl bg-sky-600 hover:bg-sky-500 text-white font-bold shadow-lg shadow-sky-200 dark:shadow-none transition-all active:scale-95"
                >
                    Got it, let's go!
                </button>
            </div>
        </div>
    );
}

function GuideStep({ icon, title, desc }: { icon: string, title: string, desc: string }) {
    return (
        <div className="flex items-start gap-4 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
            <span className="text-xl flex-shrink-0 mt-0.5">{icon}</span>
            <div>
                <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200">{title}</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{desc}</p>
            </div>
        </div>
    );
}
