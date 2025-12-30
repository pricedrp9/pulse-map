const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const pulseId = "8ed256db-448c-4385-83ae-9c517c2f1638"; // The New Test Pulse

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Env Vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function finalize() {
    console.log(`Finalizing Pulse: ${pulseId}...`);

    // Finalize for tomorrow at 6 PM
    const now = new Date();
    const start = new Date(now);
    start.setDate(now.getDate() + 1);
    start.setHours(18, 0, 0, 0);

    const end = new Date(start);
    end.setHours(22, 0, 0, 0);

    const { error } = await supabase
        .from("pulses")
        .update({
            status: "confirmed",
            finalized_start: start.toISOString(),
            finalized_end: end.toISOString()
        })
        .eq("id", pulseId);

    if (error) {
        console.error("Error finalizing:", error);
        return;
    }

    console.log("\nSuccess! Pulse confirmed.");
    console.log("👉 Refresh your browser to see the 'It's Official' screen.");
}

finalize();
