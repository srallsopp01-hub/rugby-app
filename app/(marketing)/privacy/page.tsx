import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy – FYNL Whistle",
  description: "Privacy Policy for FYNL Whistle match analysis platform.",
};

export default function PrivacyPage() {
  return (
    <div className="overflow-hidden">
      <div className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8 lg:px-12 lg:py-14">
        <p className="font-mono text-xs font-bold uppercase text-muted-2">Legal</p>
        <h1 className="mt-3 text-4xl font-black uppercase leading-none text-foreground-strong sm:text-5xl">
          Privacy Policy
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted">Last updated: May 2026</p>

        <div className="mt-10 max-w-3xl space-y-10">

          <section>
            <h2 className="text-2xl font-black uppercase text-foreground-strong">1. Who We Are</h2>
            <p className="mt-4 text-base leading-7 text-foreground">
              FYNL Whistle (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;) operates the match analysis platform at fynlwhistle.com. We are the data controller for personal data processed through the Service.
            </p>
            <p className="mt-4 text-base leading-7 text-foreground">
              This policy explains what personal data we collect, how we use it, and your rights. We process personal data in accordance with the UK General Data Protection Regulation (UK GDPR) and the Data Protection Act 2018.
            </p>
            <p className="mt-4 text-base leading-7 text-foreground">
              Contact:{" "}
              <a href="mailto:support@fynlwhistle.com" className="underline hover:text-foreground-strong">
                support@fynlwhistle.com
              </a>
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase text-foreground-strong">2. Data We Collect</h2>
            <p className="mt-4 text-base leading-7 text-foreground">
              We collect the following categories of personal data:
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-border bg-panel p-6">
                <p className="font-mono text-xs font-bold uppercase text-muted-2">Account data</p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  Your email address and an encrypted password hash, collected when you register. We do not store your password in plain text.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-panel p-6">
                <p className="font-mono text-xs font-bold uppercase text-muted-2">Team &amp; player data</p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  Names, positions, jersey numbers, and other details you enter about players and staff in your squad. This data belongs to you — we store it on your behalf to provide the Service.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-panel p-6">
                <p className="font-mono text-xs font-bold uppercase text-muted-2">Match &amp; performance data</p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  Tagged match events, player grades, coaching notes, set-piece data, and statistical outputs you create within the platform.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-panel p-6">
                <p className="font-mono text-xs font-bold uppercase text-muted-2">Video files</p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  Match footage you upload. Video files are stored in Cloudflare R2 and are only accessible to members of your team with appropriate permissions.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-panel p-6">
                <p className="font-mono text-xs font-bold uppercase text-muted-2">Voice recordings</p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  Short audio clips captured during voice tagging. These are sent to the Anthropic API for transcription and are not stored by us or by Anthropic after the transcription response is returned.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-panel p-6">
                <p className="font-mono text-xs font-bold uppercase text-muted-2">Usage data</p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  Server-side logs of pages visited and actions taken, used for debugging and service improvement. We do not use third-party analytics services or advertising trackers.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase text-foreground-strong">3. Legal Basis for Processing</h2>
            <p className="mt-4 text-base leading-7 text-foreground">
              We rely on the following legal bases under UK GDPR:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-base leading-7 text-foreground">
              <li>
                <strong className="text-foreground-strong">Contract performance</strong> — processing your account data, team data, match data, and video files is necessary to provide the Service you have subscribed to.
              </li>
              <li>
                <strong className="text-foreground-strong">Legitimate interests</strong> — processing usage logs to maintain security, diagnose faults, and improve the Service. Our legitimate interests do not override your rights.
              </li>
              <li>
                <strong className="text-foreground-strong">Legal obligation</strong> — retaining billing records as required by applicable tax and financial regulations.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase text-foreground-strong">4. Third Parties We Use</h2>
            <p className="mt-4 text-base leading-7 text-foreground">
              We use the following sub-processors to deliver the Service. Each processes personal data only as instructed by us and is bound by appropriate data protection agreements:
            </p>

            <div className="mt-6 space-y-4">
              <div className="rounded-xl border border-border bg-panel p-6">
                <p className="font-mono text-xs font-bold uppercase text-muted-2">Supabase</p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  Provides database storage and user authentication. Stores account credentials, team data, match data, and player records. Infrastructure located in the EU and US.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-panel p-6">
                <p className="font-mono text-xs font-bold uppercase text-muted-2">Stripe</p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  Processes subscription payments. Stripe collects and stores your payment card details directly; we never see or store full card numbers. Stripe is PCI-DSS Level 1 certified.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-panel p-6">
                <p className="font-mono text-xs font-bold uppercase text-muted-2">Cloudflare R2</p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  Stores video files you upload. Files are encrypted at rest and in transit and are only accessible via authenticated, scoped URLs.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-panel p-6">
                <p className="font-mono text-xs font-bold uppercase text-muted-2">Resend</p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  Delivers transactional emails such as account confirmation, team invitations, and availability reminders. Receives recipient email addresses and message content for delivery purposes only.
                </p>
              </div>
              <div className="rounded-xl border border-border bg-panel p-6">
                <p className="font-mono text-xs font-bold uppercase text-muted-2">Anthropic</p>
                <p className="mt-2 text-sm leading-6 text-foreground">
                  Provides AI-powered voice transcription. Short audio clips are sent per request and are not retained by Anthropic after the transcription response is returned, in accordance with Anthropic&rsquo;s API usage policy.
                </p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase text-foreground-strong">5. Data Retention</h2>
            <p className="mt-4 text-base leading-7 text-foreground">
              We retain your account and team data for as long as your account is active. If you request deletion of your account, we will delete or anonymise your personal data within 30 days, except where we are required to retain certain records for legal or financial compliance purposes (typically up to 7 years for billing records).
            </p>
            <p className="mt-4 text-base leading-7 text-foreground">
              Video files are deleted when you delete them within the app, or within 30 days of your account being closed.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase text-foreground-strong">6. Your Rights</h2>
            <p className="mt-4 text-base leading-7 text-foreground">
              Under UK GDPR, you have the following rights regarding your personal data:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-base leading-7 text-foreground">
              <li><strong className="text-foreground-strong">Access</strong> — request a copy of the personal data we hold about you (Art. 15)</li>
              <li><strong className="text-foreground-strong">Rectification</strong> — ask us to correct inaccurate data (Art. 16)</li>
              <li><strong className="text-foreground-strong">Erasure</strong> — request deletion of your data where we no longer have a lawful basis to retain it (Art. 17)</li>
              <li><strong className="text-foreground-strong">Restriction</strong> — ask us to restrict processing in certain circumstances (Art. 18)</li>
              <li><strong className="text-foreground-strong">Portability</strong> — receive your data in a structured, machine-readable format (Art. 20)</li>
              <li><strong className="text-foreground-strong">Objection</strong> — object to processing based on legitimate interests (Art. 21)</li>
            </ul>
            <p className="mt-4 text-base leading-7 text-foreground">
              To exercise any of these rights, email us at{" "}
              <a href="mailto:support@fynlwhistle.com" className="underline hover:text-foreground-strong">
                support@fynlwhistle.com
              </a>
              . We will respond within 30 days.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase text-foreground-strong">7. Cookies</h2>
            <p className="mt-4 text-base leading-7 text-foreground">
              We use a single session cookie to keep you logged in. This cookie is strictly necessary for the Service to function and does not track you across other websites.
            </p>
            <p className="mt-4 text-base leading-7 text-foreground">
              We do not use advertising cookies, analytics tracking cookies, or any third-party tracking technologies.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase text-foreground-strong">8. International Transfers</h2>
            <p className="mt-4 text-base leading-7 text-foreground">
              Some of our sub-processors (including Supabase and Anthropic) may process data in the United States. Where personal data is transferred outside the UK or EEA, we ensure appropriate safeguards are in place, such as the UK International Data Transfer Agreement (IDTA) or standard contractual clauses (SCCs) approved by the ICO.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase text-foreground-strong">9. Children</h2>
            <p className="mt-4 text-base leading-7 text-foreground">
              The Service is not directed at individuals under the age of 16. We do not knowingly collect personal data from children. If you believe we have inadvertently collected data relating to a child, please contact us immediately at{" "}
              <a href="mailto:support@fynlwhistle.com" className="underline hover:text-foreground-strong">
                support@fynlwhistle.com
              </a>{" "}
              and we will delete it promptly.
            </p>
            <p className="mt-4 text-base leading-7 text-foreground">
              If your team includes junior players, you are responsible for obtaining appropriate parental or guardian consent before entering their data into the Service.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase text-foreground-strong">10. Changes to This Policy</h2>
            <p className="mt-4 text-base leading-7 text-foreground">
              We may update this Privacy Policy from time to time. For material changes, we will notify you by email at least 14 days before the new policy takes effect. The updated policy will always be available at this URL.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase text-foreground-strong">11. Contact &amp; Complaints</h2>
            <p className="mt-4 text-base leading-7 text-foreground">
              For any privacy-related questions or to exercise your rights, contact us at{" "}
              <a href="mailto:support@fynlwhistle.com" className="underline hover:text-foreground-strong">
                support@fynlwhistle.com
              </a>
              .
            </p>
            <p className="mt-4 text-base leading-7 text-foreground">
              If you are unhappy with how we handle your data, you have the right to lodge a complaint with the UK Information Commissioner&rsquo;s Office (ICO) at{" "}
              <a href="https://ico.org.uk" className="underline hover:text-foreground-strong" target="_blank" rel="noopener noreferrer">
                ico.org.uk
              </a>
              .
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
