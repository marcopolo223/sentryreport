import type { Metadata } from "next";
import Link from "next/link";

import { LegalLayout } from "@/components/legal/legal-layout";
import { LEGAL_EMAIL, LEGAL_OPERATOR } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${LEGAL_OPERATOR} collects, uses, and shares information.`,
};

export default function PrivacyPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Privacy Policy"
      description="This policy explains what we collect, how we use it, who can see it, and the choices you have."
    >
      <nav aria-label="Contents">
        <ol className="text-sm">
          <li>
            <a href="#who">1. Who we are</a>
          </li>
          <li>
            <a href="#roles">2. Roles and who controls what</a>
          </li>
          <li>
            <a href="#collect">3. Information we collect</a>
          </li>
          <li>
            <a href="#use">4. How we use information</a>
          </li>
          <li>
            <a href="#share">5. How we share information</a>
          </li>
          <li>
            <a href="#cookies">6. Cookies and similar tech</a>
          </li>
          <li>
            <a href="#retention">7. Retention and deletion</a>
          </li>
          <li>
            <a href="#security">8. Security</a>
          </li>
          <li>
            <a href="#rights">9. Your rights and choices</a>
          </li>
          <li>
            <a href="#children">10. Children</a>
          </li>
          <li>
            <a href="#international">11. International transfers</a>
          </li>
          <li>
            <a href="#changes">12. Changes</a>
          </li>
          <li>
            <a href="#contact">13. Contact</a>
          </li>
        </ol>
      </nav>

      <section id="who" className="scroll-mt-24">
        <h2>1. Who we are</h2>
        <p>
          {LEGAL_OPERATOR} (“we,” “us,” or “SentryReport”) operates the
          SentryReport incident reporting software and related websites (the
          “Service”). This Privacy Policy describes how we handle personal
          information when you visit our sites, create an account, or use the
          product.
        </p>
        <p>
          It should be read with our <Link href="/terms">Terms of Service</Link>
          . Terms defined there have the same meaning here.
        </p>
      </section>

      <section id="roles" className="scroll-mt-24">
        <h2>2. Roles and who controls what</h2>
        <p>
          SentryReport is multi-tenant. Each organization is one property.
          That distinction matters for privacy:
        </p>
        <ul>
          <li>
            <strong className="text-foreground">Account and operations data.</strong>{" "}
            We are the controller (or equivalent) for information we collect
            to run the product: your name, email, authentication, billing
            identity for Owners, plan, and similar account records.
          </li>
          <li>
            <strong className="text-foreground">Customer Content.</strong>{" "}
            Incident reports, answers, photos, video, signatures, amendments,
            building and unit details, and similar records are submitted by
            your organization. For that content, the organization (through
            its Owner) is the controller. We process it as a processor /
            service provider on the organization’s instructions, which are
            given by using the Service (create, view, export, amend, delete).
          </li>
        </ul>
        <p>
          If you appear in a report as a resident, visitor, or other third
          party, the organization that filed the report—not SentryReport—is
          generally the party to contact about that record. We will refer
          such requests to the Owner when we can identify the organization.
        </p>
      </section>

      <section id="collect" className="scroll-mt-24">
        <h2>3. Information we collect</h2>

        <h3>Account and profile</h3>
        <p>
          When you sign up we collect your name and email address, and we
          store authentication credentials through our identity provider
          (Supabase Auth). We do not ask for a phone number or postal address
          as part of signup.
        </p>

        <h3>Organization and team</h3>
        <p>
          We store organization name, property-related settings (including
          optional address and branding), join codes, memberships, roles
          (Owner, Admin, Officer), pending join requests, and activity such
          as approvals, role changes, and report events.
        </p>

        <h3>Customer Content</h3>
        <p>
          Officers and Admins may enter incident details, narrative text,
          structured answers, times, locations, people involved, and
          attachments (images, video within plan limits, signatures). Drafts
          and submitted reports, including later amendments, are stored so
          the team can review and export them.
        </p>
        <p>
          We do not currently run automated AI analysis or “polish” on
          narratives. If we add that later, we will describe it in the
          product and update this policy if the processing is material.
        </p>

        <h3>Billing</h3>
        <p>
          Owners who subscribe are billed through Stripe. We store
          identifiers needed to link the organization to Stripe (customer
          and subscription IDs, plan, status, period dates, and similar).
          Stripe processes payment method details. We do not store full card
          numbers on our servers.
        </p>

        <h3>Technical and usage data</h3>
        <p>
          Our hosting and database providers may log IP address, user agent,
          timestamps, and similar security or reliability data. We do not
          currently run a separate marketing analytics product (such as a
          third-party page-view tracker) in the application.
        </p>
      </section>

      <section id="use" className="scroll-mt-24">
        <h2>4. How we use information</h2>
        <p>We use information to:</p>
        <ul>
          <li>
            Provide, maintain, and secure the Service, including
            authentication, organization isolation, and role-based access.
          </li>
          <li>
            Process join requests, team changes, report intake, exports, and
            billing.
          </li>
          <li>
            Enforce plan limits (officers, storage, video length, branding
            and builders) and prevent abuse.
          </li>
          <li>
            Communicate about the account (for example authentication email,
            billing receipts from Stripe, and notices about the Service).
          </li>
          <li>Comply with law and protect our rights and users.</li>
        </ul>
        <p>
          We do not sell personal information, and we do not share it for
          cross-context behavioral advertising.
        </p>
      </section>

      <section id="share" className="scroll-mt-24">
        <h2>5. How we share information</h2>
        <p>We share information in these situations:</p>
        <ul>
          <li>
            <strong className="text-foreground">Inside your organization.</strong>{" "}
            Owners and Admins can see team and operational data for that
            property. Officers can create reports; whether they can later
            open their own submitted reports depends on organization
            settings. We do not show one organization’s Customer Content to
            another organization.
          </li>
          <li>
            <strong className="text-foreground">Service providers.</strong>{" "}
            We use processors who help us run the product, including:
            <ul>
              <li>Supabase — authentication, database, and file storage.</li>
              <li>Vercel — application hosting.</li>
              <li>
                Stripe — payment processing for paid plans (Owners).
              </li>
            </ul>
            They are allowed to process data only to provide their services
            to us, under their terms and ours.
          </li>
          <li>
            <strong className="text-foreground">Legal and safety.</strong>{" "}
            We may disclose information if we believe it is required by law,
            legal process, or to protect people, property, or the Service.
          </li>
          <li>
            <strong className="text-foreground">Business transfers.</strong>{" "}
            If we are involved in a merger, acquisition, or asset sale,
            information may transfer as part of that transaction, subject to
            this policy or a successor notice.
          </li>
        </ul>
        <p>
          Exports (PDF, ZIP) that you generate are under your control. If you
          download or email them, that sharing is yours, not ours.
        </p>
      </section>

      <section id="cookies" className="scroll-mt-24">
        <h2>6. Cookies and similar technologies</h2>
        <p>We use cookies and similar storage that are needed to run the Service:</p>
        <ul>
          <li>
            <strong className="text-foreground">Authentication.</strong>{" "}
            Session cookies from Supabase Auth so you stay signed in.
          </li>
          <li>
            <strong className="text-foreground">Active organization.</strong>{" "}
            An httpOnly cookie (<code>sr_active_org</code>) remembers which
            property you last used.
          </li>
          <li>
            <strong className="text-foreground">Intended plan.</strong>{" "}
            A short-lived cookie (<code>sr_intended_plan</code>) may store
            the plan you selected on the marketing site so Billing can show
            it after signup. It is not a payment authorization.
          </li>
          <li>
            <strong className="text-foreground">Appearance.</strong>{" "}
            Theme preference (light/dark) is typically stored in your
            browser (localStorage), not as a tracking cookie.
          </li>
        </ul>
        <p>
          These are strictly necessary or functional. We do not use
          advertising cookies. You can block cookies in your browser; the
          Service will not work correctly without authentication cookies.
        </p>
      </section>

      <section id="retention" className="scroll-mt-24">
        <h2>7. Retention and deletion</h2>
        <p>
          We keep account and organization data while the account or
          organization exists, and Customer Content while it remains in the
          product (including drafts, submitted reports, and amendments).
        </p>
        <p>
          If an Owner deletes an organization, we delete that property’s
          reports, memberships, and media we store for it, subject to short
          technical backups and any legal hold. Deletion is not available
          while a paid subscription is still in force; cancel first, then
          delete when the product allows.
        </p>
        <p>
          You may close your user account using the product controls where
          available, or by contacting us. We may retain limited records as
          required by law, to complete billing, or to resolve disputes.
        </p>
      </section>

      <section id="security" className="scroll-mt-24">
        <h2>8. Security</h2>
        <p>
          Organizations are isolated with access rules in the database
          (row-level security) so members of one property should not read
          another’s Customer Content. Access within a property follows roles
          described in the Terms. Media is stored in our file storage with
          access tied to those rules.
        </p>
        <p>
          No method of transmission or storage is completely secure. You are
          responsible for protecting your password and for who you approve
          onto the team. Notify us if you believe there has been unauthorized
          access.
        </p>
      </section>

      <section id="rights" className="scroll-mt-24">
        <h2>9. Your rights and choices</h2>
        <p>
          Depending on where you live (including the EEA, UK, and certain US
          states), you may have rights to access, correct, delete, or export
          personal information, to object to or restrict certain processing,
          and to appeal a denial. You may also have the right to lodge a
          complaint with a supervisory authority.
        </p>
        <p>
          For account data we control, email{" "}
          <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>. We will need
          enough information to verify you. For Customer Content inside a
          report, start with the organization’s Owner or Admin; they control
          that file.
        </p>
        <p>
          We do not sell personal information. If a “Do Not Sell or Share”
          right applies to you, our practices described above are intended to
          satisfy that request without an extra form, because we do not sell
          or share for advertising. You may still contact us to confirm.
        </p>
        <p>
          California residents: we collect identifiers (name, email),
          commercial information (plan and billing status), internet or
          electronic activity (logs needed to operate the Service), and
          Customer Content you or your team submit. We use this for the
          business purposes in Section 4. We do not use or disclose
          sensitive personal information for purposes that require a
          right-to-limit notice under the CPRA beyond providing the Service.
        </p>
      </section>

      <section id="children" className="scroll-mt-24">
        <h2>10. Children</h2>
        <p>
          The Service is for adult organizational users. We do not knowingly
          collect personal information from children under 13 (or under 16 in
          the EEA where consent is required). If you believe a child has
          created an account, contact us and we will delete it.
        </p>
        <p>
          Reports may mention minors as part of an incident. That content is
          Customer Content controlled by the organization. Organizations must
          only record what they are legally allowed to record.
        </p>
      </section>

      <section id="international" className="scroll-mt-24">
        <h2>11. International transfers</h2>
        <p>
          We and our processors may store and process information in the
          United States and other countries. If you access the Service from
          outside the US, you understand that your information may be
          transferred to, stored, and processed there, where laws may differ
          from those in your country. Where required, we rely on appropriate
          safeguards with processors (such as standard contractual clauses).
        </p>
      </section>

      <section id="changes" className="scroll-mt-24">
        <h2>12. Changes</h2>
        <p>
          We may update this policy. The “Last updated” date at the top will
          change. Continued use after an update means you accept the revised
          policy. If we make material changes, we will post them on this page
          and, for Owners, attempt to email the address on the account.
        </p>
      </section>

      <section id="contact" className="scroll-mt-24">
        <h2>13. Contact</h2>
        <p>
          Privacy and legal notices:{" "}
          <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
