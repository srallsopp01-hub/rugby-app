import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(req: Request) {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;

  if (!webhookSecret || !stripeSecretKey) {
    console.error("[stripe-webhook] missing STRIPE_SECRET_KEY or STRIPE_WEBHOOK_SECRET");
    return new Response("Server config error", { status: 500 });
  }

  const body = await req.text();
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing stripe-signature header", { status: 400 });
  }

  const stripe = new Stripe(stripeSecretKey);
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch {
    return new Response("Webhook signature verification failed", { status: 400 });
  }

  const supabase = createAdminClient();
  if (!supabase) {
    return new Response("Server config error", { status: 500 });
  }

  // Idempotency: stripe_events_processed.event_id is a primary key.
  // A duplicate insert returns postgres error 23505 — safe under concurrent delivery.
  const { error: insertError } = await supabase
    .from("stripe_events_processed")
    .insert({ event_id: event.id });

  if (insertError) {
    if (insertError.code === "23505") {
      console.log(`[stripe-webhook] event ${event.id} already processed`);
      return new Response("OK", { status: 200 });
    }
    console.error("[stripe-webhook] failed to record event", event.id, insertError);
    return new Response("DB error", { status: 500 });
  }

  // W1 stub: log and acknowledge. Handlers added in W2/W3.
  console.log(`[stripe-webhook] received ${event.type} (${event.id})`);
  return new Response("OK", { status: 200 });
}
