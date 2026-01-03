
import { createClient } from "@/utils/supabase/server";
import { Metadata } from "next";
import PulseClientPage from "./ClientPage";

type Props = {
    params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { id } = await params;

    // Create supabase client for server-side fetching
    const supabase = await createClient();

    // Fetch minimal data needed for metadata
    const { data: pulse } = await supabase
        .from("pulses")
        .select("title")
        .eq("id", id)
        .single();

    const title = pulse?.title || "Social Event";

    return {
        title: `Join "${title}" on Pulse Map`,
        description: "Vote on your availability for this event.",
        openGraph: {
            title: `Join "${title}" on Pulse Map`,
            description: "Vote on your availability for this event.",
        },
    };
}

export default function Page() {
    return <PulseClientPage />;
}
