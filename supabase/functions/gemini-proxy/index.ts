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
    const systemPrompt = body.system_instruction || body.systemPrompt || 'Tu es un tuteur pédagogique expert du Baccalauréat au Maroc.'

    const openRouterKey = Deno.env.get('OPENROUTER_API_KEY')
    if (!openRouterKey) {
      return new Response(
        JSON.stringify({ error: 'OPENROUTER_API_KEY non configurée sur le serveur.' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let messages = Array.isArray(body.messages) && body.messages.length > 0
      ? [...body.messages]
      : [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: prompt }
        ]

    if (body.imageDataUrl && typeof body.imageDataUrl === 'string' && body.imageDataUrl.startsWith('data:image/')) {
      const lastIdx = messages.length - 1
      const lastMsg = messages[lastIdx] || { role: 'user', content: prompt }
      const userText = typeof lastMsg.content === 'string' ? lastMsg.content : (prompt || 'Analyse et résous cet exercice étape par étape.')
      messages[lastIdx] = {
        role: 'user',
        content: [
          { type: 'text', text: userText },
          { type: 'image_url', image_url: { url: body.imageDataUrl } }
        ]
      }
    }

    const openRouterPayload: Record<string, unknown> = {
      models: [
        body.model || 'google/gemini-2.5-flash',
        'google/gemini-2.0-flash-001',
        'openai/gpt-4o-mini'
      ],
      provider: {
        allow_fallbacks: true,
        data_collection: 'deny'
      },
      messages: messages,
      temperature: body.temperature ?? 0.65,
      max_tokens: body.max_tokens ?? 3500
    }

    if (body.jsonMode) {
      openRouterPayload.plugins = [{ id: 'response-healing' }]
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://novabacia.novaskill.tech',
        'X-OpenRouter-Title': 'NOVA BAC IA MAROC',
        'X-Title': 'NOVA BAC IA MAROC'
      },
      body: JSON.stringify(openRouterPayload)
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

