import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

function stripHtml(html: string): string {
  return (html || '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function rid() {
  return 'q_' + Math.random().toString(36).slice(2, 10);
}

const tool = {
  type: 'function',
  function: {
    name: 'submit_quiz',
    description: 'Return the generated quiz title and questions',
    parameters: {
      type: 'object',
      additionalProperties: false,
      properties: {
        title: { type: 'string' },
        questions: {
          type: 'array',
          minItems: 3,
          items: {
            type: 'object',
            additionalProperties: false,
            properties: {
              type: { type: 'string', enum: ['single', 'multiple', 'truefalse', 'short'] },
              prompt: { type: 'string' },
              options: { type: 'array', items: { type: 'string' } },
              answer_index: { type: 'integer', description: 'For single: index of correct option.' },
              answer_indices: { type: 'array', items: { type: 'integer' }, description: 'For multiple: indices of correct options.' },
              answer_bool: { type: 'boolean', description: 'For truefalse.' },
              answer_text: { type: 'string', description: 'For short answer.' },
              points: { type: 'integer', minimum: 1 },
            },
            required: ['type', 'prompt', 'points'],
          },
        },
      },
      required: ['title', 'questions'],
    },
  },
};

function normalize(q: any) {
  const base = { id: rid(), prompt: String(q.prompt || '').trim(), points: Math.max(1, parseInt(q.points) || 1) };
  if (q.type === 'truefalse') return { ...base, type: 'truefalse', answer: !!q.answer_bool };
  if (q.type === 'short') return { ...base, type: 'short', answer: String(q.answer_text || '').trim(), caseSensitive: false };
  const opts = Array.isArray(q.options) ? q.options.map((o: any) => String(o)).filter((o: string) => o.trim()) : [];
  if (q.type === 'multiple') {
    let idxs = Array.isArray(q.answer_indices) ? q.answer_indices.filter((i: number) => i >= 0 && i < opts.length) : [];
    if (idxs.length === 0) idxs = [0];
    return { ...base, type: 'multiple', options: opts.length >= 2 ? opts : [...opts, 'Option'], answer: idxs };
  }
  // single
  const idx = typeof q.answer_index === 'number' && q.answer_index >= 0 && q.answer_index < opts.length ? q.answer_index : 0;
  return { ...base, type: 'single', options: opts.length >= 2 ? opts : ['Option A', 'Option B'], answer: idx };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const body = await req.json();
    const kind: 'lesson' | 'final' = body.kind === 'final' ? 'final' : 'lesson';
    const courseTitle: string = body.courseTitle || '';
    const lessons: { title: string; description?: string }[] = Array.isArray(body.lessons) ? body.lessons : [];
    const count: number = Math.min(20, Math.max(3, parseInt(body.count) || (kind === 'final' ? 10 : 5)));

    if (lessons.length === 0) throw new Error("No lesson content supplied");

    const lessonContext = lessons.map((l, i) =>
      `### Lesson ${i + 1}: ${l.title}\n${stripHtml(l.description || '').slice(0, 4000)}`
    ).join('\n\n');

    const system = `You are an expert instructional designer creating assessments for a marine biology / conservation education platform. Write clear, scientifically accurate questions in a professional tone suitable for both general citizens and scientists. Mix question types: single-choice, multiple-answer, true/false, and short-answer. Always provide the correct answer. Avoid trick questions.`;

    const user = kind === 'final'
      ? `Create a FINAL EXAM with exactly ${count} questions covering the most important concepts across all the following lessons of the course "${courseTitle}". Use a mix of all four question types.\n\n${lessonContext}`
      : `Create a knowledge-check quiz with exactly ${count} questions for the lesson "${lessons[0].title}" from the course "${courseTitle}". Use a mix of question types.\n\n${lessonContext}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
        tools: [tool],
        tool_choice: { type: 'function', function: { name: 'submit_quiz' } },
      }),
    });

    if (!response.ok) {
      const txt = await response.text();
      if (response.status === 429) return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      if (response.status === 402) return new Response(JSON.stringify({ error: "AI credits depleted. Please top up your workspace." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      throw new Error("AI gateway error: " + txt);
    }

    const data = await response.json();
    const call = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!call) throw new Error("AI did not return a quiz");
    const args = typeof call.function.arguments === 'string' ? JSON.parse(call.function.arguments) : call.function.arguments;
    const title = String(args.title || (kind === 'final' ? `${courseTitle} — Final Exam` : `${lessons[0].title} — Quiz`));
    const questions = (Array.isArray(args.questions) ? args.questions : []).map(normalize).filter((q: any) => q.prompt);

    if (questions.length === 0) throw new Error("AI returned no usable questions");

    return new Response(JSON.stringify({ title, questions }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error('generate-quiz error:', e);
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
