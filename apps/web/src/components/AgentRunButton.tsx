"use client";
import { useState } from 'react';

type Props = { agentKey: string; label?: string };

export function AgentRunButton({ agentKey, label = 'Rodar agente' }: Props) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    const res = await fetch('/api/agents/run', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ agentKey, input }) });
    const json = await res.json();
    setResult(json);
    setLoading(false);
  }

  return (
    <div>
      <button onClick={() => setOpen(true)} className="px-3 py-2 rounded-lg bg-emerald-600 text-white">{label}</button>
      {open && (
        <div className="fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-0 h-full w-full max-w-xl bg-white dark:bg-neutral-900 border-l border-white/10 p-6 overflow-auto backdrop-blur-xl">
            <h3 className="text-lg font-semibold mb-4">Rodar {agentKey}</h3>
            <textarea value={input} onChange={(e) => setInput(e.target.value)} className="w-full h-40 rounded-lg border border-white/15 bg-white/60 dark:bg-white/10 px-3 py-2" />
            <div className="mt-3 flex gap-2">
              <button disabled={loading} onClick={() => setOpen(false)} className="px-3 py-2 rounded-lg border">Fechar</button>
              <button disabled={loading} onClick={run} className="px-3 py-2 rounded-lg bg-emerald-600 text-white">{loading ? 'Executando…' : 'Executar'}</button>
            </div>
            {result && (
              <div className="mt-4 space-y-2">
                {result.output_path && (
                  <a href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/outputs/${result.output_path}`} target="_blank" className="text-blue-600 underline">Abrir output</a>
                )}
                <pre className="whitespace-pre-wrap text-sm opacity-80">{JSON.stringify(result, null, 2)}</pre>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

