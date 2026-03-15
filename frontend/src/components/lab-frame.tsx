'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/app-store';

export function LabFrame({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const token = useAppStore((s) => s.token);
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);

  return (
    <main className="min-h-screen bg-[#0a54c2] p-4 sm:p-8">
      <section className="mx-auto flex max-w-6xl overflow-hidden rounded-2xl bg-white shadow-[0_28px_80px_rgba(4,23,71,0.35)]">
        <div className="w-full">
          <header className="border-b border-white/25 bg-gradient-to-r from-[#0a54c2] to-[#1a6be0] text-white shadow-[0_10px_30px_rgba(10,52,128,0.35)]">
            <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-7">
              <Link href="/dashboard" className="text-3xl font-bold leading-none tracking-tight text-white">
                LanguageLab
              </Link>
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

function FooterLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="transition hover:text-white">
      {label}
    </Link>
  );
}
