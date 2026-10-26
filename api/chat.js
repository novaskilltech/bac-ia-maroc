// ============================================================================
// NOVA BAC IA — Server-Side AI Proxy (Vercel Serverless Function / Edge-ready)
// Protects OPENROUTER_API_KEY on the server (never exposed in browser DevTools)
// ============================================================================

const SUPABASE_URL = 'https://mdtjkjoiuuwktmxcuysn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kdGpram9pdXV3a3RteGN1eXNuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTI4MDI5NzQsImV4cCI6MjEwODM3ODk3NH0.Ib5Zfwik2FK7UarLVlRPjd_C9wrqL_6_xbSmF1rRzCI';

module.exports = async function handler(req, res) {
    // 1. En-têtes CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Headers', 'authorization, x-client-info, apikey, content-type');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
    if (!OPENROUTER_API_KEY) {
        return res.status(500).json({ error: 'OPENROUTER_API_KEY non configurée sur le serveur.' });
    }

    // 2. Endpoint de vérification d'état (Healthcheck)
    if (req.method === 'GET') {
        return res.status(200).json({ status: 'ok', model: 'google/gemini-2.5-flash', proxy: 'server-side' });
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const body = typeof req.body === 'string' ? JSON.parse(req.body) : (req.body || {});
        const {
            prompt,
            systemPrompt,
            messages,
            imageDataUrl,
            jsonMode = false,
            temperature = 0.7,
            max_tokens = 4000
        } = body;

        if (prompt === 'ping') {
            return res.status(200).json({ text: 'OK', model: 'google/gemini-2.5-flash' });
        }

        // 3. Vérification de la session Supabase si token fourni
        const authHeader = req.headers.authorization || '';
        if (authHeader.startsWith('Bearer ')) {
            const token = authHeader.replace('Bearer ', '').trim();
            if (token && token !== SUPABASE_ANON_KEY) {
                const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'apikey': SUPABASE_ANON_KEY
                    }
                });
                if (!userRes.ok) {
                    return res.status(401).json({ error: 'Session élève invalide ou expirée. Veuillez vous reconnecter.' });
                }
            }
        }

        // 4. Construction du tableau de messages OpenRouter (Texte + Vision Multimodale P2)
        let chatMessages = Array.isArray(messages) && messages.length > 0
            ? [...messages]
            : [
                { role: 'system', content: systemPrompt || 'Tu es un tuteur expert pour le Bac Marocain.' },
                { role: 'user', content: prompt || '' }
            ];

        // Si l'élève envoie une photo d'exercice / brouillon (Multimodal Vision P2)
        if (imageDataUrl && typeof imageDataUrl === 'string' && imageDataUrl.startsWith('data:image/')) {
            const lastIdx = chatMessages.length - 1;
            const lastMsg = chatMessages[lastIdx] || { role: 'user', content: prompt || '' };
            const userText = typeof lastMsg.content === 'string'
                ? lastMsg.content
                : (prompt || 'Analyse et résous cet exercice étape par étape.');

            chatMessages[lastIdx] = {
                role: 'user',
                content: [
                    { type: 'text', text: userText },
                    { type: 'image_url', image_url: { url: imageDataUrl } }
                ]
            };
        }

        // 5. Payload OpenRouter P1 :
        // - Fallback natif multi-modèles en 1 seul appel réseau ('models')
        // - Routage RGPD Zero Data Collection ('provider.data_collection = deny')
        // - Plugin 'response-healing' activé pour réparer automatiquement le JSON des Quiz / Graphes
        const openRouterPayload = {
            models: [
                'google/gemini-2.5-flash',
                'google/gemini-2.0-flash-001',
                'openai/gpt-4o-mini'
            ],
            provider: {
                allow_fallbacks: true,
                data_collection: 'deny'
            },
            messages: chatMessages,
            temperature: temperature,
            max_tokens: max_tokens
        };

        if (jsonMode) {
            openRouterPayload.plugins = [{ id: 'response-healing' }];
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://novabacia.novaskill.tech',
                'X-OpenRouter-Title': 'NOVA BAC IA MAROC',
                'X-Title': 'NOVA BAC IA MAROC'
            },
            body: JSON.stringify(openRouterPayload)
        });

        const data = await response.json().catch(() => ({}));
        if (response.ok && data.choices?.[0]?.message?.content) {
            return res.status(200).json({
                text: data.choices[0].message.content,
                model: data.model || 'google/gemini-2.5-flash',
                usage: data.usage || null
            });
        }

        const errMsg = data.error?.message || `Erreur OpenRouter (HTTP ${response.status})`;
        return res.status(502).json({ error: errMsg });
    } catch (error) {
        return res.status(400).json({ error: error.message || 'Requête invalide' });
    }
};
