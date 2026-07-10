import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { Expo } from 'expo-server-sdk';

const expo = new Expo();

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET || 'Biriq@2090.'}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { message_id, conversation_id, body: messageText, sender_id } = body;

    // Fetch the customer's name
    const { data: customerData } = await supabaseAdmin()
      .from('profiles')
      .select('full_name, phone')
      .eq('id', sender_id)
      .single();

    const customerName = customerData?.full_name || customerData?.phone || 'Customer';

    // Fetch all staff members' push tokens
    const { data: staffProfiles, error } = await supabaseAdmin()
      .from('profiles')
      .select('expo_push_token')
      .in('role', ['admin', 'super_admin', 'moderator', 'staff'])
      .not('expo_push_token', 'is', null);

    if (error || !staffProfiles || staffProfiles.length === 0) {
      console.log('No staff push tokens found.');
      return NextResponse.json({ success: true, message: 'No tokens found' });
    }

    const messages = [];
    for (let profile of staffProfiles) {
      if (!Expo.isExpoPushToken(profile.expo_push_token)) {
        continue;
      }

      messages.push({
        to: profile.expo_push_token,
        sound: 'default',
        title: `New Message from ${customerName}`,
        body: messageText,
        data: { conversationId: conversation_id },
      });
    }

    const chunks = expo.chunkPushNotifications(messages);
    for (let chunk of chunks) {
      try {
        await expo.sendPushNotificationsAsync(chunk);
      } catch (error) {
        console.error('Error sending push chunk:', error);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Push webhook error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
