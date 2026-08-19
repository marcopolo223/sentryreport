import Link from "next/link";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

export function LegalAgreeCheckbox({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-start gap-2.5", className)}>
      <input
        id="agree"
        name="agree"
        type="checkbox"
        value="1"
        required
        className="mt-1 h-4 w-4 shrink-0 rounded border-input text-primary accent-primary"
      />
      <Label
        htmlFor="agree"
        className="text-sm font-normal leading-relaxed text-muted-foreground"
      >
        I agree to the{" "}
        <Link href="/terms" className="font-medium text-primary hover:underline">
          Terms of Service
        </Link>{" "}
        and{" "}
        <Link
          href="/privacy"
          className="font-medium text-primary hover:underline"
        >
          Privacy Policy
        </Link>
        .
      </Label>
    </div>
  );
}

export function LegalContinueNotice() {
  return (
    <p className="text-xs leading-relaxed text-muted-foreground">
      By continuing, you agree to our{" "}
      <Link href="/terms" className="font-medium text-primary hover:underline">
        Terms
      </Link>{" "}
      and{" "}
      <Link
        href="/privacy"
        className="font-medium text-primary hover:underline"
      >
        Privacy Policy
      </Link>
      .
    </p>
  );
}
