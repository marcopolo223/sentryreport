import Link from "next/link";

import { requireMember } from "@/lib/auth";
import { needsPaymentAttention } from "@/lib/billing";
import { isOwnerRole } from "@/lib/permissions";
import type { SubscriptionStatus } from "@/lib/supabase/types";

export async function BillingBanner() {
  const { supabase, membership } = await requireMember();
  const { data } = await supabase
    .from("org_billing")
    .select("status")
    .eq("organization_id", membership.organization_id)
    .maybeSingle();

  const status = (data?.status ?? "none") as SubscriptionStatus;
  if (!needsPaymentAttention(status)) return null;

  const owner = isOwnerRole(membership.role);
  const unpaid = status === "unpaid";

  return (
    <div className="border-b border-warning/40 bg-warning/10">
      <div className="page-pad mx-auto flex max-w-6xl flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-foreground">
          {unpaid
            ? "Payment failed and retries are exhausted. This property is on Free until billing is updated."
            : "Payment failed. This property stays on its current plan while Stripe retries. Update the card to avoid a downgrade."}
        </p>
        {owner ? (
          <Link
            href="/admin/billing"
            className="shrink-0 text-sm font-medium text-foreground underline-offset-4 hover:underline"
          >
            Update billing
          </Link>
        ) : (
          <p className="shrink-0 text-xs text-muted-foreground">
            Ask the owner to update billing.
          </p>
        )}
      </div>
    </div>
  );
}
