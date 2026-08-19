import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export function BackToOrgHome({
  label = "Home",
  href = "/home",
}: {
  label?: string;
  href?: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <ChevronLeft className="size-4" />
      {label}
    </Link>
  );
}
