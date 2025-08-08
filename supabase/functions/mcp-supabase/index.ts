// deno-lint-ignore-file no-explicit-any
// Deno Edge Function: MCP Supabase
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

interface ToolRequest {
  tool: string; // e.g., agents.list, agents.run
  params?: Record<string, any>;
}

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("Missing required env vars");
}

const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
});

type AgentConfig = {
  key: string;
  name: string;
  enabled: boolean;
  model: string;
  temperature: number;
  max_tokens?: number;
  systemPrompt?: string;
};

async function listAgents(orgId: string): Promise<AgentConfig[]> {
  const { data: catalog, error: err1 } = await supabase.from("agent_catalog").select("key,name,default_enabled,default_model,default_params,system_prompt");
  if (err1) throw err1;
  const { data: overrides, error: err2 } = await supabase.from("agent_overrides").select("agent_key,enabled,model,temperature,max_tokens,system_prompt").eq("org_id", orgId);
  if (err2) throw err2;

  const map = new Map<string, any>();
  for (const row of catalog ?? []) {
    map.set(row.key, {
      key: row.key,
      name: row.name,
      enabled: row.default_enabled ?? true,
      model: row.default_model ?? "gpt-5",
      temperature: row.default_params?.temperature ?? 0.1,
      max_tokens: row.default_params?.max_tokens,
      systemPrompt: row.system_prompt ?? undefined,
    } as AgentConfig);
  }
  for (const o of overrides ?? []) {
    const base = map.get(o.agent_key);
    if (!base) continue;
    map.set(o.agent_key, {
      ...base,
      enabled: o.enabled ?? base.enabled,
      model: o.model ?? base.model,
      temperature: (o.temperature ?? base.temperature) as number,
      max_tokens: o.max_tokens ?? base.max_tokens,
      systemPrompt: o.system_prompt ?? base.systemPrompt,
    });
  }
  return Array.from(map.values());
}

async function getAgentConfig(orgId: string, agentKey: string): Promise<AgentConfig | null> {
  const list = await listAgents(orgId);
  return list.find((a) => a.key === agentKey) ?? null;
}

async function toggleAgent(orgId: string, agentKey: string, enabled: boolean): Promise<AgentConfig> {
  const { data, error } = await supabase
    .from("agent_overrides")
    .upsert({ org_id: orgId, agent_key: agentKey, enabled }, { onConflict: "org_id,agent_key" })
    .select()
    .single();
  if (error) throw error;
  const cfg = await getAgentConfig(orgId, agentKey);
  if (!cfg) throw new Error("config not found after toggle");
  return cfg;
}

async function storagePutText(bucket: string, path: string, text: string, contentType = "text/markdown") {
  const { data, error } = await supabase.storage.from(bucket).upload(path, new Blob([text], { type: contentType }), {
    contentType,
    upsert: true,
  });
  if (error) throw error;
  return data;
}

function storageGetUrl(bucket: string, path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;
}

async function runAgent(orgId: string, agentKey: string, input: any) {
  const cfg = await getAgentConfig(orgId, agentKey);
  if (!cfg || !cfg.enabled) throw new Error("Agent disabled");

  // Build system prompt defaults based on agent key
  const prompts: Record<string, string> = {
    prazos: "Extraia numero_processo, partes, tipo_ato, prazo_dias_uteis, data_publicacao (YYYY-MM-DD), prazo_final_estimado (YYYY-MM-DD), checklist[]. Retorne JSON válido.",
    pesquisa: "Relatório de jurisprudência (últimos 12 meses): ementa, nº, data, link oficial, fundamentos, divergências. Formato: Markdown.",
    peca: "Minuta de peça com Fatos, Fundamentos (com referências), Pedidos, Anexos e ‘Pontos para validação humana’. Formato: Markdown.",
    contrato: "Comparação entre versões; listar mudanças, classificar risco (alto/médio/baixo), sugerir redações; incluir ‘Matriz de Risco’ tabelada. Formato: Markdown.",
    traducao: "Explicar documento para leigo, com precisão e próximos passos, sem prometer resultado. Formato: Markdown.",
    evidencias: "Identificar dados sensíveis (CPF, RG, endereço, dados médicos); checklist de redaction + roteiro de custódia (Bates). Formato: Markdown.",
    audiencia: "Resumo estratégico (forças x fraquezas), 10 perguntas prováveis e respostas sugeridas. Formato: Markdown.",
  };

  const system = cfg.systemPrompt ?? prompts[agentKey] ?? "Você é um assistente jurídico.";

  // Insert agent_run queued
  const { data: runRow, error: runErr } = await supabase
    .from("agent_runs")
    .insert({ org_id: orgId, agent_key: agentKey, input_summary: typeof input === "string" ? input.slice(0, 200) : JSON.stringify(input).slice(0, 200), status: "queued" })
    .select()
    .single();
  if (runErr) throw runErr;

  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: cfg.model ?? "gpt-5",
      temperature: cfg.temperature ?? 0.1,
      messages: [
        { role: "system", content: system },
        { role: "user", content: typeof input === "string" ? input : JSON.stringify(input) },
      ],
    }),
  });
  if (!resp.ok) {
    const txt = await resp.text();
    throw new Error(`OpenAI error: ${txt}`);
  }
  const json = await resp.json();
  const content = json.choices?.[0]?.message?.content ?? "";
  const usage = json.usage ?? { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 };

  let output_path: string | undefined;
  if (agentKey !== "prazos") {
    const filename = `${new Date().toISOString().slice(0, 10)}_${crypto.randomUUID()}.md`;
    output_path = `${orgId}/${agentKey}/${filename}`;
    await storagePutText("outputs", output_path, content, "text/markdown");
  }

  // usage counters (rough cost estimate: $10 per 1M tokens → 0.001 cent/token)
  const period = new Date().toISOString().slice(0, 7);
  const costCents = Math.round((usage.total_tokens ?? 0) * 0.001);
  await supabase.rpc("increment_usage_counters", {
    p_org_id: orgId,
    p_period: period,
    p_tokens_in: usage.prompt_tokens ?? 0,
    p_tokens_out: usage.completion_tokens ?? 0,
    p_cost_cents: costCents,
  }).catch(async () => {
    // fallback upsert
    await supabase
      .from("usage_counters")
      .upsert({ org_id: orgId, period, tokens_in: usage.prompt_tokens ?? 0, tokens_out: usage.completion_tokens ?? 0, cost_cents: costCents }, { onConflict: "org_id,period" });
  });

  await supabase.from("audit_logs").insert({
    org_id: orgId,
    action: "agents.run",
    meta: { agentKey, tokens: usage, output_path },
  });

  // Update agent_run as done
  await supabase
    .from("agent_runs")
    .update({ status: "done", output_path, finished_at: new Date().toISOString() })
    .eq("id", runRow.id);

  return { data: content, output_path, usage, run: { id: runRow.id } };
}

function ok(body: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(body), { status: 200, headers: { "content-type": "application/json" }, ...init });
}
function bad(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), { status, headers: { "content-type": "application/json" } });
}

export async function handler(req: Request) {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  if (req.method !== "POST") return bad("Only POST", 405);
  const body = (await req.json().catch(() => ({}))) as ToolRequest;
  const [ns, name] = (body.tool ?? "").split(".");
  const p = body.params ?? {};

  try {
    if (ns === "agents" && name === "list") {
      const { orgId } = p;
      if (!orgId) return bad("orgId required");
      const list = await listAgents(orgId);
      return ok(list);
    }
    if (ns === "agents" && name === "getConfig") {
      const { orgId, agentKey } = p;
      if (!orgId || !agentKey) return bad("orgId and agentKey required");
      const cfg = await getAgentConfig(orgId, agentKey);
      return ok(cfg);
    }
    if (ns === "agents" && name === "toggle") {
      const { orgId, agentKey, enabled } = p;
      if (!orgId || !agentKey || typeof enabled !== "boolean") return bad("orgId, agentKey, enabled required");
      const cfg = await toggleAgent(orgId, agentKey, enabled);
      return ok(cfg);
    }
    if (ns === "agents" && name === "run") {
      const { orgId, agentKey, input } = p;
      if (!orgId || !agentKey) return bad("orgId and agentKey required");
      const result = await runAgent(orgId, agentKey, input);
      return ok(result);
    }
    if (ns === "storage" && name === "putText") {
      const { bucket = "outputs", path, text, contentType = "text/markdown" } = p;
      if (!path || typeof text !== "string") return bad("path and text required");
      const res = await storagePutText(bucket, path, text, contentType);
      return ok(res);
    }
    if (ns === "storage" && name === "getUrl") {
      const { bucket = "outputs", path } = p;
      if (!path) return bad("path required");
      return ok({ url: storageGetUrl(bucket, path) });
    }

    return bad("Unknown tool", 404);
  } catch (e) {
    console.error(e);
    return bad((e as Error).message ?? "Unhandled error", 500);
  }
}

// Deno Edge Function entrypoint
Deno.serve((req: Request) => {
  const res = handler(req);
  // attach CORS to all responses
  const addCors = (r: Response) => {
    const h = new Headers(r.headers);
    h.set("Access-Control-Allow-Origin", "*");
    h.set("Access-Control-Allow-Headers", "*");
    h.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    return new Response(r.body, { status: r.status, headers: h });
  };
  return res instanceof Promise ? res.then(addCors) : addCors(res as Response);
});

