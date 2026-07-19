import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifySupportSession } from "@/lib/supportAuth";

export async function GET(req: NextRequest) {
    try {
        const session = await verifySupportSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/support/channels/gmail/callback`;
        
        if (!clientId) {
            return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 });
        }

        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.searchParams.append("client_id", clientId);
        authUrl.searchParams.append("redirect_uri", redirectUri);
        authUrl.searchParams.append("response_type", "code");
        authUrl.searchParams.append("scope", "https://www.googleapis.com/auth/gmail.modify");
        authUrl.searchParams.append("access_type", "offline");
        authUrl.searchParams.append("prompt", "consent");
        authUrl.searchParams.append("state", session.staffId); // Pass staff ID to callback

        return NextResponse.redirect(authUrl.toString());
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
