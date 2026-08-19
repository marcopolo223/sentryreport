import { BrandMark } from "@/components/brand-mark";
import { SessionTools } from "@/components/session-tools";
import { WorkspaceNav } from "@/components/workspace-nav";
import { listUserMemberships, requireUser } from "@/lib/auth";
import { getActiveOrgIdFromCookie } from "@/lib/active-org";
import { isAdminRole, isApproved } from "@/lib/permissions";

export async function AppHeader() {
  const { user } = await requireUser();
  const memberships = await listUserMemberships(user.id);
  const cookieOrgId = getActiveOrgIdFromCookie();
  const approved = memberships.filter((row) => isApproved(row));
  const active =
    approved.find((row) => row.organization_id === cookieOrgId) ??
    approved[0] ??
    null;
  const orgName = active?.organizations?.name;
  const showWorkspace = Boolean(active && orgName);

  return (
    <header className="sticky top-0 z-40 border-b border-border/80 bg-background/80 backdrop-blur-md">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-soft"
      >
        Skip to content
      </a>
      <div className="page-pad mx-auto flex h-16 min-w-0 max-w-6xl items-center gap-2 sm:gap-3">
        <BrandMark
          href={showWorkspace ? "/home" : "/dashboard"}
          showWordmark={!showWorkspace}
          className="shrink-0"
        />
        {showWorkspace ? (
          <div className="flex min-w-0 flex-1 items-center justify-end gap-1 md:justify-start md:gap-2">
            <WorkspaceNav
              orgName={orgName!}
              orgId={active!.organization_id}
              isAdmin={isAdminRole(active!.role)}
              orgs={approved.map((row) => ({
                id: row.organization_id,
                name: row.organizations?.name ?? "Organization",
                role: row.role,
              }))}
            />
          </div>
        ) : null}
        <div className="ml-auto shrink-0">
          <SessionTools />
        </div>
      </div>
    </header>
  );
}
