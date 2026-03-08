'use client';

import { LabFrame } from '@/components/lab-frame';

const users = [
  { id: 'u-101', email: 'anna@lingua.pro', role: 'student', level: 'A2', status: 'active' },
  { id: 'u-102', email: 'tom@lingua.pro', role: 'student', level: 'B1', status: 'active' },
  { id: 'u-201', email: 'admin@lingua.pro', role: 'admin', level: 'C1', status: 'active' },
];

export function AdminPage() {
  return (
    <LabFrame>
      <div className="mx-auto max-w-6xl">
      <section className="rounded-2xl bg-white p-5 shadow-float">
        <h1 className="text-2xl font-bold">Admin</h1>
        <p className="mt-2 text-sm text-slate-600">User management, monitoring, and AI usage overview.</p>
      </section>

      <section className="mt-5 grid gap-4 sm:grid-cols-3">
        <Kpi label="Active users" value="2,143" />
        <Kpi label="AI requests today" value="18,992" />
        <Kpi label="Gateway p95" value="182ms" />
      </section>

      <section className="mt-5 rounded-2xl bg-white p-5 shadow-float">
        <h2 className="text-lg font-semibold">User Management</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-slate-500">
                <th className="py-2">ID</th>
                <th className="py-2">Email</th>
                <th className="py-2">Role</th>
                <th className="py-2">Level</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-slate-100">
                  <td className="py-2">{u.id}</td>
                  <td className="py-2">{u.email}</td>
                  <td className="py-2">{u.role}</td>
                  <td className="py-2">{u.level}</td>
                  <td className="py-2">{u.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      </div>
    </LabFrame>
  );
}

function Kpi({ label, value }: { label: string; value: string }) {
  return (
    <article className="rounded-2xl bg-white p-4 shadow-float">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-xl font-bold text-slate-900">{value}</p>
    </article>
  );
}
