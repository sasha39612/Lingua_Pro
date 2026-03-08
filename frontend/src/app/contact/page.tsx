export const dynamic = 'force-dynamic';

import { LabFrame } from '@/components/lab-frame';

export default function ContactPage() {
  return (
    <LabFrame>
      <section className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-float">
        <h1 className="text-2xl font-bold">Contact Us</h1>
        <p className="mt-3 text-sm text-slate-700">
          Need help with your account, billing, or learning issues? Reach out to our support team.
        </p>
        <div className="mt-4 space-y-2 text-sm text-slate-700">
          <p>Email: support@lingualab.example</p>
          <p>Phone: +1 (555) 010-2233</p>
          <p>Hours: Monday-Friday, 09:00-18:00 UTC</p>
        </div>
      </section>
    </LabFrame>
  );
}
