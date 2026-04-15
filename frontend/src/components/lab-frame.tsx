'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAppStore } from '@/store/app-store';

const SKILL_LINKS = [
  { href: '/speaking', icon: '/icons/speaking-inverted.svg', label: 'Speaking' },
  { href: '/listening', icon: '/icons/listening-inverted.svg', label: 'Listening' },
  { href: '/reading', icon: '/icons/reading-inverted.svg', label: 'Reading' },
  { href: '/writing', icon: '/icons/writing-inverted.svg', label: 'Writing' },
];

export function LabFrame({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const token = useAppStore((s) => s.token);
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);

  return (
    <main className="min-h-screen bg-[#0a54c2] p-4 sm:p-8">
      <section className="mx-auto flex max-w-6xl rounded-2xl bg-white shadow-[0_28px_80px_rgba(4,23,71,0.35)]">
        <div className="w-full">
          <header className="overflow-hidden rounded-t-2xl border-b border-white/25 bg-gradient-to-r from-[#0a54c2] to-[#1a6be0] text-white shadow-[0_10px_30px_rgba(10,52,128,0.35)]">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-7">
              <div className="flex items-center gap-4">
                <Link href="/dashboard" className="text-3xl font-bold leading-none tracking-tight text-white">
                  LanguageLab
                </Link>
                <span className="h-6 w-px bg-white/30" />
                <nav className="flex items-center gap-1">
                  {SKILL_LINKS.map(({ href, icon, label }) => {
                    const isActive = pathname === href;
                    return (
                      <Link
                        key={href}
                        href={href}
                        title={label}
                        className={`group relative flex flex-col items-center rounded-xl p-1.5 transition ${isActive ? 'bg-white/20' : 'hover:bg-white/10'}`}
                      >
                        <Image src={icon} alt={label} width={28} height={28} className="h-7 w-7 object-contain" />
                        <span className="mt-0.5 text-[10px] font-medium leading-none opacity-75">{label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
              <div className="flex items-center gap-5 text-sm sm:text-base">
                {user?.role === 'admin' ? (
                  <>
                    <Link href="/admin" className="opacity-95 transition hover:opacity-100">
                      Admin
                    </Link>
                    <span className="h-5 w-px bg-white/35" />
                  </>
                ) : null}
                <Link href="/stats" className="opacity-95 transition hover:opacity-100">
                  Statistic
                </Link>
                <span className="h-5 w-px bg-white/35" />
                <Link href="/settings" className="opacity-95 transition hover:opacity-100">
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
                    className="opacity-95 transition hover:opacity-100"
                  >
                    Log Out
                  </button>
                ) : (
                  <Link href="/login" className="opacity-95 transition hover:opacity-100">
                    Log In
                  </Link>
                )}
              </div>
            </div>
          </header>

          <div className="bg-[#efeff2] px-4 pb-12 pt-10 sm:px-8 sm:pb-14 sm:pt-12">{children}</div>

          <footer className="overflow-hidden rounded-b-2xl bg-gradient-to-r from-[#1e3358] to-[#101d35] px-6 py-6 text-sm text-slate-200">
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

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="transition hover:text-white">
      {label}
    </Link>
  );
}
