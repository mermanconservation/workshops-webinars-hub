import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const { participantName, workshopTitle, workshopDate, presenterName, presenterNames, signerName, companyName, companyLogoUrl, type } = await req.json();

    const isPresenter = type === 'presenter';
    const presentersList = (presenterNames && presenterNames.length > 0) ? presenterNames : (presenterName ? [presenterName] : ['Presenter']);
    const presentersText = presentersList.join(', ');
    
    const prompt = isPresenter
      ? `Generate a formal certificate of presentation text. The presenter "${presenterName}" presented a workshop titled "${workshopTitle}" on ${workshopDate} for the organization "${companyName}". Write an elegant, professional certificate body text (3-4 sentences max). Do not include headers or signatures - just the body text. Make it sound distinguished and professional.`
      : `Generate a formal certificate of participation text. The participant "${participantName}" attended a workshop titled "${workshopTitle}" on ${workshopDate}, led by ${presentersText}, for the organization "${companyName}". Write an elegant, professional certificate body text (3-4 sentences max). Do not include headers or signatures - just the body text. Make it sound distinguished and professional. Use the actual presenter names in the text.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a professional certificate writer. Return ONLY the certificate body text, nothing else. Keep it elegant and concise." },
          { role: "user", content: prompt },
        ],
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit exceeded. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits depleted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      throw new Error("AI gateway error");
    }

    const aiData = await response.json();
    const certificateText = aiData.choices?.[0]?.message?.content || "Certificate of participation";

    return new Response(JSON.stringify({ certificateText }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('Certificate error:', e);
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
