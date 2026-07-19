import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET() {
  try {
    const s = supabaseAdmin();
    const { data: paymentsSchema, error: pError } = await s.rpc('get_schema_info', { table_name: 'payments' }); // this rpc might not exist
    
    // Instead, let's just do a select limit 1
    const { data: orders, error: oError } = await s.from('orders').select('*').limit(1);
    const { data: payments, error: payError } = await s.from('payments').select('*').limit(1);
    
    return NextResponse.json({
      orders: { data: orders, error: oError },
      payments: { data: payments, error: payError }
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message });
  }
}
