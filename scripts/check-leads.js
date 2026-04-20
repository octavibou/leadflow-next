import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLeads() {
  try {
    const { data, error, count } = await supabase
      .from('leads')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.log('[v0] Error fetching leads:', error);
      return;
    }

    console.log(`[v0] Total leads in database: ${count}`);
    console.log('[v0] Recent leads:');
    console.log(JSON.stringify(data, null, 2));
  } catch (err) {
    console.log('[v0] Error:', err);
  }
}

checkLeads();
