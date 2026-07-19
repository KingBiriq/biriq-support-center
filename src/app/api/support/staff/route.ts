import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifySupportSession } from "@/lib/supportAuth";
import { apiError, apiSuccess } from "@/lib/api-utils";

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const session = await verifySupportSession();
        if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);

        const sAdmin = supabaseAdmin();
        const { data: staff, error } = await sAdmin
            .from("support_staff_profiles")
            .select(`
                id, full_name, username, account_status,
                support_roles(name),
                support_team_members(team_id, support_teams(name))
            `)
            .order("full_name", { ascending: true });

        const { data: teams } = await sAdmin.from("support_teams").select("*").order("name");

        if (error) throw error;

        // Map the results to the expected format
        const formattedStaff = staff?.map((s: any) => ({
            id: s.id,
            full_name: s.full_name,
            email: s.username,
            role: s.support_roles?.name?.replace('support_', ''),
            status: s.account_status,
            support_team_members: s.support_team_members
        }));

        return apiSuccess({ staff: formattedStaff, teams });
    } catch (e: any) {
        return apiError("INTERNAL_ERROR", e.message, 500);
    }
}

export async function PATCH(req: NextRequest) {
    try {
        const session = await verifySupportSession();
        if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);
        
        const body = await req.json();
        const { id, account_status, full_name, password, role, team_ids } = body;
        
        if (!id) return apiError("BAD_REQUEST", "Missing id", 400);

        const sAdmin = supabaseAdmin();
        
        // 1. If only updating status (simple toggle)
        if (account_status !== undefined && !full_name && !role) {
            const { error } = await sAdmin.from("support_staff_profiles").update({ account_status }).eq("id", id);
            if (error) throw error;
            return apiSuccess({ success: true });
        }

        // 2. Full edit
        // Update password if provided
        if (password) {
            const { error: authErr } = await sAdmin.auth.admin.updateUserById(id, { password, user_metadata: { full_name } });
            if (authErr) throw authErr;
        }

        // Get role ID if role is changed
        let role_id;
        if (role) {
            const { data: roleData, error: roleErr } = await sAdmin.from("support_roles").select("id").eq("name", role).single();
            if (roleErr || !roleData) return apiError("BAD_REQUEST", "Invalid role specified", 400);
            role_id = roleData.id;
        }

        // Update profile
        const updateData: any = {};
        if (full_name) updateData.full_name = full_name;
        if (role_id) updateData.role_id = role_id;
        if (account_status) updateData.account_status = account_status;

        if (Object.keys(updateData).length > 0) {
            const { error: profileErr } = await sAdmin.from("support_staff_profiles").update(updateData).eq("id", id);
            if (profileErr) throw profileErr;
        }

        // Update teams
        if (team_ids !== undefined) {
            // Delete existing
            await sAdmin.from("support_team_members").delete().eq("staff_id", id);
            // Insert new
            if (team_ids.length > 0) {
                const teamInserts = team_ids.map((team_id: string) => ({ staff_id: id, team_id }));
                await sAdmin.from("support_team_members").insert(teamInserts);
            }
        }
        
        return apiSuccess({ success: true });
    } catch (e: any) {
        return apiError("INTERNAL_ERROR", e.message, 500);
    }
}

export async function DELETE(req: NextRequest) {
    try {
        const session = await verifySupportSession();
        if (!session) return apiError("UNAUTHORIZED", "Unauthorized", 401);
        
        const body = await req.json();
        const { id } = body;
        
        if (!id) return apiError("BAD_REQUEST", "Missing id", 400);

        const sAdmin = supabaseAdmin();
        // Only delete from support_staff_profiles, do NOT delete from auth.users
        // because the user might also be a customer on the store.
        const { error } = await sAdmin.from("support_staff_profiles").delete().eq("id", id);
        
        if (error) throw error;
        return apiSuccess({ success: true });
    } catch (e: any) {
        return apiError("INTERNAL_ERROR", e.message, 500);
    }
}
