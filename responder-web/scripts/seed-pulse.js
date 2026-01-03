const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Env Vars");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log("Creating Test Pulse...");

    const { data: pulse, error } = await supabase
        .from("pulses")
        .insert({
            organizer_id: "test-script",
            title: "Friday Drinks (Test)",
            view_type: "7-day",
            timezone: "America/New_York",
            status: "active"
        })
        .select("id")
        .single();

    if (error) {
        console.error("Error creating pulse:", error);
        return;
    }

    console.log("\nSuccess! Pulse created.");
    console.log(`Pulse ID: ${pulse.id}`);
    console.log(`\n👉 Open this URL to test: http://localhost:3000/pulse/${pulse.id}`);
}

seed();
