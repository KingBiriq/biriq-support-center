import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { createSupportSession } from "@/lib/supportAuth";

export async function POST(req: Request) {
  try {
    const { access_token } = await req.json();
    if (!access_token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const s = supabaseAdmin();
    const { data: { user }, error } = await s.auth.getUser(access_token);
    
    if (error || !user) {
        return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { data: profile } = await s
        .from("profiles")
        .select("role, full_name")
        .eq("id", user.id)
        .single();

    if (!profile) return NextResponse.json({ error: "Profile missing" }, { status: 401 });

    const rawRole = profile.role || "viewer";
    let mappedRole = "viewer";
    const lowerRole = rawRole.toLowerCase().replace(/\s+/g, "");
    
    if (lowerRole === "superadmin" || lowerRole === "super_admin") mappedRole = "super_admin";
    else if (lowerRole === "admin") mappedRole = "admin";
    else if (lowerRole === "manager") mappedRole = "manager";
    else if (lowerRole === "support" || lowerRole === "agent") mappedRole = "agent";
    else if (lowerRole === "finance") mappedRole = "finance";
    else if (lowerRole === "orderprocessor" || lowerRole === "order_processor") mappedRole = "order_processor";

    // Lookup mapped role
    const { data: supportRole } = await s.from("support_roles").select("id").eq("name", mappedRole).single();
    
    if (!supportRole) {
        console.error("Login Error: Support role not found for", mappedRole);
        return NextResponse.json({ error: "Unknown role mapping" }, { status: 403 });
    }

    // Sync Staff Profile
    const { data: existingStaff } = await s.from("support_staff_profiles").select("id").eq("id", user.id).single();
    
    if (!existingStaff) {
        await s.from("support_staff_profiles").insert({
            id: user.id,
            full_name: profile.full_name || user.email?.split('@')[0] || "Unknown",
            username: user.email || `user_${Date.now()}`,
            role_id: supportRole.id,
            account_status: "active"
        });
        
        await s.from("support_audit_logs").insert({
            staff_id: user.id,
            action: "staff_onboarded",
            details: { mapped_role: mappedRole }
        });
    } else {
        await s.from("support_staff_profiles").update({ role_id: supportRole.id }).eq("id", user.id);
    }

    await createSupportSession(user.id, mappedRole);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
