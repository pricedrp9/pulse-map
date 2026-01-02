
import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
    try {
        const { pulseId } = await request.json();
        const supabase = await createClient();

        // 1. Fetch Pulse Details
        const { data: pulse } = await supabase.from("pulses").select("title").eq("id", pulseId).single();
        if (!pulse) return NextResponse.json({ error: "Pulse not found" }, { status: 404 });

        // 2. Fetch Participants with Emails
        const { data: participants } = await supabase
            .from("participants")
            .select("name, email")
            .eq("pulse_id", pulseId)
            .not("email", "is", null);

        // 3. "Send" Emails (Mock)
        console.log(`[📧 EMAIL SERVICE] Finalizing Pulse: "${pulse.title}"`);
        if (participants && participants.length > 0) {
            participants.forEach((p: { name: any; email: any }) => {
                console.log(`   -> Sending notification to ${p.name} <${p.email}>`);
            });
            console.log(`[✅ EMAIL SERVICE] Sent ${participants.length} notifications.`);
        } else {
            console.log(`[ℹ️ EMAIL SERVICE] No participants with emails found.`);
        }

        return NextResponse.json({ success: true, count: participants?.length || 0 });

    } catch (e) {
        console.error("Failed to send notifications:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
