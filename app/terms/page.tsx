import type { Metadata } from "next";
import Link from "next/link";

import { LegalLayout } from "@/components/legal/legal-layout";
import {
  LEGAL_EMAIL,
  LEGAL_GOVERNING_LAW,
  LEGAL_OPERATOR,
  LEGAL_VENUE,
} from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: `Terms that govern your use of ${LEGAL_OPERATOR}.`,
};

export default function TermsPage() {
  return (
    <LegalLayout
      eyebrow="Legal"
      title="Terms of Service"
      description="These Terms govern access to and use of SentryReport, including websites, applications, and related services."
    >
      <nav aria-label="Contents">
        <ol className="text-sm">
          <li>
            <a href="#agreement">1. Agreement</a>
          </li>
          <li>
            <a href="#service">2. The Service</a>
          </li>
          <li>
            <a href="#accounts">3. Accounts</a>
          </li>
          <li>
            <a href="#organizations">4. Organizations</a>
          </li>
          <li>
            <a href="#content">5. Customer Content</a>
          </li>
          <li>
            <a href="#conduct">6. Acceptable use</a>
          </li>
          <li>
            <a href="#billing">7. Plans and billing</a>
          </li>
          <li>
            <a href="#availability">8. Availability and records</a>
          </li>
          <li>
            <a href="#ip">9. Intellectual property</a>
          </li>
          <li>
            <a href="#disclaimer">10. Disclaimers</a>
          </li>
          <li>
            <a href="#liability">11. Limitation of liability</a>
          </li>
          <li>
            <a href="#indemnity">12. Indemnity</a>
          </li>
          <li>
            <a href="#term">13. Term and termination</a>
          </li>
          <li>
            <a href="#general">14. General</a>
          </li>
        </ol>
      </nav>

      <section id="agreement" className="scroll-mt-24">
        <h2>1. Agreement</h2>
        <p>
          These Terms of Service (the “Terms”) are a contract between you and{" "}
          {LEGAL_OPERATOR} (“we,” “us,” or “SentryReport”) for the incident
          reporting software and related websites we operate (the “Service”).
        </p>
        <p>
          By creating an account, clicking to accept, or using the Service, you
          agree to these Terms and to our{" "}
          <Link href="/privacy">Privacy Policy</Link>. If you use the Service
          on behalf of an organization, you represent that you have authority
          to bind that organization, and “you” includes that organization.
        </p>
        <p>
          If you do not agree, do not use the Service. We may update these
          Terms from time to time. The “Last updated” date will change, and
          continued use after the effective date of a revision constitutes
          acceptance of the revised Terms. Material changes will be posted on
          this page. If you are an Owner on a paid plan, we will also attempt
          to notify the email on that account.
        </p>
      </section>

      <section id="service" className="scroll-mt-24">
        <h2>2. The Service</h2>
        <p>
          SentryReport is software for security teams to file, review, export,
          and archive incident reports for a property. Features may include
          guided intake, media attachments, PDF and ZIP export, team
          membership, branding, question and PDF-template builders on paid
          plans, activity logs, and billing.
        </p>
        <p>
          We may add, change, or remove features. Some capabilities described
          in marketing (including AI narrative polish) may not be available
          yet and are not part of your current subscription unless they appear
          and work in your account. We do not guarantee that any particular
          feature will ship on a stated timeline.
        </p>
        <p>
          The Service is not a substitute for emergency services, legal
          advice, insurance coverage, or your own record-keeping. You remain
          responsible for complying with applicable law, property rules, and
          any duty to report incidents to police, fire, or other authorities.
        </p>
      </section>

      <section id="accounts" className="scroll-mt-24">
        <h2>3. Accounts</h2>
        <p>
          You must provide accurate information and keep your email and
          password current. You are responsible for activity under your
          account. Notify us promptly if you believe your account is
          compromised.
        </p>
        <p>
          You must be at least 18 years old, or the age of majority in your
          jurisdiction, whichever is higher. The Service is intended for
          business and organizational use, not for children.
        </p>
        <p>
          One person may belong to more than one organization. Switching
          organizations in the product does not merge data between properties.
        </p>
      </section>

      <section id="organizations" className="scroll-mt-24">
        <h2>4. Organizations, roles, and authority</h2>
        <p>
          Each organization in SentryReport is one property. An organization
          has exactly one Owner. The Owner is the billing customer for that
          organization. Admins and Officers are invited or approved by an
          Owner or Admin.
        </p>
        <ul>
          <li>
            <strong className="text-foreground">Owner</strong> — controls
            billing, join codes, branding, plan, and deletion of the
            organization, and has Admin capabilities.
          </li>
          <li>
            <strong className="text-foreground">Admin</strong> — may manage
            team membership (approve, deny, remove, and change Officer/Admin
            roles), configuration, and reports, subject to plan limits.
          </li>
          <li>
            <strong className="text-foreground">Officer</strong> — may create
            and submit reports for the organization. Visibility of an
            Officer’s own submitted or finalized reports is controlled by
            organization settings.
          </li>
        </ul>
        <p>
          Joining an organization requires a join code issued by that
          organization. A request stays pending until an Admin or Owner
          approves or denies it. Regenerating a join code invalidates the old
          code for new requests; pending requests are not cancelled by a new
          code.
        </p>
        <p>
          You must only join or create organizations you are authorized to
          represent. The Owner is responsible for who is approved, what they
          can see, and how Customer Content is used inside the organization.
        </p>
      </section>

      <section id="content" className="scroll-mt-24">
        <h2>5. Customer Content</h2>
        <p>
          “Customer Content” means reports, answers, media (photos, video,
          signatures), amendments, building and unit data, intake
          configuration, branding assets, audit-log entries you generate, and
          any other data you or your members submit to the Service.
        </p>
        <p>
          As between you and us, you (or your organization) retain ownership
          of Customer Content. You grant us a worldwide, non-exclusive
          license to host, store, process, display, transmit, and create
          operational copies of Customer Content solely to provide, maintain,
          secure, and improve the Service, to prevent abuse, and to comply
          with law.
        </p>
        <p>
          You represent that you have all rights needed to submit Customer
          Content, including consent or other legal basis for personal data
          of third parties that appear in reports (residents, visitors,
          complainants, and others). Do not upload content you are not
          allowed to store or share.
        </p>
        <p>
          We do not claim ownership of your reports. We may delete or
          restrict Customer Content that violates these Terms or law, or when
          an Owner deletes the organization.
        </p>
      </section>

      <section id="conduct" className="scroll-mt-24">
        <h2>6. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>
            Use the Service for any unlawful purpose, or to conceal unlawful
            activity.
          </li>
          <li>
            Attempt to access another organization’s data, probe, scan, or
            bypass security or rate limits.
          </li>
          <li>
            Reverse engineer the Service except as permitted by law, or
            resell, scrape, or use the Service to build a competing product
            using our non-public materials.
          </li>
          <li>
            Upload malware, or content that is exploitative, or that you do
            not have rights to process.
          </li>
          <li>
            Interfere with other customers’ use, or use the Service in a way
            that imposes an unreasonable load on our infrastructure.
          </li>
          <li>
            Misrepresent your role, impersonate others, or share join codes
            publicly if that would allow unauthorized access.
          </li>
        </ul>
        <p>
          We may suspend or terminate accounts that violate this section.
        </p>
      </section>

      <section id="billing" className="scroll-mt-24">
        <h2>7. Plans, payment, and limits</h2>
        <p>
          The Service is offered on Free, Standard, and Pro plans. Current
          prices, officer seats, storage, branding, builders, and video-length
          limits are shown on our pricing page and in Billing. Limits are
          enforced in the product. Free includes a limited number of officers
          and media storage. Standard and Pro are paid monthly subscriptions
          billed in US dollars unless we state otherwise.
        </p>
        <p>
          Paid plans are billed through Stripe to the Owner. We do not store
          full payment card numbers. By starting a paid plan, you authorize
          Stripe and us to charge the payment method on file for the selected
          plan and any metered storage overage described in the product (for
          Standard and Pro, overage is billed per gigabyte above the included
          allotment at the rate then shown in Billing).
        </p>
        <p>
          Subscriptions renew until cancelled. You may change or cancel
          through Billing and the Stripe Customer Portal, subject to the
          rules in the product (including restrictions on deleting an
          organization while a paid subscription is still in force). If
          payment fails, we may retry charges. Past-due organizations may
          keep their current plan while retries continue. If a subscription
          becomes unpaid, the organization may be moved to Free. A canceled
          paid plan may remain in effect until the end of the then-current
          period.
        </p>
        <p>
          Fees are non-refundable except where required by law or where we
          expressly agree. Taxes may be added where applicable. We may change
          prices with notice to the Owner; the new price applies on the next
          renewal unless you cancel.
        </p>
        <p>
          Storage, officer seats, and other limits are measured per
          organization. Exceeding a limit may block uploads, new officer
          approvals, or other actions until you upgrade, free capacity, or
          reduce usage.
        </p>
      </section>

      <section id="availability" className="scroll-mt-24">
        <h2>8. Availability, support, and records</h2>
        <p>
          We aim to keep the Service available but do not guarantee
          uninterrupted or error-free operation. Maintenance, outages, and
          third-party failures (including Stripe, Supabase, and hosting) may
          occur.
        </p>
        <p>
          SentryReport is not your only official file. You should export PDFs
          or ZIPs of reports you need to retain for legal, insurance, or
          operational purposes. We are not liable for loss of Customer
          Content except as these Terms allow, and you should maintain your
          own backups of records that matter.
        </p>
        <p>
          Transactional notices (for example billing from Stripe, or
          authentication email from our identity provider) may be sent to the
          email on your account. You are responsible for keeping that email
          able to receive mail.
        </p>
      </section>

      <section id="ip" className="scroll-mt-24">
        <h2>9. Intellectual property</h2>
        <p>
          The Service, including software, design, trademarks, and
          documentation, is owned by us or our licensors. These Terms do not
          grant you any right to use “SentryReport” or our marks except as
          needed to identify the Service.
        </p>
        <p>
          Feedback you send us may be used without restriction or
          compensation.
        </p>
      </section>

      <section id="disclaimer" className="scroll-mt-24">
        <h2>10. Disclaimers</h2>
        <p>
          THE SERVICE IS PROVIDED “AS IS” AND “AS AVAILABLE.” TO THE MAXIMUM
          EXTENT PERMITTED BY LAW, WE DISCLAIM ALL WARRANTIES, EXPRESS OR
          IMPLIED, INCLUDING MERCHANTABILITY, FITNESS FOR A PARTICULAR
          PURPOSE, TITLE, AND NON-INFRINGEMENT. WE DO NOT WARRANT THAT
          REPORTS WILL BE ADMISSIBLE IN ANY PROCEEDING, THAT THE SERVICE WILL
          MEET YOUR COMPLIANCE OBLIGATIONS, OR THAT CUSTOMER CONTENT WILL BE
          FREE FROM LOSS, CORRUPTION, OR UNAUTHORIZED ACCESS.
        </p>
      </section>

      <section id="liability" className="scroll-mt-24">
        <h2>11. Limitation of liability</h2>
        <p>
          TO THE MAXIMUM EXTENT PERMITTED BY LAW, WE AND OUR SUPPLIERS WILL
          NOT BE LIABLE FOR INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL,
          EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS, REVENUE, DATA,
          OR GOODWILL, EVEN IF ADVISED OF THE POSSIBILITY.
        </p>
        <p>
          OUR TOTAL LIABILITY ARISING OUT OF OR RELATED TO THE SERVICE WILL
          NOT EXCEED THE GREATER OF (A) THE AMOUNTS YOU PAID US FOR THE
          ORGANIZATION GIVING RISE TO THE CLAIM IN THE TWELVE (12) MONTHS
          BEFORE THE CLAIM, OR (B) ONE HUNDRED US DOLLARS (US $100) IF YOU
          ARE ON FREE.
        </p>
        <p>
          Some jurisdictions do not allow certain limitations. In those
          places, our liability is limited to the maximum extent permitted.
        </p>
      </section>

      <section id="indemnity" className="scroll-mt-24">
        <h2>12. Indemnity</h2>
        <p>
          You will defend, indemnify, and hold us harmless from claims,
          damages, and expenses (including reasonable attorneys’ fees)
          arising from Customer Content, your use of the Service, your
          violation of these Terms or law, or a dispute among members of your
          organization.
        </p>
      </section>

      <section id="term" className="scroll-mt-24">
        <h2>13. Term and termination</h2>
        <p>
          These Terms remain in effect while you use the Service. You may
          stop using the Service at any time. An Owner may delete an
          organization when the product allows, which permanently deletes
          that property’s reports, members’ access to it, and media we store
          for it, subject to backups and legal holds.
        </p>
        <p>
          We may suspend or terminate access if you breach these Terms, if
          required by law, or if we discontinue the Service. Upon
          termination, your license to use the Service ends. Sections that by
          their nature should survive (including intellectual property,
          disclaimers, limitation of liability, indemnity, and general
          terms) will survive.
        </p>
      </section>

      <section id="general" className="scroll-mt-24">
        <h2>14. General</h2>
        <p>
          These Terms are governed by the laws of {LEGAL_GOVERNING_LAW},
          excluding conflict-of-law rules. Except where prohibited, you agree
          that courts located in {LEGAL_VENUE} have exclusive jurisdiction
          over disputes, and you consent to personal jurisdiction there.
        </p>
        <p>
          If a provision is unenforceable, the rest remains in effect. We may
          assign these Terms in connection with a merger, acquisition, or
          sale of assets. You may not assign these Terms without our prior
          consent. These Terms, the Privacy Policy, and any plan details
          shown in Billing are the entire agreement for the Service and
          supersede prior discussions on that subject.
        </p>
        <p>
          Notices to you may be sent to the email on your account or posted
          in the Service. Notices to us must be sent to{" "}
          <a href={`mailto:${LEGAL_EMAIL}`}>{LEGAL_EMAIL}</a>.
        </p>
      </section>
    </LegalLayout>
  );
}
