import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifySupportSession } from "@/lib/supportAuth";
import { apiError, apiSuccess } from "@/lib/api-utils";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const session = await verifySupportSession();
        if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);

        const { data: tags, error } = await supabaseAdmin()
            .from("support_tags")
            .select("*")
            .order("name", { ascending: true });

        if (error) throw error;
        return apiSuccess(tags);
    } catch (e: any) {
        return apiError("INTERNAL_ERROR", e.message, 500);
    }
}

export async function POST(req: NextRequest) {
    try {
        const session = await verifySupportSession();
        if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);

        const { name, color } = await req.json();
        if (!name) return apiError("BAD_REQUEST", "Tag name is required", 400);

        const { data: tag, error } = await supabaseAdmin()
            .from("support_tags")
            .insert({ name, color: color || '#475569' })
            .select()
            .single();

        if (error) {
            if (error.code === '23505') return apiError("CONFLICT", "Tag already exists", 409);
            throw error;
        }

        return apiSuccess(tag);
    } catch (e: any) {
        return apiError("INTERNAL_ERROR", e.message, 500);
    }
}
