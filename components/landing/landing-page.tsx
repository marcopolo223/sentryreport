import Link from "next/link";
import { Check } from "lucide-react";

import { HeroProductMock } from "@/components/landing/hero-product-mock";
import { LandingHeader } from "@/components/landing/landing-header";
import { SiteFooter } from "@/components/landing/site-footer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MEMBERSHIP_PLANS } from "@/lib/plans";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    title: "Guided intake",
    body: "Officers answer clear questions on their phone — times, locations, parties, and evidence stay structured.",
  },
  {
    title: "Polish & submit",
    body: "Summaries stay factual. Submit for supervisor review, then export a clean PDF for the file.",
  },
  {
    title: "Export & archive",
    body: "Finalize clean PDFs with your org branding and keep a complete audit trail of amendments.",
  },
] as const;

const CAPABILITIES = [
  "Phone-first guided incident intake",
  "Supervisor review and amendments",
  "Media storage with plan-based limits",
  "Organization branding on Standard+",
  "Question builder and PDF templates on Standard+",
] as const;

const ROLES = [
  {
    role: "Officer",
    title: "File from the field",
    body: "Large tap targets, one question at a time, photos attached as you go. Built for a phone in hand.",
  },
  {
    role: "Admin",
    title: "Review the queue",
    body: "Scan submitted reports, amend the finalized record, and export branded PDFs without messy freeform docs.",
  },
  {
    role: "Owner",
    title: "Run the organization",
    body: "Members, buildings, branding, and billing — per-org identity on top of a consistent design system.",
  },
] as const;

export function LandingPage() {
  return (
    <div className="flex min-h-dvh flex-col">
      <LandingHeader />

      <main className="flex-1">
        <section className="page-pad mx-auto grid max-w-6xl items-center gap-12 py-16 sm:py-24 lg:grid-cols-2 lg:gap-16 lg:py-28">
          <div className="animate-fade-up">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
              For security teams
            </p>
            <h1 className="mt-4 text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              SentryReport
            </h1>
            <p className="mt-5 max-w-lg text-base leading-relaxed text-muted-foreground sm:text-lg">
              Guided incident reporting for security teams — structured in the
              field, clean enough for the file.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button asChild size="lg">
                <Link href="/signup">Start free</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </div>
          <HeroProductMock />
        </section>

        <section
          id="product"
          className="page-pad mx-auto max-w-6xl scroll-mt-20 py-20 sm:py-28"
        >
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
            Built for the field
          </p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Everything between the call and the closed report.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-base">
            SentryReport walks officers through intake, keeps facts organized,
            and helps supervisors review, amend, and export without messy
            freeform docs.
          </p>
          <ol className="mt-14 grid gap-10 sm:grid-cols-3 sm:gap-8">
            {STEPS.map((step, i) => (
              <li key={step.title}>
                <p className="text-xs font-medium tracking-[0.16em] text-primary">
                  {String(i + 1).padStart(2, "0")}
                </p>
                <h3 className="mt-3 text-xl font-semibold tracking-tight text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {step.body}
                </p>
              </li>
            ))}
          </ol>
        </section>

        <section className="border-y border-border bg-card/50">
          <div className="page-pad mx-auto grid max-w-6xl gap-8 py-16 sm:grid-cols-[1.1fr_1fr] sm:items-center sm:gap-14 sm:py-20">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
                Capabilities
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground">
                Reports that stay usable after the shift ends.
              </h2>
              <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                Photos and video attached to the report. Team roster and
                approvals. PDF export with your branding on paid plans. Activity
                history when something changes.
              </p>
            </div>
            <ul className="space-y-0 text-sm text-foreground">
              {CAPABILITIES.map((item) => (
                <li
                  key={item}
                  className="flex gap-3 border-b border-border py-4 last:border-0 last:pb-0 first:pt-0"
                >
                  <span
                    className="mt-1.5 size-1.5 shrink-0 rounded-sm bg-primary"
                    aria-hidden
                  />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="page-pad mx-auto max-w-6xl py-20 sm:py-28">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
            Roles
          </p>
          <h2 className="mt-3 max-w-xl text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Built for the people who write, review, and own the record.
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {ROLES.map((item) => (
              <Card key={item.role} className="transition-[border-color,box-shadow] duration-200 hover:border-primary/30">
                <CardHeader>
                  <Badge variant="pending">{item.role}</Badge>
                  <CardTitle className="pt-2 text-lg">{item.title}</CardTitle>
                  <CardDescription className="leading-relaxed">
                    {item.body}
                  </CardDescription>
                </CardHeader>
              </Card>
            ))}
          </div>
        </section>

        <section
          id="pricing"
          className="page-pad mx-auto max-w-6xl scroll-mt-20 py-20 sm:py-28"
        >
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-primary">
            Membership
          </p>
          <h2 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
            Start free. Scale when the team does.
          </h2>
          <p className="mt-4 max-w-lg text-sm leading-relaxed text-muted-foreground">
            Pick the plan that matches your roster and storage needs.
          </p>
          <div className="mt-12 grid gap-4 lg:grid-cols-3">
            {MEMBERSHIP_PLANS.map((plan) => (
              <Card
                key={plan.id}
                className={cn(
                  "flex flex-col transition-[border-color,box-shadow] duration-200",
                  plan.highlighted && "border-primary/50"
                )}
              >
                <CardHeader>
                  <div className="flex items-baseline justify-between gap-2">
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <p className="text-sm font-semibold text-primary">
                      {plan.priceLabel}
                    </p>
                  </div>
                  <CardDescription>{plan.tagline}</CardDescription>
                </CardHeader>
                <CardContent className="flex-1">
                  <ul className="space-y-2">
                    {plan.features.map((feature) => (
                      <li
                        key={feature}
                        className="flex gap-2 text-sm leading-relaxed text-muted-foreground"
                      >
                        <Check
                          className="mt-0.5 size-4 shrink-0 text-primary"
                          aria-hidden
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
                <CardFooter>
                  <Button
                    asChild
                    variant={plan.highlighted ? "default" : "outline"}
                    className="w-full"
                  >
                    <Link href={plan.id === "free" ? "/signup" : `/signup?plan=${plan.id}`}>
                      Get started
                    </Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        </section>

        <section className="page-pad pb-20 sm:pb-28">
          <div className="mx-auto max-w-6xl rounded-xl bg-foreground px-6 py-14 text-center text-background dark:border dark:border-border dark:bg-card dark:text-card-foreground sm:px-12">
            <h2 className="text-3xl font-semibold tracking-tight">
              Ready when the next incident isn’t.
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-background/70 dark:text-muted-foreground">
              Create an organization in minutes. Invite officers with a join
              code.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Button
                asChild
                size="lg"
                className="bg-background text-foreground hover:bg-background/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90"
              >
                <Link href="/signup">Sign up</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                size="lg"
                className="border-background/20 bg-transparent text-background hover:bg-background/10 dark:border-border dark:text-card-foreground dark:hover:bg-accent"
              >
                <Link href="/login">Log in</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
