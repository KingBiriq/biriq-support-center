import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifySupportSession } from "@/lib/supportAuth";
import { apiError, apiSuccess } from "@/lib/api-utils";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await verifySupportSession();
        if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);

        const { tagId } = await req.json();
        const conversationId = params.id;

        if (!tagId) return apiError("BAD_REQUEST", "tagId is required", 400);

        const { error } = await supabaseAdmin()
            .from("support_conversation_tags")
            .insert({ conversation_id: conversationId, tag_id: tagId });

        if (error && error.code !== '23505') throw error; // Ignore duplicate if already tagged

        return apiSuccess({ success: true });
    } catch (e: any) {
        return apiError("INTERNAL_ERROR", e.message, 500);
    }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
    try {
        const session = await verifySupportSession();
        if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);

        const { tagId } = await req.json();
        const conversationId = params.id;

        if (!tagId) return apiError("BAD_REQUEST", "tagId is required", 400);

        const { error } = await supabaseAdmin()
            .from("support_conversation_tags")
            .delete()
            .match({ conversation_id: conversationId, tag_id: tagId });

        if (error) throw error;

        return apiSuccess({ success: true });
    } catch (e: any) {
        return apiError("INTERNAL_ERROR", e.message, 500);
    }
}
