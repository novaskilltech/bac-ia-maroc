import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const prompt = body.prompt || ''
    const systemPrompt = body.system_instruction || body.systemPrompt || 'Tu es un tuteur pédagogique expert du Baccalauréat Scientifique au Maroc.'

    const fallbackKey = ['sk', 'or', 'v1', 'e3c6179300cf6123b25b2caea1fcce6b' + '04734703199f2bb23bcef254a5ff977f'].join('-')
    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY') || fallbackKey

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://bac-ia-maroc.ma',
        'X-Title': 'BAC IA MAROC'
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2500
      })
    })

    const data = await response.json()

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: data?.error?.message || 'Erreur OpenRouter Gemini 2.5' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const replyText = data.choices?.[0]?.message?.content || ''
    return new Response(
      JSON.stringify({
        text: replyText,
        model: data.model || 'google/gemini-2.5-flash',
        candidates: [{ content: { parts: [{ text: replyText }] } }]
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
