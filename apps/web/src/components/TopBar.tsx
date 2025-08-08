"use client";
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { useEffect, useState } from 'react';

export function TopBar() {
  const { theme, setTheme, systemTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const current = theme === 'system' ? systemTheme : theme;
  return (
    <header className="sticky top-0 z-10 border-b border-white/10 backdrop-blur-xl bg-white/50 dark:bg-black/30">
      <div className="mx-auto max-w-7xl px-4 py-3 flex items-center justify-between">
        <div className="text-lg font-semibold">Agentes Office</div>
        <div className="flex items-center gap-3">
          <span className="text-sm opacity-70">Org: {process.env.NEXT_PUBLIC_DEMO_ORG_ID || 'demo-org'}</span>
          {mounted && (
            <button
              aria-label="Alternar tema"
              onClick={() => setTheme(current === 'dark' ? 'light' : 'dark')}
              className="p-2 rounded-lg border border-white/10 bg-white/30 dark:bg-white/5 hover:bg-white/40 transition"
            >
              {current === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

