import Link from "next/link";
import { Settings } from "lucide-react";

import { signOut } from "@/app/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";

export function SessionTools() {
  return (
    <div className="flex shrink-0 items-center gap-1 sm:gap-2">
      <ThemeToggle />
      <Button variant="ghost" size="icon" asChild>
        <Link href="/account" aria-label="Account settings">
          <Settings />
        </Link>
      </Button>
      <form action={signOut}>
        <Button type="submit" variant="ghost" size="sm">
          Log out
        </Button>
      </form>
    </div>
  );
}
