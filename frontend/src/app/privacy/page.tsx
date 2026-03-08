export const dynamic = 'force-dynamic';

import { LabFrame } from '@/components/lab-frame';

export default function PrivacyPage() {
  return (
    <LabFrame>
      <section className="mx-auto max-w-4xl rounded-2xl bg-white p-6 shadow-float">
        <h1 className="text-2xl font-bold">Privacy Policy</h1>
        <p className="mt-3 text-sm text-slate-700">
          We process account and learning data to provide language training features, progress tracking,
          and support.
        </p>
        <ul className="mt-4 list-disc space-y-2 pl-5 text-sm text-slate-700">
          <li>Account data is used for authentication and profile management.</li>
          <li>Learning submissions are used to generate feedback and statistics.</li>
          <li>You can request deletion of your personal data through support.</li>
        </ul>
      </section>
    </LabFrame>
  );
}
