import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state"); // Staff ID
        
        if (!code) {
            return NextResponse.json({ error: "No code provided" }, { status: 400 });
        }

        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const redirectUri = `${process.env.NEXT_PUBLIC_SITE_URL}/api/support/channels/gmail/callback`;

        if (!clientId || !clientSecret) {
            return NextResponse.json({ error: "Google OAuth not configured" }, { status: 500 });
        }

        // Exchange code for tokens
        const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                code,
                client_id: clientId,
                client_secret: clientSecret,
                redirect_uri: redirectUri,
                grant_type: "authorization_code",
            })
        });

        const tokens = await tokenRes.json();
        
        if (!tokens.access_token) {
            throw new Error(`Failed to exchange token: ${JSON.stringify(tokens)}`);
        }

        // Get user profile
        const profileRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
            headers: { Authorization: `Bearer ${tokens.access_token}` }
        });
        const profile = await profileRes.json();

        const sAdmin = supabaseAdmin();
        
        // Save to support_channels
        const { error } = await sAdmin.from("support_channels").upsert({
            channel_type: "gmail",
            external_account_id: profile.id,
            display_name: profile.email,
            status: "connected",
            configuration_metadata: {
                email: profile.email,
                picture: profile.picture,
                tokens: {
                    access_token: tokens.access_token,
                    refresh_token: tokens.refresh_token,
                    expiry_date: Date.now() + tokens.expires_in * 1000
                }
            },
            created_by: state || null,
            updated_by: state || null
        }, { onConflict: "channel_type,external_account_id" });

        if (error) throw error;

        // Optionally, call watch endpoint here for pub/sub push notifications
        
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/settings/channels?success=true`);
    } catch (e: any) {
        console.error("Gmail OAuth Error:", e);
        return NextResponse.redirect(`${process.env.NEXT_PUBLIC_SITE_URL}/settings/channels?error=${encodeURIComponent(e.message)}`);
    }
}
