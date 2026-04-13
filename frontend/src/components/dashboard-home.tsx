'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/app-store';

const SKILL_LINKS = [
  { href: '/speaking', icon: '/icons/speaking-inverted.svg', label: 'Speaking' },
  { href: '/listening', icon: '/icons/listening-inverted.svg', label: 'Listening' },
  { href: '/reading', icon: '/icons/reading-inverted.svg', label: 'Reading' },
  { href: '/writing', icon: '/icons/writing-inverted.svg', label: 'Writing' },
];

export function DashboardHome() {
  const router = useRouter();
  const user = useAppStore((s) => s.user);
  const token = useAppStore((s) => s.token);
  const logout = useAppStore((s) => s.logout);
  const recentResults = useAppStore((s) => s.recentResults);
  const audioScores = useAppStore((s) => s.audioScores);
  const lastTaskTitle = useAppStore((s) => s.lastTaskTitle);

  const avgText = recentResults.length
    ? Math.round(
        (recentResults.reduce((sum, item) => sum + Number(item.textScore ?? 0), 0) /
          recentResults.length) *
          100,
      )
    : 0;

  const avgAudio = audioScores.length
    ? Math.round((audioScores.reduce((sum, item) => sum + item, 0) / audioScores.length) * 100)
    : 0;

  return (
    <main className="min-h-screen bg-[#0a54c2] p-4 sm:p-8">
      <section className="mx-auto flex max-w-6xl overflow-hidden rounded-2xl bg-white shadow-[0_28px_80px_rgba(4,23,71,0.35)]">
        <div className="w-full">
          <header className="border-b border-white/25 bg-gradient-to-r from-[#0a54c2] to-[#1a6be0] text-white shadow-[0_10px_30px_rgba(10,52,128,0.35)]">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-7">
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="text-3xl font-bold leading-none tracking-tight text-white">
                  LanguageLab
                </Link>
                <span className="h-6 w-px bg-white/30" />
                <nav className="flex items-center gap-1">
                  {SKILL_LINKS.map(({ href, icon, label }) => (
                    <Link
                      key={href}
                      href={href}
                      title={label}
                      className="flex flex-col items-center rounded-xl p-1.5 transition hover:bg-white/10"
                    >
                      <Image src={icon} alt={label} width={28} height={28} className="h-7 w-7 object-contain" />
                      <span className="mt-0.5 text-[10px] font-medium leading-none opacity-75">{label}</span>
                    </Link>
                  ))}
                </nav>
              </div>
              <div className="flex items-center gap-5 text-sm sm:text-base">
                {user?.role === 'admin' ? (
                  <>
                    <Link href="/admin" className="transition hover:opacity-100 opacity-95">
                      Admin
                    </Link>
                    <span className="h-5 w-px bg-white/35" />
                  </>
                ) : null}
                <Link href="/stats" className="transition hover:opacity-100 opacity-95">
                  Statistic
                </Link>
                <span className="h-5 w-px bg-white/35" />
                <Link href="/settings" className="transition hover:opacity-100 opacity-95">
                  Settings
                </Link>
                <span className="h-5 w-px bg-white/35" />
                {token ? (
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      router.push('/login');
                    }}
                    className="transition hover:opacity-100 opacity-95"
                  >
                    Log Out
                  </button>
                ) : (
                  <Link href="/login" className="transition hover:opacity-100 opacity-95">
                    Log In
                  </Link>
                )}
              </div>
            </div>
          </header>

          <div className="bg-[#efeff2] px-8 pb-14 pt-20 text-center">
            <h1 className="text-5xl font-bold tracking-tight text-[#23304f]">Language Studying</h1>
            <p className="mt-3 text-4 text-[#607091]">Practice. Progress. Perform.</p>

            <div className="mx-auto mt-5 flex max-w-3xl flex-wrap justify-center gap-2 text-xs text-slate-600">
              <span className="rounded-full bg-white px-3 py-1">User: {user?.email ?? 'guest'}</span>
              <span className="rounded-full bg-white px-3 py-1">Text score: {avgText}%</span>
              <span className="rounded-full bg-white px-3 py-1">Audio score: {avgAudio}%</span>
              <span className="rounded-full bg-white px-3 py-1">Last task: {lastTaskTitle ?? 'none'}</span>
            </div>

            <div className="mx-auto mt-10 grid max-w-4xl gap-5 sm:grid-cols-2 lg:grid-cols-4">
              <SkillCard href="/speaking" iconSrc="/icons/speaking.svg" title="Speaking" />
              <SkillCard href="/listening" iconSrc="/icons/listening.svg" title="Listening" />
              <SkillCard href="/reading" iconSrc="/icons/reading.svg" title="Reading" />
              <SkillCard href="/writing" iconSrc="/icons/writing.svg" title="Writing" />
            </div>
          </div>

          <footer className="bg-gradient-to-r from-[#1e3358] to-[#101d35] px-6 py-6 text-sm text-slate-200">
            <div className="mx-auto flex max-w-3xl flex-wrap items-center justify-center gap-4 sm:gap-8">
              <FooterLink href="/contact" label="Contact Us" />
              <span className="hidden h-4 w-px bg-white/30 sm:block" />
              <FooterLink href="/privacy" label="Privacy Policy" />
              <span className="hidden h-4 w-px bg-white/30 sm:block" />
              <FooterLink href="/terms" label="Terms and Conditions" />
              <span className="hidden h-4 w-px bg-white/30 sm:block" />
              <FooterLink href="/faq" label="FAQ" />
            </div>
          </footer>
        </div>
      </section>
    </main>
  );
}

function SkillCard({ href, iconSrc, title }: { href: string; iconSrc: string; title: string }) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-slate-200 bg-white p-7 text-center shadow-[0_8px_24px_rgba(15,26,52,0.11)] transition hover:-translate-y-0.5 hover:shadow-[0_16px_36px_rgba(15,26,52,0.2)]"
    >
      <div className="mx-auto flex h-24 w-24 items-center justify-center">
        <Image src={iconSrc} alt={title} width={96} height={96} className="h-24 w-24 object-contain" />
      </div>
      <p className="mt-5 text-4 font-semibold text-[#26344f]">{title}</p>
      <p className="mt-1 text-xs text-slate-500 opacity-0 transition group-hover:opacity-100">Open task</p>
    </Link>
  );
}

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="transition hover:text-white">
      {label}
    </Link>
  );
}
