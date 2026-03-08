export const dynamic = 'force-dynamic';

import { LabFrame } from '@/components/lab-frame';

export default function FaqPage() {
  return (
    <LabFrame>
      <section className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-float">
        <h1 className="text-2xl font-bold">FAQ</h1>
        <div className="mt-4 space-y-4 text-sm text-slate-700">
          <div>
            <p className="font-semibold">Do I need an account to view the dashboard?</p>
            <p>Dashboard is public. Learning tasks require login.</p>
          </div>
          <div>
            <p className="font-semibold">How is AI feedback generated?</p>
            <p>Feedback is produced through backend AI orchestration and language-specific analysis.</p>
          </div>
          <div>
            <p className="font-semibold">Can I delete my account?</p>
            <p>Yes. Contact support and we will process account/data deletion requests.</p>
          </div>
        </div>
      </section>
    </LabFrame>
  );
}
