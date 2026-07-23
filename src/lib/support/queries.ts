import { supabaseAdmin } from "@/lib/supabase";
import { z } from "zod";

export const getConversations = async (filters: any, staffId?: string, role?: string, teamIds?: string[]) => {
  const s = supabaseAdmin();
  let query = s.from("support_conversations").select(`
    *,
    contact:support_contacts(*),
    assignee:support_staff_profiles(*),
    team:support_teams(*),
    support_conversation_tags(support_tags(*))
  `).order("last_message_at", { ascending: false, nullsFirst: false });

  let filterVal = filters.status;
  if (filterVal && filterVal !== 'all') {
    if (['open', 'waiting', 'pending', 'resolved', 'closed', 'snoozed', 'spam'].includes(filterVal)) {
      query = query.eq("status", filterVal);
    } else if (filterVal === 'whatsapp' || filterVal === 'website') {
      query = query.eq("channel_type", filterVal);
    } else if (filterVal === 'mine' && staffId) {
      query = query.eq("assigned_agent_id", staffId);
    } else if (filterVal === 'unassigned') {
      query = query.is("assigned_agent_id", null);
    } else if (filterVal === 'unread') {
      query = query.gt("unread_count", 0);
    }
  }

  if (role !== 'admin' && role !== 'manager' && staffId) {
    if (teamIds && teamIds.length > 0) {
        // Must be assigned to the staff member, OR unassigned but in their team.
        query = query.or(`assigned_agent_id.eq.${staffId},and(assigned_agent_id.is.null,team_id.in.(${teamIds.join(',')}))`);
    } else {
        // If they have no teams, they only see what is directly assigned to them.
        query = query.eq('assigned_agent_id', staffId);
    }
  } else if (role === 'manager' && teamIds && teamIds.length > 0) {
      // Managers see everything in their team
      query = query.in('team_id', teamIds);
  }
  
  const { data, error } = await query;
  if (error) throw error;

  if (data && data.length > 0) {
    // Collect all phone numbers and emails to check registered Biriq Store profiles
    const phones = data.map((c: any) => c.contact?.primary_phone || c.subject?.replace(/\D/g, '')).filter(Boolean);
    const emails = data.map((c: any) => c.contact?.primary_email).filter(Boolean);

    let profilesMap: Record<string, string> = {};
    if (phones.length > 0 || emails.length > 0) {
      const { data: profiles } = await s
        .from("profiles")
        .select("full_name, phone_number, email");

      if (profiles) {
        profiles.forEach((p: any) => {
          if (p.phone_number) profilesMap[p.phone_number.replace(/\D/g, '')] = p.full_name;
          if (p.email) profilesMap[p.email.toLowerCase()] = p.full_name;
        });
      }
    }

    // Attach enriched name if available
    data.forEach((c: any) => {
      const phone = (c.contact?.primary_phone || c.subject || '').replace(/\D/g, '');
      const email = (c.contact?.primary_email || '').toLowerCase();
      const matchedName = profilesMap[phone] || profilesMap[email];

      if (matchedName) {
        if (c.contact) {
          c.contact.full_name = matchedName;
        } else {
          c.support_contacts = { full_name: matchedName, primary_phone: phone };
        }
      }
    });
  }

  return data;
};

export const getMessages = async (conversationId: string) => {
  const { data, error } = await supabaseAdmin()
    .from("support_messages")
    .select("*, sender:support_staff_profiles(*), attachments:support_message_attachments(*)")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
    
  if (error) throw error;
  return data;
};

export const createInternalNote = async (conversationId: string, staffId: string, body: string) => {
  const s = supabaseAdmin();
  
  // 1. Insert message
  const { data: msg, error } = await s.from("support_messages").insert({
    conversation_id: conversationId,
    channel_type: 'internal',
    sender_type: 'staff',
    sender_staff_id: staffId,
    direction: 'internal',
    body,
    is_internal: true,
    status: 'delivered'
  }).select().single();
  
  if (error) throw error;
  
  // 2. Update conversation
  await s.from("support_conversations").update({
    last_message_at: new Date().toISOString()
  }).eq("id", conversationId);
  
  return msg;
};

export const getContacts = async () => {
  const { data, error } = await supabaseAdmin()
    .from("support_contacts")
    .select(`
      *,
      agent:support_staff_profiles(*)
    `)
    .order("created_at", { ascending: false });
    
  if (error) throw error;
  return data;
};
