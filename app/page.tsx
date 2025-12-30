"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { TimeZone } from "@/lib/time";
import Link from "next/link";

export default function Home() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [viewType, setViewType] = useState<"1-day" | "7-day" | "14-day" | "month" | "3-months">("7-day");
  const [pollMode, setPollMode] = useState<"times" | "dates">("times");
  // Default to today
  const [startDate, setStartDate] = useState(new Date().toISOString().split("T")[0]);
  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!title.trim()) return;
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
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-50 p-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-5xl font-extrabold text-blue-600 mb-2 tracking-tight">Pulse Map</h1>
        <p className="text-xl text-slate-600 mb-12">
          Find the perfect time, instantly.
        </p>

        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
          <label className="block text-left text-sm font-bold text-slate-900 uppercase tracking-wide mb-2" htmlFor="title">
            Event Title
          </label>
          <input
            id="title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Friday Drinks, Team Sync..."
            className="w-full mb-6 rounded-xl border border-slate-300 px-4 py-4 text-lg font-bold text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:ring-blue-500"
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            suppressHydrationWarning
          />

          <label className="block text-left text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">
            Poll Mode
          </label>
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setPollMode("times")}
              className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${pollMode === "times"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                }`}
            >
              Specific Times
            </button>
            <button
              onClick={() => setPollMode("dates")}
              className={`flex-1 py-2 rounded-lg text-sm font-bold border transition-all ${pollMode === "dates"
                ? "bg-slate-900 text-white border-slate-900"
                : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                }`}
            >
              Dates Only
            </button>
          </div>

          <label className="block text-left text-sm font-bold text-slate-900 uppercase tracking-wide mb-2">
            Timeframe
          </label>
          <div className="grid grid-cols-5 gap-2 mb-6">
            {['1-day', '7-day', '14-day', 'month', '3-months'].map((vt) => (
              <button
                key={vt}
                onClick={() => setViewType(vt as any)}
                className={`py-2 px-1 rounded-lg text-xs md:text-sm font-bold border transition-all ${viewType === vt
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'
                  }`}
              >
                {vt === '1-day' ? 'Day' : vt === '7-day' ? 'Week' : vt === '14-day' ? '2 Wks' : vt === 'month' ? 'Month' : '3 Months'}
              </button>
            ))}
          </div>

          <label className="block text-left text-sm font-bold text-slate-900 uppercase tracking-wide mb-2" htmlFor="startDate">
            Start Date
          </label>
          <input
            id="startDate"
            type="date"
            value={startDate}
            min={new Date().toISOString().split("T")[0]}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full mb-8 rounded-xl border border-slate-300 px-4 py-4 text-lg font-bold text-slate-900 focus:border-blue-500 focus:ring-blue-500"
          />

          <button
            onClick={handleCreate}
            disabled={loading || !title.trim()}
            className="w-full rounded-xl bg-blue-600 py-4 text-lg font-bold text-white shadow-lg transition hover:bg-blue-700 disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98]"
          >
            {loading ? "Creating..." : "Start a Pulse"}
          </button>
        </div >

        <p className="mt-8 text-sm text-slate-400">
          No sign-up required. Just share the link.
        </p>
      </div >
    </div >
  );
}
