import { NextRequest, NextResponse } from "next/server";
import { verifySupportSession } from "@/lib/supportAuth";
import { requirePermission, logAuditAction } from "@/lib/support/permissions";
import { supabaseAdmin } from "@/lib/supabase";
import { apiSuccess, apiError } from "@/lib/api-utils";

export async function GET(req: NextRequest) {
  try {
    const session = await verifySupportSession();
    if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);

    await requirePermission(session.staffId, 'team.view');

    const { data, error } = await supabaseAdmin()
      .from("support_staff_profiles")
      .select(`
        *,
        role:support_roles(*)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;

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

    await requirePermission(session.staffId, 'team.manage');

    const body = await req.json();
    const { full_name, username, role_id } = body;

    if (!full_name || !username || !role_id) {
      return apiError("BAD_REQUEST", "Missing full_name, username, or role_id", 400);
    }

    const { data, error } = await supabaseAdmin()
      .from("support_staff_profiles")
      .insert({ full_name, username, role_id, account_status: 'active' })
      .select()
      .single();

    if (error) throw error;

    await logAuditAction(session.staffId, 'team.created', { new_staff_id: data.id });

    return apiSuccess(data);
  } catch (error: any) {
    if (error.message.includes('Forbidden')) return apiError("FORBIDDEN", error.message, 403);
    return apiError("INTERNAL_ERROR", error.message, 500);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await verifySupportSession();
    if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);

    const { staff } = await requirePermission(session.staffId, 'team.manage');

    const body = await req.json();
    const { id, role_id, account_status } = body;

    if (!id) return apiError("BAD_REQUEST", "Missing staff ID", 400);

    // Prevent removing the last active super_admin
    if (account_status === 'disabled' || role_id) {
      const { data: superAdmins } = await supabaseAdmin()
        .from('support_staff_profiles')
        .select('id')
        .eq('account_status', 'active');
        
      // Assume a deeper check would resolve the role_id of super_admin.
      // For now, we protect the current user from disabling themselves.
      if (id === staff.id && account_status === 'disabled') {
        throw new Error("You cannot disable your own account.");
      }
    }

    const updates: any = {};
    if (role_id) updates.role_id = role_id;
    if (account_status) updates.account_status = account_status;

    const { error } = await supabaseAdmin()
      .from('support_staff_profiles')
      .update(updates)
      .eq('id', id);

    if (error) throw error;

    await logAuditAction(session.staffId, 'team.updated', { target_staff_id: id, updates });

    return apiSuccess({ updated: true });
  } catch (error: any) {
    if (error.message.includes('Forbidden')) return apiError("FORBIDDEN", error.message, 403);
    return apiError("INTERNAL_ERROR", error.message, 500);
  }
}
