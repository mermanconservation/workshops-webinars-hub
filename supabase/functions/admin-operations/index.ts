import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-admin-password, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

const ADMIN_PASSWORD = "Wildlifeuk2026";

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { action, table, data, id, filters } = await req.json();

    // Allow public inserts to certificate_verifications without password
    const isPublicCertInsert = table === 'certificate_verifications' && action === 'insert';

    const password = req.headers.get('x-admin-password');
    if (!isPublicCertInsert && password !== ADMIN_PASSWORD) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { action, table, data, id, filters } = await req.json();

    // Table whitelist for non-admin operations
    const allowedTables = ['workshops', 'presenters', 'company_settings', 'workshop_videos', 'workshop_materials', 'workshop_participants', 'certificate_verifications'];
    if (!allowedTables.includes(table)) throw new Error('Invalid table');

    let result;

    switch (action) {
      case 'insert': {
        const { data: inserted, error } = await supabase.from(table).insert(data).select();
        if (error) throw error;
        result = inserted;
        break;
      }
      case 'update': {
        const { data: updated, error } = await supabase.from(table).update(data).eq('id', id).select();
        if (error) throw error;
        result = updated;
        break;
      }
      case 'delete': {
        const { error } = await supabase.from(table).delete().eq('id', id);
        if (error) throw error;
        result = { success: true };
        break;
      }
      case 'list': {
        let query = supabase.from(table).select(filters?.select || '*');
        if (filters?.order) {
          query = query.order(filters.order.column, { ascending: filters.order.ascending ?? false });
        }
        const { data: listed, error } = await query;
        if (error) throw error;
        result = listed;
        break;
      }
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Admin operation error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
