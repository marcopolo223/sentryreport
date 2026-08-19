import type { Metadata } from "next";
import Link from "next/link";
import { Plus, UserPlus } from "lucide-react";

import { switchOrganization } from "@/app/actions/org";
import { HomeHeader } from "@/components/home-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { listUserMemberships, requireUser } from "@/lib/auth";
import { isApproved } from "@/lib/permissions";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const memberships = await listUserMemberships(user.id);
  const visible = memberships.filter(
    (m) => m.status === "approved" || m.status === "pending"
  );

  const approvedIds = visible
    .filter((m) => isApproved(m) && m.organizations)
    .map((m) => m.organization_id);

  const { data: buildingRows } =
    approvedIds.length > 0
      ? await supabase
          .from("buildings")
          .select("organization_id, name")
          .in("organization_id", approvedIds)
          .order("name")
      : { data: [] };

  const buildingsByOrg = new Map<string, string[]>();
  for (const row of buildingRows ?? []) {
    const list = buildingsByOrg.get(row.organization_id) ?? [];
    list.push(row.name);
    buildingsByOrg.set(row.organization_id, list);
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <HomeHeader />
      <main id="main" className="page-pad mx-auto w-full max-w-6xl flex-1 py-10">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1>Dashboard</h1>
            <p className="page-lead">
              Organizations you own or belong to.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <Link href="/join-organization">
                <UserPlus />
                Join
              </Link>
            </Button>
            <Button asChild>
              <Link href="/create-organization">
                <Plus />
                New
              </Link>
            </Button>
          </div>
        </div>

        {visible.length === 0 ? (
          <Card className="mt-10">
            <CardHeader>
              <CardTitle>No organizations yet</CardTitle>
              <CardDescription>
                Create a property or join one with a code from your
                administrator.
              </CardDescription>
            </CardHeader>
          </Card>
        ) : (
          <ul className="mt-10 grid gap-4 sm:grid-cols-2">
            {visible.map((membership) => {
              const org = membership.organizations;
              const buildings = buildingsByOrg.get(membership.organization_id) ?? [];
              const pending = membership.status === "pending";

              const inner = (
                <>
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <CardTitle className="text-lg">
                        {org?.name ?? "Pending request"}
                      </CardTitle>
                      <Badge
                        variant={pending ? "warning" : "pending"}
                        className="capitalize"
                      >
                        {pending ? "Pending" : membership.role}
                      </Badge>
                    </div>
                    {org?.agency_name && (
                      <p className="text-sm text-muted-foreground">{org.agency_name}</p>
                    )}
                    {org?.address && (
                      <CardDescription>{org.address}</CardDescription>
                    )}
                    {pending && (
                      <CardDescription>
                        Waiting for an admin to approve your request.
                      </CardDescription>
                    )}
                  </CardHeader>
                  {buildings.length > 0 && (
                    <CardContent>
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                        Buildings
                      </p>
                      <p className="mt-1 text-sm text-foreground">
                        {buildings.join(" · ")}
                      </p>
                    </CardContent>
                  )}
                </>
              );

              if (pending) {
                return (
                  <li key={membership.id}>
                    <Card className="h-full opacity-90">{inner}</Card>
                  </li>
                );
              }

              return (
                <li key={membership.id}>
                  <form action={switchOrganization}>
                    <input
                      type="hidden"
                      name="orgId"
                      value={membership.organization_id}
                    />
                    <button
                      type="submit"
                      className="block w-full rounded-lg text-left transition-[transform,border-color] duration-200 hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.99]"
                    >
                      <Card className="h-full border-transparent shadow-soft transition-[border-color] duration-200 hover:border-primary/40">
                        {inner}
                      </Card>
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </main>
    </div>
  );
}
