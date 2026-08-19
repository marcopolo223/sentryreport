"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsUpDown, Menu } from "lucide-react";

import { switchOrganization } from "@/app/actions/org";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export type HeaderOrg = {
  id: string;
  name: string;
  role: string;
};

export function WorkspaceNav({
  orgName,
  orgId,
  isAdmin,
  orgs,
}: {
  orgName: string;
  orgId: string;
  isAdmin: boolean;
  orgs: HeaderOrg[];
}) {
  const pathname = usePathname();
  const links = [
    { href: "/home", label: "Home", match: (path: string) => path === "/home" },
    {
      href: "/reports",
      label: "Reports",
      match: (path: string) => path.startsWith("/reports"),
    },
    ...(isAdmin
      ? [
          {
            href: "/admin/team",
            label: "Team",
            match: (path: string) => path.startsWith("/admin/team"),
          },
        ]
      : []),
  ];

  return (
    <>
      <p className="mr-auto min-w-0 truncate text-sm font-medium md:hidden">
        {orgName}
      </p>
      <nav className="hidden min-w-0 items-center gap-1 md:flex" aria-label="Workspace">
        {links.map((link) => (
          <NavLink
            key={link.href}
            href={link.href}
            label={link.label}
            active={link.match(pathname)}
          />
        ))}
      </nav>

      <OrgSwitcher orgs={orgs} activeOrgId={orgId} orgName={orgName} className="hidden md:flex" />

      <Sheet>
        <SheetTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            aria-label="Open menu"
          >
            <Menu />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="flex flex-col gap-6">
          <SheetHeader>
            <SheetTitle className="text-left">{orgName}</SheetTitle>
          </SheetHeader>
          <nav className="flex flex-col gap-1" aria-label="Workspace">
            {links.map((link) => (
              <SheetClose asChild key={link.href}>
                <Link
                  href={link.href}
                  aria-current={link.match(pathname) ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium transition-[background-color,transform] duration-200 hover:bg-accent active:scale-[0.98]",
                    link.match(pathname) ? "bg-accent text-foreground" : "text-foreground"
                  )}
                >
                  {link.label}
                </Link>
              </SheetClose>
            ))}
          </nav>
          {orgs.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Organizations
              </p>
              <div className="flex flex-col gap-1">
                {orgs.map((org) => (
                  <OrgSwitchRow
                    key={org.id}
                    org={org}
                    active={org.id === orgId}
                  />
                ))}
                <SheetClose asChild>
                  <Link
                    href="/dashboard"
                    className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                  >
                    All organizations
                  </Link>
                </SheetClose>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </>
  );
}

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "inline-flex h-11 items-center rounded-md px-3 text-sm font-medium transition-[color,background-color,transform] duration-200 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.98]",
        active ? "bg-accent/80 text-foreground" : "text-muted-foreground"
      )}
    >
      {label}
    </Link>
  );
}

function OrgSwitcher({
  orgs,
  activeOrgId,
  orgName,
  className,
}: {
  orgs: HeaderOrg[];
  activeOrgId: string;
  orgName: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          className={cn("max-w-[14rem] gap-1 px-2 font-medium", className)}
          aria-label="Switch organization"
        >
          <span className="truncate">{orgName}</span>
          <ChevronsUpDown className="size-3.5 shrink-0 opacity-60" />
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="flex flex-col gap-4">
        <SheetHeader>
          <SheetTitle className="text-left">Organizations</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-1">
          {orgs.map((org) => (
            <OrgSwitchRow
              key={org.id}
              org={org}
              active={org.id === activeOrgId}
              onSwitched={() => setOpen(false)}
            />
          ))}
          <Link
            href="/dashboard"
            onClick={() => setOpen(false)}
            className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            All organizations
          </Link>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function OrgSwitchRow({
  org,
  active,
  onSwitched,
}: {
  org: HeaderOrg;
  active: boolean;
  closeOnSwitch?: boolean;
  onSwitched?: () => void;
}) {
  return (
    <form action={switchOrganization} onSubmit={onSwitched}>
      <input type="hidden" name="orgId" value={org.id} />
      <button
        type="submit"
        className={cn(
          "flex min-h-11 w-full flex-col items-start justify-center rounded-md px-3 text-left text-sm transition-[background-color] hover:bg-accent",
          active && "bg-accent"
        )}
      >
        <span className="font-medium text-foreground">{org.name}</span>
        <span className="text-xs capitalize text-muted-foreground">{org.role}</span>
      </button>
    </form>
  );
}
