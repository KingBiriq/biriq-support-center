import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST() {
    try {
        const sAdmin = supabaseAdmin();
        const results = {
            roles: 0,
            permissions: 0,
            role_permissions: 0,
            tags: 0,
            quick_replies: 0,
            errors: [] as string[]
        };

        // 1. Seed Roles
        const rolesToSeed = [
            { name: 'super_admin', description: 'Full system access' },
            { name: 'admin', description: 'Administrative access' },
            { name: 'agent', description: 'Standard support agent' },
            { name: 'manager', description: 'Team manager' }
        ];

        for (const r of rolesToSeed) {
            const { error } = await sAdmin.from('support_roles').upsert({ name: r.name, description: r.description }, { onConflict: 'name' });
            if (error) results.errors.push(`Role ${r.name}: ${error.message}`);
            else results.roles++;
        }

        // 2. Seed Permissions
        const permissionsToSeed = [
            { name: 'conversations.view', description: 'View conversations' },
            { name: 'conversations.reply', description: 'Reply to conversations' },
            { name: 'conversations.assign', description: 'Assign conversations' },
            { name: 'conversations.resolve', description: 'Resolve conversations' },
            { name: 'team.view', description: 'View team members' },
            { name: 'team.manage', description: 'Manage team members' },
            { name: 'orders.view', description: 'View linked orders' },
            { name: 'payments.view', description: 'View linked payments' },
            { name: 'settings.manage', description: 'Manage system settings' },
            { name: 'channels.manage', description: 'Manage support channels' }
        ];

        for (const p of permissionsToSeed) {
            const { error } = await sAdmin.from('support_permissions').upsert({ name: p.name, description: p.description }, { onConflict: 'name' });
            if (error) results.errors.push(`Permission ${p.name}: ${error.message}`);
            else results.permissions++;
        }

        // 3. Seed Role Permissions (Grant all to admin)
        const { data: adminRole } = await sAdmin.from('support_roles').select('id').eq('name', 'admin').single();
        const { data: allPerms } = await sAdmin.from('support_permissions').select('id');
        
        if (adminRole && allPerms) {
            for (const p of allPerms) {
                const { error } = await sAdmin.from('support_role_permissions').upsert({ role_id: adminRole.id, permission_id: p.id }, { onConflict: 'role_id,permission_id' });
                if (error) results.errors.push(`RolePerm: ${error.message}`);
                else results.role_permissions++;
            }
        }

        // 4. Seed Tags
        const tagsToSeed = [
            { name: 'VIP', color: '#ff0000' },
            { name: 'Payment Issue', color: '#ff9900' },
            { name: 'Refund', color: '#cc00cc' },
            { name: 'PUBG Global', color: '#0066cc' },
            { name: 'PUBG Korean', color: '#0099cc' },
            { name: 'eFootball', color: '#00cc66' },
            { name: 'Free Fire', color: '#ff6600' },
            { name: 'Account Support', color: '#666699' },
            { name: 'Complaint', color: '#cc3300' },
            { name: 'Urgent', color: '#ff0000' }
        ];

        for (const t of tagsToSeed) {
            // Check if exists
            const { data: existingTag } = await sAdmin.from('support_tags').select('id').eq('name', t.name).maybeSingle();
            if (!existingTag) {
                const { error } = await sAdmin.from('support_tags').insert({ name: t.name, color: t.color });
                if (error) results.errors.push(`Tag ${t.name}: ${error.message}`);
                else results.tags++;
            }
        }

        // 5. Seed Quick Replies (requires migration to be applied first)
        const quickRepliesToSeed = [
            { shortcut: '/payment', title: 'Payment Issue', body: 'Fadlan nala wadaag sawirka lacag bixintaada (screenshot).', language: 'Somali', category: 'Payments' },
            { shortcut: '/order', title: 'Order Status', body: 'Dalabkaaga waa la wadaa, fadlan inyar sug.', language: 'Somali', category: 'Orders' },
            { shortcut: '/playerid', title: 'Missing Player ID', body: 'Fadlan nala wadaag Player ID-gaaga saxda ah.', language: 'Somali', category: 'General' },
            { shortcut: '/processing', title: 'Processing', body: 'Waan ku guda jirnaa dalabkaaga.', language: 'Somali', category: 'Orders' },
            { shortcut: '/completed', title: 'Completed', body: 'Dalabkaaga waa la dhameystiray. Waad ku mahadsantahay doorashada Biriq Store!', language: 'Somali', category: 'Orders' },
            { shortcut: '/waiting', title: 'Waiting on Customer', body: 'Waxaan sugeynaa jawaabtaada si aan u sii wadno dalabkaaga.', language: 'Somali', category: 'General' },
            { shortcut: '/refund', title: 'Refund Policy', body: 'Lacag celintu waxay qaadan kartaa ilaa 24 saac. Fadlan nala wadaag lambarka xawilaada.', language: 'Somali', category: 'Payments' },
            { shortcut: '/manager', title: 'Transfer to Manager', body: 'Waan u gudbinayaa maamulaha, fadlan inyar sug.', language: 'Somali', category: 'Escalation' }
        ];

        for (const qr of quickRepliesToSeed) {
            // Check if exists
            const { data: existingQR, error: checkErr } = await sAdmin.from('support_quick_replies').select('id').eq('shortcut', qr.shortcut).maybeSingle();
            
            if (checkErr && checkErr.code === '42P01') {
                results.errors.push("Table support_quick_replies does not exist yet. Please run migrations.");
                break;
            }

            if (!existingQR && !checkErr) {
                const { error } = await sAdmin.from('support_quick_replies').insert({
                    shortcut: qr.shortcut,
                    title: qr.title,
                    body: qr.body,
                    language: qr.language,
                    category: qr.category,
                    is_active: true
                });
                if (error) results.errors.push(`QuickReply ${qr.shortcut}: ${error.message}`);
                else results.quick_replies++;
            }
        }

        return NextResponse.json({ success: true, results });
    } catch (error: any) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}
