import Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { priceIdToPlan } from "@/app/(marketing)/pricing/pricingConfig";

type AdminClient = NonNullable<ReturnType<typeof createAdminClient>>;

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

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutCompleted(
        event.data.object as Stripe.Checkout.Session,
        stripe,
        supabase
      );
      break;
    default:
      console.log(`[stripe-webhook] unhandled event type ${event.type} (${event.id})`);
  }

  return new Response("OK", { status: 200 });
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
  stripe: Stripe,
  supabase: AdminClient
) {
  if (session.mode !== "subscription") return;

  const customerId =
    typeof session.customer === "string" ? session.customer : session.customer?.id;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription?.id;
  const userId = session.client_reference_id ?? session.metadata?.userId;
  const planFromMeta = session.metadata?.plan;
  const plan =
    planFromMeta === "team_launch" || planFromMeta === "club_5" ? planFromMeta : null;

  if (!customerId || !subscriptionId || !userId) {
    console.error("[stripe-webhook] checkout.session.completed missing required fields", {
      customerId,
      subscriptionId,
      userId,
    });
    return;
  }

  if (!plan) {
    console.error("[stripe-webhook] checkout.session.completed unknown plan in metadata", {
      planFromMeta,
    });
    return;
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const trialEnd = subscription.trial_end
    ? new Date(subscription.trial_end * 1000).toISOString()
    : null;
  // current_period_end moved to subscription item in Stripe SDK v22
  const periodEnd = subscription.items.data[0]?.current_period_end;
  const currentPeriodEnd = periodEnd ? new Date(periodEnd * 1000).toISOString() : null;
  const orgStatus = subscription.status === "trialing" ? "trialing" : "active";

  const { data: existingOrg } = await supabase
    .from("organisations")
    .select("id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (existingOrg) {
    await supabase
      .from("organisations")
      .update({
        stripe_subscription_id: subscriptionId,
        plan,
        status: orgStatus,
        trial_ends_at: trialEnd,
        current_period_end: currentPeriodEnd,
        canceled_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingOrg.id);
    console.log(
      `[stripe-webhook] revived/updated org ${existingOrg.id} for customer ${customerId}`
    );
    return;
  }

  // New org — look up user's name for a friendly default
  const { data: authUser } = await supabase.auth.admin.getUserById(userId);
  const fullName = authUser?.user?.user_metadata?.full_name;
  const email = authUser?.user?.email;
  const firstName = fullName
    ? fullName.split(" ")[0]
    : email
    ? email.split("@")[0]
    : "Coach";

  const { data: newOrg, error: orgError } = await supabase
    .from("organisations")
    .insert({
      name: `${firstName}'s Club`,
      plan,
      status: orgStatus,
      stripe_customer_id: customerId,
      stripe_subscription_id: subscriptionId,
      trial_ends_at: trialEnd,
      current_period_end: currentPeriodEnd,
      owner_user_id: userId,
    })
    .select("id")
    .single();

  if (orgError || !newOrg) {
    console.error(
      "[stripe-webhook] failed to create org for customer",
      customerId,
      orgError
    );
    return;
  }

  const { error: memberError } = await supabase.from("organisation_members").insert({
    user_id: userId,
    organisation_id: newOrg.id,
    role: "club_admin",
  });

  if (memberError) {
    console.error(
      "[stripe-webhook] failed to create org member for user",
      userId,
      memberError
    );
  }

  await supabase
    .from("user_profiles")
    .update({ has_used_trial: true })
    .eq("user_id", userId);

  console.log(
    `[stripe-webhook] created org ${newOrg.id} ("${firstName}'s Club") for user ${userId}, plan ${plan}`
  );
}
