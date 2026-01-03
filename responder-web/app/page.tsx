"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { TimeZone } from "@/lib/time";
import Link from "next/link";
import { ThemeToggle } from "@/components/ThemeToggle";

export default function Home() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [viewType, setViewType] = useState<"1-day" | "7-day" | "14-day" | "month" | "3-months">("7-day");
  const [pollMode, setPollMode] = useState<"times" | "dates">("times");
  // Default to today - initialized in useEffect to avoid hydration mismatch
  const [startDate, setStartDate] = useState("");

  useEffect(() => {
    setStartDate(new Date().toISOString().split("T")[0]);
  }, []);

  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim() || !startDate) return;
    setLoading(true);

    try {
      const supabase = createClient();
      const organizerId = crypto.randomUUID(); // Simple ID for localStorage

      // Use local midnight interpretation to avoid timezone shifts
      // Appending T00:00:00 to YYYY-MM-DD creates a local time Date object,
      // which we then convert to ISO (UTC) to store.
      const startIso = new Date(startDate + 'T00:00:00').toISOString();

      const { data, error } = await supabase
        .from("pulses")
        .insert({
          title: title,
          view_type: viewType,
          start_date: startIso,
          organizer_id: organizerId,
          timezone: TimeZone.getLocal(),
          status: "active",
          mode: pollMode,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Save to localStorage to identify as Organizer later
      const created = JSON.parse(localStorage.getItem("created_pulse_ids") || "[]");
      created.push(data.id);
      localStorage.setItem("created_pulse_ids", JSON.stringify(created));

      // Also save the specific organizer ID just in case we need it
      localStorage.setItem(`pulse_organizer_${data.id}`, organizerId);

      router.push(`/pulse/${data.id}`);
    } catch (e) {
      console.error(e);
      alert("Failed to create Pulse.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-sky-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="w-full max-w-lg relative">
        <div className="absolute top-0 right-0 -mt-16 flex items-center gap-4 z-50">
          <Link href="/dashboard" className="text-sm font-bold text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 transition-colors flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            My History
          </Link>
          <ThemeToggle />
        </div>

        <div className="text-center mb-10">
          <h1 className="text-5xl font-black tracking-tighter text-slate-900 dark:text-white mb-4 bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
            Pulse Map
          </h1>
          <p className="text-lg text-slate-600 dark:text-slate-400 font-medium">
            Coordinate time with anyone, anywhere.
          </p>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-[2rem] shadow-2xl shadow-sky-100 dark:shadow-slate-900 border border-sky-50 dark:border-slate-700 transition-colors duration-300">
          <div className="space-y-6">
            {/* Title Input */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 pl-4">Event Name</label>
              <input
                placeholder="e.g. Q4 Planning Offsite"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl px-6 py-4 text-lg font-bold text-slate-800 dark:text-white placeholder:text-slate-300 dark:placeholder:text-slate-600 focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900 transition-all outline-none"
                suppressHydrationWarning
              />
            </div>

            {/* Mode Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 pl-4">Mode</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-700">
                <button
                  onClick={() => setPollMode('times')}
                  className={`py-3 rounded-xl text-sm font-bold transition-all duration-300 ${pollMode === 'times' ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-md transform scale-[1.02]' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                  Specific Times
                </button>
                <button
                  onClick={() => setPollMode('dates')}
                  className={`py-3 rounded-xl text-sm font-bold transition-all duration-300 ${pollMode === 'dates' ? 'bg-white dark:bg-slate-800 text-sky-600 dark:text-sky-400 shadow-md transform scale-[1.02]' : 'text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
                >
                  Dates Only
                </button>
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 pl-4">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-900 border-none rounded-2xl px-6 py-4 text-lg font-bold text-slate-800 dark:text-white focus:ring-4 focus:ring-sky-100 dark:focus:ring-sky-900 transition-all outline-none [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>

            {/* View Type (Duration) */}
            <div>
              <label className="block text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 pl-4">Duration</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: '1-day', label: '1 Day' },
                  { id: '7-day', label: '1 Week' },
                  { id: '14-day', label: '2 Weeks' },
                  { id: 'month', label: '1 Month' },
                  { id: '3-months', label: '3 Months' },
                ].map((opt) => (
                  <button
                    key={opt.id}
                    onClick={() => setViewType(opt.id as "1-day" | "7-day" | "14-day" | "month" | "3-months")}
                    className={`py-3 px-2 rounded-xl text-xs font-bold border transition-all ${viewType === opt.id
                      ? 'bg-sky-500 border-sky-500 text-white shadow-lg shadow-sky-200 dark:shadow-none'
                      : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-sky-200 dark:hover:border-sky-800 hover:text-sky-600 dark:hover:text-sky-400'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleCreate}
              disabled={loading || !title.trim()}
              className="w-full mt-4 bg-slate-900 dark:bg-sky-600 text-white rounded-2xl py-5 text-lg font-black tracking-wide shadow-xl hover:bg-black dark:hover:bg-sky-500 hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all duration-300"
            >
              {loading ? "Creating..." : "Launch Pulse"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
