import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { verifySupportSession } from "@/lib/supportAuth";

export async function POST(req: NextRequest) {
    try {
        const session = await verifySupportSession();
        if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Verify the user is an admin
        const sAdmin = supabaseAdmin();
        const { data: currentStaff, error: staffErr } = await sAdmin
            .from("support_staff_profiles")
            .select("support_roles(name)")
            .eq("id", session.staffId)
            .single();

        const rolesData = currentStaff?.support_roles as any;
        const roleName = Array.isArray(rolesData) ? rolesData[0]?.name : rolesData?.name;

        if (staffErr || !currentStaff || (roleName !== 'super_admin' && roleName !== 'admin')) {
            return NextResponse.json({ error: "Only admins can create staff" }, { status: 403 });
        }

        const body = await req.json();
        const { email, password, full_name, role, team_ids } = body;

        if (!email || !password || !full_name || !role) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        // Get role ID
        const { data: roleData, error: roleErr } = await sAdmin.from("support_roles").select("id").eq("name", role).single();
        if (roleErr || !roleData) {
             return NextResponse.json({ error: "Invalid role specified" }, { status: 400 });
        }

        // 1. Create or Find Auth User
        let userId = null;
        
        // Try to find existing user by email
        const { data: existingUsers } = await sAdmin.auth.admin.listUsers();
        const existingUser = existingUsers.users.find(u => u.email === email);
        
        if (existingUser) {
            userId = existingUser.id;
            // Optionally update their password if provided
            if (password) {
                await sAdmin.auth.admin.updateUserById(userId, { password, user_metadata: { full_name } });
            }
        } else {
            const { data: authUser, error: authErr } = await sAdmin.auth.admin.createUser({
                email,
                password,
                email_confirm: true,
                user_metadata: { full_name }
            });
            if (authErr) throw authErr;
            userId = authUser.user.id;
        }

        // 2. Create Staff Profile
        const { data: profile, error: profileErr } = await sAdmin.from("support_staff_profiles").insert({
            id: userId,
            full_name,
            username: email,
            role_id: roleData.id,
            account_status: "active"
        }).select().single();

        if (profileErr) {
            throw new Error(profileErr.message);
        }

        // 3. Assign to Teams
        if (team_ids && Array.isArray(team_ids) && team_ids.length > 0) {
            const teamInserts = team_ids.map(team_id => ({
                staff_id: userId,
                team_id
            }));
            await sAdmin.from("support_team_members").insert(teamInserts);
        }

        return NextResponse.json({ success: true, data: profile });

    } catch (error: any) {
        console.error("Create Staff Error:", error);
        return NextResponse.json({ error: error.message || "Failed to create staff" }, { status: 500 });
    }
}
