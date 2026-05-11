import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service – FYNL Whistle",
  description: "Terms of Service for FYNL Whistle match analysis platform.",
};

export default function TermsPage() {
  return (
    <div className="overflow-hidden">
      <div className="mx-auto max-w-[1400px] px-5 py-8 sm:px-8 lg:px-12 lg:py-14">
        <p className="font-mono text-xs font-bold uppercase text-muted-2">Legal</p>
        <h1 className="mt-3 text-4xl font-black uppercase leading-none text-foreground-strong sm:text-5xl">
          Terms of Service
        </h1>
        <p className="mt-4 text-sm leading-6 text-muted">Last updated: May 2026</p>

        <div className="mt-10 max-w-3xl space-y-10">

          <section>
            <h2 className="text-2xl font-black uppercase text-foreground-strong">1. Acceptance</h2>
            <p className="mt-4 text-base leading-7 text-foreground">
              By accessing or using FYNL Whistle (the &ldquo;Service&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service. The Service is operated by FYNL Whistle (&ldquo;we&rdquo;, &ldquo;us&rdquo;, &ldquo;our&rdquo;). These Terms form a binding legal agreement between you and us.
            </p>
            <p className="mt-4 text-base leading-7 text-foreground">
              If you are using the Service on behalf of an organisation (such as a rugby club), you represent that you have the authority to bind that organisation to these Terms, and references to &ldquo;you&rdquo; include that organisation.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase text-foreground-strong">2. The Service</h2>
            <p className="mt-4 text-base leading-7 text-foreground">
              FYNL Whistle is a desktop-first rugby match analysis platform. It enables coaches to tag live match events, import and review match video, grade player performance, write coaching notes, generate statistical reports, and share analysis with players and assistant coaches.
            </p>
            <p className="mt-4 text-base leading-7 text-foreground">
              We reserve the right to modify, suspend, or discontinue any part of the Service at any time. We will endeavour to provide reasonable notice of material changes where practicable.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase text-foreground-strong">3. Accounts</h2>
            <p className="mt-4 text-base leading-7 text-foreground">
              You must create an account to use the Service. You are responsible for maintaining the confidentiality of your login credentials and for all activity that occurs under your account. You must notify us immediately at support@fynlwhistle.com if you suspect any unauthorised access.
            </p>
            <p className="mt-4 text-base leading-7 text-foreground">
              You may not share your account with others or create accounts for the purpose of circumventing plan limits. Each person who uses the Service must have their own account.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase text-foreground-strong">4. Subscriptions &amp; Billing</h2>
            <p className="mt-4 text-base leading-7 text-foreground">
              The Service is offered on a subscription basis. Paid plans are billed in advance on a monthly or annual cycle. All payments are processed securely by Stripe. By providing payment details you authorise us to charge you on the applicable billing cycle.
            </p>
            <p className="mt-4 text-base leading-7 text-foreground">
              New subscriptions may include a free trial period, as stated at checkout. You will not be charged until the trial ends. You may cancel at any time before the trial expires to avoid being charged.
            </p>
            <p className="mt-4 text-base leading-7 text-foreground">
              Subscriptions renew automatically unless cancelled before the renewal date. You may cancel at any time through your account settings or by contacting us. Cancellation takes effect at the end of the current billing period — you retain access until then. We do not offer refunds for partial billing periods already paid.
            </p>
            <p className="mt-4 text-base leading-7 text-foreground">
              We may change our pricing with at least 30 days&rsquo; notice before the change takes effect for existing subscribers.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase text-foreground-strong">5. Acceptable Use</h2>
            <p className="mt-4 text-base leading-7 text-foreground">
              You agree to use the Service only for lawful purposes and in accordance with these Terms. You must not:
            </p>
            <ul className="mt-4 list-disc space-y-2 pl-6 text-base leading-7 text-foreground">
              <li>Upload or share content that is unlawful, defamatory, or infringes third-party intellectual property rights</li>
              <li>Upload video or images of minors without proper consent from their parents or guardians</li>
              <li>Attempt to reverse engineer, decompile, or extract source code from the Service</li>
              <li>Scrape, crawl, or systematically extract data from the Service using automated means</li>
              <li>Attempt to gain unauthorised access to any part of the Service or its infrastructure</li>
              <li>Use the Service to harass, intimidate, or harm any person</li>
              <li>Resell or sublicense access to the Service without our written permission</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase text-foreground-strong">6. Your Data</h2>
            <p className="mt-4 text-base leading-7 text-foreground">
              You retain full ownership of all data you upload or create within the Service, including match video, player names, performance grades, and coaching notes. We do not claim any ownership or rights over your content.
            </p>
            <p className="mt-4 text-base leading-7 text-foreground">
              By using the Service you grant us a limited, non-exclusive licence to store, process, and display your content solely for the purpose of providing the Service to you. We will not use your content for any other purpose, including advertising or training AI models, without your explicit consent.
            </p>
            <p className="mt-4 text-base leading-7 text-foreground">
              You are responsible for ensuring you have the necessary rights and consents to upload player data and match footage, including compliance with data protection laws applicable in your jurisdiction.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase text-foreground-strong">7. Intellectual Property</h2>
            <p className="mt-4 text-base leading-7 text-foreground">
              The Service, including its interface, design, algorithms, branding, and all software, is owned by FYNL Whistle and protected by applicable intellectual property laws. Nothing in these Terms transfers any ownership rights in the Service to you.
            </p>
            <p className="mt-4 text-base leading-7 text-foreground">
              We grant you a limited, non-exclusive, non-transferable licence to use the Service during your subscription period, solely for your internal coaching and team management purposes.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase text-foreground-strong">8. Disclaimers</h2>
            <p className="mt-4 text-base leading-7 text-foreground">
              The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo; without warranty of any kind, express or implied. We do not guarantee that the Service will be uninterrupted, error-free, or free from loss, corruption, or security breaches.
            </p>
            <p className="mt-4 text-base leading-7 text-foreground">
              We are not responsible for any decisions you make based on analysis produced by the Service. Performance data, grades, and statistical outputs are tools to assist coaching judgement — they do not replace it.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase text-foreground-strong">9. Limitation of Liability</h2>
            <p className="mt-4 text-base leading-7 text-foreground">
              To the fullest extent permitted by law, our total liability to you for any claim arising out of or relating to these Terms or the Service will not exceed the total fees paid by you in the 12 months preceding the claim.
            </p>
            <p className="mt-4 text-base leading-7 text-foreground">
              We will not be liable for any indirect, incidental, consequential, or punitive damages, including loss of data, loss of revenue, or loss of profits, even if we have been advised of the possibility of such damages.
            </p>
            <p className="mt-4 text-base leading-7 text-foreground">
              Nothing in these Terms excludes or limits our liability for death or personal injury caused by negligence, fraud, or any liability that cannot be excluded by law.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase text-foreground-strong">10. Governing Law</h2>
            <p className="mt-4 text-base leading-7 text-foreground">
              These Terms are governed by the laws of England and Wales. Any disputes arising out of or in connection with these Terms shall be subject to the exclusive jurisdiction of the courts of England and Wales.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase text-foreground-strong">11. Changes to These Terms</h2>
            <p className="mt-4 text-base leading-7 text-foreground">
              We may update these Terms from time to time. For material changes, we will provide at least 14 days&rsquo; notice via email before the new Terms take effect. Continued use of the Service after the effective date constitutes acceptance of the updated Terms.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-black uppercase text-foreground-strong">12. Contact</h2>
            <p className="mt-4 text-base leading-7 text-foreground">
              If you have any questions about these Terms, please contact us at{" "}
              <a href="mailto:support@fynlwhistle.com" className="underline hover:text-foreground-strong">
                support@fynlwhistle.com
              </a>
              .
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
