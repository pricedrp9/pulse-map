import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
    try {
        const { pulseId } = await request.json();
        const supabase = await createClient();

        // 1. Fetch Pulse Details
        const { data: pulse } = await supabase.from("pulses").select("title, finalized_start, finalized_end").eq("id", pulseId).single();
        if (!pulse) return NextResponse.json({ error: "Pulse not found" }, { status: 404 });

        // Format Date for Email
        const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', month: 'long', day: 'numeric' };
        const timeOptions: Intl.DateTimeFormatOptions = { hour: 'numeric', minute: '2-digit' };

        const start = new Date(pulse.finalized_start);
        const end = new Date(pulse.finalized_end);

        const dateStr = start.toLocaleDateString("en-US", dateOptions);
        const timeStr = `${start.toLocaleTimeString("en-US", timeOptions)} - ${end.toLocaleTimeString("en-US", timeOptions)}`;

        // 2. Fetch Participants with Emails
        const { data: participants } = await supabase
            .from("participants")
            .select("name, email")
            .eq("pulse_id", pulseId)
            .not("email", "is", null);

        // 3. Send Emails via Resend
        if (participants && participants.length > 0) {
            console.log(`[📧 EMAIL SERVICE] Sending to ${participants.length} recipients...`);

            // Send in parallel
            await Promise.all(participants.map(async (p: { name: string; email: string }) => {
                try {
                    await resend.emails.send({
                        from: 'Pulse Map <onboarding@resend.dev>', // Default for testing, user should verify domain later
                        to: p.email,
                        subject: `It's Official! ${pulse.title} is Confirmed ✅`,
                        html: `
                            <div style="font-family: sans-serif; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
                                <h1 style="color: #0ea5e9;">It's Official!</h1>
                                <p><strong>${pulse.title}</strong> has been confirmed.</p>
                                <div style="background: #f0f9ff; padding: 20px; border-radius: 12px; margin: 20px 0;">
                                    <h2 style="margin: 0; color: #0284c7;">${dateStr}</h2>
                                    <p style="margin: 5px 0 0 0; font-size: 18px; color: #555;">${timeStr}</p>
                                </div>
                                <p>See you there!</p>
                                <p style="font-size: 12px; color: #888; margin-top: 30px;">Pulse Map - Coordinate time with anyone.</p>
                            </div>
                        `
                    });
                    console.log(`   -> Sent to ${p.email}`);
                } catch (emailError) {
                    console.error(`   -> Failed to send to ${p.email}`, emailError);
                }
            }));

            console.log(`[✅ EMAIL SERVICE] Completed.`);
        } else {
            console.log(`[ℹ️ EMAIL SERVICE] No participants with emails found.`);
        }

        return NextResponse.json({ success: true, count: participants?.length || 0 });

    } catch (e) {
        console.error("Failed to send notifications:", e);
        return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
}
