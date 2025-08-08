"use client";
import { useEffect, useState } from 'react';

type Agent = {
  key: string;
  name: string;
  enabled: boolean;
  model: string;
  temperature?: number;
};

export function AgentToggles() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    (async () => {
      const res = await fetch('/api/agents/list');
      const data = await res.json();
      setAgents(data);
      setLoading(false);
    })();
  }, []);

  async function toggle(agent: Agent, enabled: boolean) {
    setAgents((prev) => prev.map((a) => (a.key === agent.key ? { ...a, enabled } : a)));
    await fetch('/api/agents/toggle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ agentKey: agent.key, enabled }),
    });
  }

  if (loading) return <div>Carregando agentes…</div>;
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
      {agents.map((a) => (
        <div key={a.key} className="rounded-2xl p-4 border border-white/15 bg-white/40 dark:bg-white/5 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium">{a.name}</div>
              <div className="text-xs opacity-60">{a.key} · {a.model} · temp {a.temperature ?? 0.1}</div>
            </div>
            <label className="inline-flex items-center cursor-pointer">
              <input type="checkbox" className="sr-only peer" checked={a.enabled} onChange={(e) => toggle(a, e.target.checked)} />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border after:rounded-full after:h-5 after:w-5 after:transition-all relative peer-checked:bg-blue-600"></div>
            </label>
          </div>
        </div>
      ))}
    </div>
  );
}

