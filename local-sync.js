const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const envFile = fs.readFileSync('.env.local', 'utf8');
const getEnv = (key) => {
  const match = envFile.match(new RegExp(`^${key}=(.*)`, 'm'));
  return match ? match[1].trim() : null;
};

const supabaseUrl = getEnv('NEXT_PUBLIC_SUPABASE_URL');
const supabaseKey = getEnv('SUPABASE_SERVICE_ROLE_KEY');

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

console.log("🚀 Starting Biriq Support Local Sync...");
console.log("Listening for new messages on whatsapp_messages table...");

// Polling fallback since Realtime might not be enabled for whatsapp_messages
let lastCheckedAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();

async function pollMessages() {
  try {
    const { data: newMessages, error } = await supabase
      .from('whatsapp_messages')
      .select('*')
      .gt('created_at', lastCheckedAt)
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (newMessages && newMessages.length > 0) {
      console.log(`📥 Found ${newMessages.length} new WhatsApp messages! Syncing to Unified Inbox...`);
      
      for (const msg of newMessages) {
        lastCheckedAt = msg.created_at;

        // Skip outgoing messages, only sync incoming customer messages
        if (msg.direction !== 'incoming') continue;

        const customerPhone = msg.from_number;
        const customerName = msg.contact_name || customerPhone;

        // Idempotency: skip if already synced
        if (msg.message_id) {
          const { data: existing } = await supabase.from('support_messages').select('id').eq('external_message_id', msg.message_id).single();
          if (existing) { console.log(`⏭️ Already synced: ${msg.message_id}`); continue; }
        }

        // 1. Get or Create Contact
        let { data: contact } = await supabase.from('support_contacts').select('*').eq('primary_phone', customerPhone).single();
        
        if (!contact) {
          const { data: newContact, error: contactErr } = await supabase.from('support_contacts').insert({
            primary_phone: customerPhone,
            display_name: customerName
          }).select().single();
          if (contactErr) console.error("Contact Insert Error:", contactErr);
          contact = newContact;
        }

        if (!contact) continue;

        // 2. Get or Create Conversation (no support_channels lookup needed)
        let { data: conversation } = await supabase.from('support_conversations').select('*').eq('support_contact_id', contact.id).eq('status', 'open').single();

        if (!conversation) {
          const { data: newConv } = await supabase.from('support_conversations').insert({
            support_contact_id: contact.id,
            status: 'open',
            priority: 'normal',
            channel_type: 'whatsapp',
            last_message_at: new Date().toISOString(),
            customer_service_window_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
          }).select().single();
          conversation = newConv;
        }

        if (!conversation) continue;

        // 3. Insert Message
        const { data: supportMsg, error: msgErr } = await supabase.from('support_messages').insert({
          conversation_id: conversation.id,
          sender_type: 'customer',
          direction: 'inbound',
          body: msg.message_text || (msg.media_type ? `[${msg.media_type}]` : '[Media Message]'),
          external_message_id: msg.message_id,
          idempotency_key: msg.message_id ? `wa_inc_${msg.message_id}` : undefined,
          status: 'delivered',
          channel_type: 'whatsapp'
        }).select().single();

        if (msgErr) {
          if (msgErr.code !== '23505') console.error(`Error inserting support_messages:`, msgErr);
          else console.log(`⏭️ Duplicate skipped`);
        } else {
          if (supportMsg && msg.media_url) {
            await supabase.from('support_message_attachments').insert({
              message_id: supportMsg.id,
              storage_path: msg.media_url,
              mime_type: msg.media_type,
              file_name: `whatsapp_${msg.media_type}`
            });
          }

          // 4. Update Conversation
          await supabase.from('support_conversations').update({
            last_message_at: new Date().toISOString(),
            last_customer_message_at: new Date().toISOString(),
            customer_service_window_expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
            last_message_preview: msg.message_text || '[Media Message]',
            unread_count: (conversation.unread_count || 0) + 1
          }).eq('id', conversation.id);

          console.log(`✅ Synced WhatsApp from ${customerName}: ${msg.message_text}`);
        }
      }
    }
  } catch (err) {
    console.error("WhatsApp polling error:", err.message);
  }
}

let lastCheckedWebsiteAt = new Date(Date.now() - 60 * 60 * 1000).toISOString();

async function pollWebsiteMessages() {
  try {
    const { data: newMsgs, error } = await supabase
      .from('messages')
      .select('*, conversations(*)')
      .gt('created_at', lastCheckedWebsiteAt)
      .order('created_at', { ascending: true });

    if (error) throw error;

    if (newMsgs && newMsgs.length > 0) {
      console.log(`📥 Found ${newMsgs.length} new Website messages! Syncing...`);
      for (const msg of newMsgs) {
        lastCheckedWebsiteAt = msg.created_at;
        
        if (msg.sender_type !== 'customer') continue;

        // Skip non-website channels (e.g. whatsapp, telegram) to prevent duplicate syncing
        if (msg.conversations && msg.conversations.channel !== 'website') {
            continue;
        }

        const customerId = msg.sender_id || msg.conversations?.id || 'guest';
        const originalConvId = msg.conversation_id;
        
        let { data: contact } = await supabase.from('support_contacts').select('*').eq('primary_phone', originalConvId).single();
        if (!contact) {
            const { data: newContact } = await supabase.from('support_contacts').insert({
                primary_phone: originalConvId, // Store original conversation_id here so outbound-worker can use it
                display_name: 'Website User'
            }).select().single();
            contact = newContact;
        }

        let { data: conversation } = await supabase.from('support_conversations').select('*').eq('id', originalConvId).eq('status', 'open').single();
        if (!conversation) {
            const { data: newConv } = await supabase.from('support_conversations').insert({
                id: originalConvId,
                support_contact_id: contact.id,
                status: 'open',
                priority: 'normal',
                channel_type: 'website'
            }).select().single();
            conversation = newConv;
        }

        // Idempotency: check if this exact message (by its source ID) is already in support_messages
        const { data: existingByExtId } = await supabase.from('support_messages')
            .select('id')
            .eq('external_message_id', msg.id)
            .single();

        if (existingByExtId) {
            // Already synced — skip silently
            continue;
        }

        // Insert message
        const { error: msgErr } = await supabase.from('support_messages').insert({
            conversation_id: conversation.id,
            sender_type: 'customer',
            direction: 'inbound',
            body: msg.body || '[Empty]',
            external_message_id: msg.id,
            idempotency_key: `web_${msg.id}`,
            status: 'delivered',
            channel_type: 'website'
        });
        if (msgErr && msgErr.code !== '23505') console.error("Error inserting website msg", msgErr);
        else console.log(`✅ Synced website message: ${msg.body}`);

        await supabase.from('support_conversations').update({
            last_message_at: new Date().toISOString(),
            last_customer_message_at: new Date().toISOString(),
            last_message_preview: msg.body,
            unread_count: (conversation.unread_count || 0) + 1
        }).eq('id', conversation.id);
      }
    }
  } catch (err) {
    console.error("Website polling error:", err.message);
  }
}

// Poll every 1 second for website messages
setInterval(pollWebsiteMessages, 1000);
setInterval(pollMessages, 1000);
