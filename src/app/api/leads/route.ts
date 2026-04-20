import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      total: data?.length || 0,
      leads: data,
      message: data && data.length > 0 ? 'Leads encontrados' : 'No hay leads en la base de datos',
    });
  } catch (err) {
    return NextResponse.json({ 
      error: err instanceof Error ? err.message : 'Error desconocido',
      logs: '[v0] Error fetching leads from Supabase'
    }, { status: 500 });
  }
}
