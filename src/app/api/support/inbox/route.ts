import { NextRequest, NextResponse } from "next/server";
import { verifySupportSession } from "@/lib/supportAuth";
import { getConversations } from "@/lib/support/queries";
import { apiSuccess, apiError } from "@/lib/api-utils";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const session = await verifySupportSession();
    if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);

    const searchParams = req.nextUrl.searchParams;
    const filters = {
      status: searchParams.get('status') || 'all',
      priority: searchParams.get('priority') || 'all',
    };

    const sAdmin = require("@/lib/supabase").supabaseAdmin();
    const { data: staffData } = await sAdmin
        .from("support_staff_profiles")
        .select("role:support_roles(name), support_team_members(team_id)")
        .eq("id", session.staffId)
        .single();

    const role = (staffData?.role as any)?.name || 'agent';
    const teamIds = staffData?.support_team_members?.map((tm: any) => tm.team_id) || [];

    const conversations = await getConversations(filters, session.staffId, role, teamIds);

    return apiSuccess(conversations);
  } catch (error: any) {
    console.error("Inbox GET Error:", error);
    return apiError("INTERNAL_ERROR", error.message || "Internal Server Error", 500);
  }
}
