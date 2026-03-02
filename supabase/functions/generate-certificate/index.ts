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

    const { participantName, workshopTitle, workshopDate, workshopDescription, presenterName, presenterNames, signerName, companyName, companyLogoUrl, type } = await req.json();

    const isPresenter = type === 'presenter';
    const presentersList = (presenterNames && presenterNames.length > 0) ? presenterNames : (presenterName ? [presenterName] : []);
    const presentersText = presentersList.join(', ');
    const topicContext = workshopDescription ? ` The session covered: ${workshopDescription.substring(0, 300)}.` : '';
    
    const prompt = isPresenter
      ? `Write a warm, human certificate body for a presenter. "${presenterName}" delivered a session titled "${workshopTitle}" on ${workshopDate} for "${companyName}".${topicContext} Write 2-3 natural, heartfelt sentences acknowledging their contribution and expertise. Weave in what the session was about so the certificate feels specific and meaningful. Do NOT mention presenter names again in the body — the name already appears elsewhere on the certificate. Avoid stiff corporate language. Do not include headers, signatures, or the word "certifies". Just the body paragraph.`
      : `Write a warm, human certificate body for a participant. "${participantName}" took part in "${workshopTitle}" on ${workshopDate}, organised by "${companyName}".${topicContext} Write 2-3 natural, heartfelt sentences recognising their commitment to learning and weave in what the session covered so the certificate feels specific and meaningful. Do NOT mention any presenter names, facilitator names, or the company name again — those already appear elsewhere on the certificate. Avoid stiff corporate language. Do not include headers, signatures, or the word "certifies". Just the body paragraph.`;

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
