"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { TimeZone } from "@/lib/time";
import Link from "next/link";

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
    <div className="min-h-screen flex items-center justify-center p-6 bg-sky-50">
      <div className="w-full max-w-lg relative">
        <div className="absolute top-0 right-0 -mt-16">
          <Link href="/dashboard" className="text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            My History
          </Link>
        </div>

        <div className="text-center mb-10">
          <h1 className="text-5xl font-black tracking-tighter text-slate-900 mb-4 bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
            Pulse Map
          </h1>
          <p className="text-lg text-slate-600 font-medium">
            Coordinate time with anyone, anywhere.
          </p>
        </div>

        <div className="bg-white p-6 md:p-8 rounded-[2rem] shadow-2xl shadow-sky-100 border border-sky-50">
          <div className="space-y-6">
            {/* Title Input */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 pl-4">Event Name</label>
              <input
                placeholder="e.g. Q4 Planning Offsite"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-lg font-bold text-slate-800 placeholder:text-slate-300 focus:ring-4 focus:ring-sky-100 transition-all outline-none"
                suppressHydrationWarning
              />
            </div>

            {/* Mode Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 pl-4">Mode</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-50 rounded-2xl border border-slate-100">
                <button
                  onClick={() => setPollMode('times')}
                  className={`py-3 rounded-xl text-sm font-bold transition-all duration-300 ${pollMode === 'times' ? 'bg-white text-sky-600 shadow-md transform scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Specific Times
                </button>
                <button
                  onClick={() => setPollMode('dates')}
                  className={`py-3 rounded-xl text-sm font-bold transition-all duration-300 ${pollMode === 'dates' ? 'bg-white text-sky-600 shadow-md transform scale-[1.02]' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  Dates Only
                </button>
              </div>
            </div>

            {/* Start Date */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 pl-4">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-slate-50 border-none rounded-2xl px-6 py-4 text-lg font-bold text-slate-800 focus:ring-4 focus:ring-sky-100 transition-all outline-none"
              />
            </div>

            {/* View Type (Duration) */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2 pl-4">Duration</label>
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
                      ? 'bg-sky-500 border-sky-500 text-white shadow-lg shadow-sky-200'
                      : 'bg-white border-slate-100 text-slate-500 hover:border-sky-200 hover:text-sky-600'
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
              className="w-full mt-4 bg-slate-900 text-white rounded-2xl py-5 text-lg font-black tracking-wide shadow-xl hover:bg-black hover:scale-[1.02] active:scale-95 disabled:opacity-50 disabled:scale-100 transition-all duration-300"
            >
              {loading ? "Creating..." : "Launch Pulse"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
