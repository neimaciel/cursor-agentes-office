"use client";
import { useEffect, useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { ClientDrawer } from '@/components/ClientDrawer';

type Client = { id: string; name: string; email?: string; phone?: string; tags?: string };

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [q, setQ] = useState('');

  async function load() {
    const res = await fetch('/api/clients' + (q ? `?q=${encodeURIComponent(q)}` : ''));
    setClients(await res.json());
  }
  useEffect(() => { load(); }, [q]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-white to-slate-100 dark:from-black dark:to-slate-950">
      <TopBar />
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Clientes</h1>
          <ClientDrawer onCreated={load} />
        </div>
        <div>
          <input placeholder="Buscar" value={q} onChange={(e) => setQ(e.target.value)} className="w-full md:w-80 rounded-lg border border-white/15 bg-white/60 dark:bg-white/10 px-3 py-2" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {clients.map((c) => (
            <a key={c.id} href={`/clients/${c.id}`} className="rounded-2xl p-4 border border-white/15 bg-white/40 dark:bg-white/5 block">
              <div className="font-medium">{c.name}</div>
              <div className="text-xs opacity-60">{c.email} · {c.phone}</div>
              {c.tags && <div className="text-xs mt-1 opacity-70">{c.tags}</div>}
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}

