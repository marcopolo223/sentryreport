import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";

import {
  addOverageToInvoice,
  syncStripeSubscription,
} from "@/lib/billing-sync";
import { createServiceClient } from "@/lib/supabase/admin";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function claimEvent(event: Stripe.Event) {
  const supabase = createServiceClient();
  const { error } = await supabase.from("stripe_events").insert({
    id: event.id,
    type: event.type,
  });
  if (error) {
    if (error.code === "23505") return false;
    throw error;
  }
  return true;
}

async function retrieveSubscription(
  stripe: ReturnType<typeof getStripe>,
  id: string
) {
  return stripe.subscriptions.retrieve(id, {
    expand: ["items.data.price"],
  });
}

function sessionSubscriptionId(session: Stripe.Checkout.Session) {
  const sub = session.subscription;
  if (!sub) return null;
  return typeof sub === "string" ? sub : sub.id;
}

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret || !process.env.STRIPE_SECRET_KEY) {
    return NextResponse.json({ error: "Stripe is not configured" }, { status: 501 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const stripe = getStripe();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      await request.text(),
      signature,
      secret
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid payload" },
      { status: 400 }
    );
  }

  const first = await claimEvent(event);
  if (!first) {
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    switch (event.type) {
      case "invoice.created": {
        await addOverageToInvoice(event.data.object);
        const parent = event.data.object.parent?.subscription_details?.subscription;
        if (parent) {
          const id = typeof parent === "string" ? parent : parent.id;
          await syncStripeSubscription(await retrieveSubscription(stripe, id));
        }
        break;
      }
      case "checkout.session.completed": {
        const session = event.data.object;
        const subId = sessionSubscriptionId(session);
        if (subId) {
          await syncStripeSubscription(
            await retrieveSubscription(stripe, subId),
            session.metadata?.organization_id ?? session.client_reference_id
          );
        }
        break;
      }
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.paused":
      case "customer.subscription.resumed": {
        await syncStripeSubscription(
          await retrieveSubscription(stripe, event.data.object.id)
        );
        break;
      }
      case "invoice.payment_failed":
      case "invoice.paid":
      case "invoice.payment_succeeded": {
        const parent = event.data.object.parent?.subscription_details?.subscription;
        if (parent) {
          const id = typeof parent === "string" ? parent : parent.id;
          await syncStripeSubscription(await retrieveSubscription(stripe, id));
        }
        break;
      }
      default:
        break;
    }
  } catch (error) {
    const supabase = createServiceClient();
    await supabase.from("stripe_events").delete().eq("id", event.id);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Webhook failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}
