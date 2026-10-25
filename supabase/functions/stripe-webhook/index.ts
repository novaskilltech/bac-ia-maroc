import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import Stripe from "https://esm.sh/stripe@14.14.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

const endpointSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') || ''

serve(async (req) => {
  if (req.method === 'POST') {
    const signature = req.headers.get('stripe-signature')

    if (!signature) {
      return new Response('No stripe signature header', { status: 400 })
    }

    try {
      const body = await req.text()
      let event: Stripe.Event

      if (endpointSecret) {
        event = await stripe.webhooks.constructEventAsync(body, signature, endpointSecret)
      } else {
        // Fallback parse if secret is pending setup
        event = JSON.parse(body)
      }

      // Handle checkout.session.completed
      if (event.type === 'checkout.session.completed') {
        const session = event.data.object as Stripe.Checkout.Session

        const userId = session.client_reference_id
        const customerEmail = session.customer_details?.email || session.customer_email

        console.log(`Paiement valide recu pour userId: ${userId}, email: ${customerEmail}`)

        // Initialize Supabase Admin Client using Service Role
        const supabaseUrl = Deno.env.get('SUPABASE_URL') || ''
        const supabaseServiceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''

        if (supabaseUrl && supabaseServiceRole) {
          const supabase = createClient(supabaseUrl, supabaseServiceRole)

          let updateQuery = supabase.from('profiles').update({
            status: 'valide',
            payment_status: 'paiement_valide',
            validated_at: new Date().toISOString()
          })

          if (userId) {
            updateQuery = updateQuery.eq('id', userId)
          } else if (customerEmail) {
            updateQuery = updateQuery.eq('email', customerEmail)
          }

          const { data, error } = await updateQuery.select()

          if (error) {
            console.error('Erreur lors du deblocage profil Supabase:', error)
          } else {
            console.log('Profil developpe et valide avec succes:', data)
          }
        }
      }

      return new Response(JSON.stringify({ received: true }), {
        headers: { 'Content-Type': 'application/json' },
        status: 200,
      })
    } catch (err) {
      console.error(`Erreur Webhook Stripe: ${err.message}`)
      return new Response(`Webhook Error: ${err.message}`, { status: 400 })
    }
  }

  return new Response('Method Not Allowed', { status: 405 })
})
