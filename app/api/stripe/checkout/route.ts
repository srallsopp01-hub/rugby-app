import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@/lib/supabase/server";
import { priceIdToPlan } from "@/app/(marketing)/pricing/pricingConfig";

export async function POST(request: NextRequest) {
  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    return NextResponse.json(
      { error: "Stripe is not configured" },
      { status: 500 }
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { priceId } = (await request.json()) as { priceId?: string };

  if (!priceId || priceId === "price_TODO") {
    return NextResponse.json({ error: "Invalid price ID" }, { status: 400 });
  }

  const stripe = new Stripe(stripeSecretKey);
  const origin = process.env.NEXT_PUBLIC_APP_URL || request.nextUrl.origin;
  let session: Stripe.Checkout.Session;

  try {
    const founderCouponId = process.env.STRIPE_FOUNDER_COUPON_ID;
    session = await stripe.checkout.sessions.create({
      mode: "subscription",
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {},
      ...(founderCouponId ? { discounts: [{ coupon: founderCouponId }] } : {}),
      client_reference_id: user.id,
      customer_email: user.email,
      success_url: `${origin}/coach?checkout=success`,
      cancel_url: `${origin}/pricing`,
      metadata: { userId: user.id, plan: priceIdToPlan(priceId) ?? "" },
    });
  } catch (error) {
    console.error("Stripe checkout session failed", error);
    return NextResponse.json(
      {
        error:
          "Stripe could not start checkout. Check that the price IDs and secret key are from the same Stripe mode.",
      },
      { status: 500 }
    );
  }

  return NextResponse.json({ url: session.url });
}
