"use client";
import { useEffect, useState } from 'react';
import { TopBar } from '@/components/TopBar';
import { AgentRunButton } from '@/components/AgentRunButton';

type Client = { id: string; name: string; email?: string; phone?: string; tags?: string };

export default function ClientPage({ params }: { params: { id: string } }) {
  const [client, setClient] = useState<Client | null>(null);
  const [tab, setTab] = useState<'resumo'|'atividades'|'arquivos'>('resumo');

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/clients/${params.id}`);
      if (res.ok) setClient(await res.json());
    })();
  }, [params.id]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-white to-slate-100 dark:from-black dark:to-slate-950">
      <TopBar />
      <div className="mx-auto max-w-7xl px-4 py-8 space-y-4">
        {client && (
          <div className="rounded-3xl p-6 border border-white/15 bg-white/40 dark:bg-white/5">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-semibold">{client.name}</h1>
                <div className="text-sm opacity-70">{client.email} · {client.phone}</div>
              </div>
              <AgentRunButton agentKey="pesquisa" label="Rodar pesquisa" />
            </div>
            <div className="mt-4 flex gap-3">
              {['resumo','atividades','arquivos'].map((t) => (
                <button key={t} onClick={() => setTab(t as any)} className={`px-3 py-2 rounded-lg border ${tab===t?'bg-white/60 dark:bg-white/10':''}`}>{t}</button>
              ))}
            </div>
            <div className="mt-4 text-sm opacity-80">
              {tab === 'resumo' && <div>Sem resumo ainda.</div>}
              {tab === 'atividades' && <div>Histórico de notas e execuções aparecerá aqui.</div>}
              {tab === 'arquivos' && <div>Arquivos (outputs) do cliente.</div>}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

