import { NextResponse, type NextRequest } from "next/server";

import { syncStripeSubscription } from "@/lib/billing-sync";
import { createServiceClient } from "@/lib/supabase/admin";
import { getStripe, isStripeConfigured } from "@/lib/stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = request.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isStripeConfigured()) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const supabase = createServiceClient();
  const { data: rows } = await supabase
    .from("org_billing")
    .select("stripe_subscription_id")
    .not("stripe_subscription_id", "is", null);

  const ids = Array.from(
    new Set(
      (rows ?? [])
        .map((row) => row.stripe_subscription_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const stripe = getStripe();
  let synced = 0;
  for (const id of ids) {
    const subscription = await stripe.subscriptions.retrieve(id, {
      expand: ["items.data.price"],
    });
    await syncStripeSubscription(subscription);
    synced += 1;
  }

  return NextResponse.json({ ok: true, synced });
}
