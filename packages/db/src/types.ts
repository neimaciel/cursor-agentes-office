export type Role = "owner" | "admin" | "member";
export type DealStage = "novo" | "qualificado" | "proposta" | "ganho";
export type AgentKey =
  | "prazos"
  | "pesquisa"
  | "peca"
  | "contrato"
  | "traducao"
  | "evidencias"
  | "audiencia";

export interface AgentParams {
  temperature?: number;
  max_tokens?: number;
}

