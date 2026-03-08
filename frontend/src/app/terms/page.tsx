export const dynamic = 'force-dynamic';

import { LabFrame } from '@/components/lab-frame';

export default function TermsPage() {
  return (
    <LabFrame>
      <section className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-float">
        <h1 className="text-2xl font-bold">Terms and Conditions</h1>
        <p className="mt-3 text-sm text-slate-700">
          By using Lingua Pro, you agree to use the platform responsibly and comply with all applicable
          laws and platform policies.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>Accounts are personal and must not be shared.</li>
          <li>Abuse, spam, or misuse of AI features is prohibited.</li>
          <li>Service features may evolve over time to improve quality and safety.</li>
        </ul>
      </section>
    </LabFrame>
  );
}
