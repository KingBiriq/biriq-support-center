import { NextRequest, NextResponse } from "next/server";
import { verifySupportSession } from "@/lib/supportAuth";
import { requirePermission, logAuditAction } from "@/lib/support/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySupportSession();
    if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);

    await requirePermission(session.staffId, 'quick_replies.view');

    const s = supabaseAdmin();
    const { data, error } = await s
      .from('support_quick_replies')
      .select('*')
      .order('shortcut', { ascending: true });

    // The table might not exist if migration isn't applied yet, so handle PGRST205
    if (error) {
      if (error.code === 'PGRST205') return apiSuccess([]); // Table doesn't exist yet
      throw error;
    }

    return apiSuccess(data);
  } catch (error: any) {
    if (error.message.includes('Forbidden')) return apiError("FORBIDDEN", error.message, 403);
    return apiError("INTERNAL_ERROR", error.message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await verifySupportSession();
    if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);

    await requirePermission(session.staffId, 'quick_replies.manage');

    const body = await req.json();
    if (!body.shortcut || !body.title || !body.body) {
      return apiError("BAD_REQUEST", "Missing required fields", 400);
    }

    const { data, error } = await supabaseAdmin()
      .from('support_quick_replies')
      .insert({
        shortcut: body.shortcut.startsWith('/') ? body.shortcut : `/${body.shortcut}`,
        title: body.title,
        body: body.body,
        image_url: body.image_url || null,
        created_by: session.staffId,
        updated_by: session.staffId,
        language: body.language || 'so',
      })
      .select()
      .single();

    if (error) throw error;

    await logAuditAction(session.staffId, 'quick_reply.created', { quick_reply_id: data.id });

    return apiSuccess(data);
  } catch (error: any) {
    if (error.message.includes('Forbidden')) return apiError("FORBIDDEN", error.message, 403);
    return apiError("INTERNAL_ERROR", error.message, 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await verifySupportSession();
    if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);

    await requirePermission(session.staffId, 'quick_replies.manage');

    const body = await req.json();
    if (!body.id) return apiError("BAD_REQUEST", "Missing ID", 400);

    const updateData: any = { updated_by: session.staffId };
    if (body.shortcut) updateData.shortcut = body.shortcut.startsWith('/') ? body.shortcut : `/${body.shortcut}`;
    if (body.title) updateData.title = body.title;
    if (body.body) updateData.body = body.body;
    if (body.image_url !== undefined) updateData.image_url = body.image_url || null;
    if (body.language) updateData.language = body.language;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;

    const { data, error } = await supabaseAdmin()
      .from('support_quick_replies')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single();

    if (error) throw error;

    await logAuditAction(session.staffId, 'quick_reply.updated', { quick_reply_id: data.id });

    return apiSuccess(data);
  } catch (error: any) {
    if (error.message.includes('Forbidden')) return apiError("FORBIDDEN", error.message, 403);
    return apiError("INTERNAL_ERROR", error.message, 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const session = await verifySupportSession();
    if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);

    await requirePermission(session.staffId, 'quick_replies.manage');

    const id = req.nextUrl.searchParams.get('id');
    if (!id) return apiError("BAD_REQUEST", "Missing ID", 400);

    const { error } = await supabaseAdmin()
      .from('support_quick_replies')
      .delete()
      .eq('id', id);

    if (error) throw error;

    await logAuditAction(session.staffId, 'quick_reply.deleted', { quick_reply_id: id });

    return apiSuccess({ deleted: true });
  } catch (error: any) {
    if (error.message.includes('Forbidden')) return apiError("FORBIDDEN", error.message, 403);
    return apiError("INTERNAL_ERROR", error.message, 500);
  }
}
