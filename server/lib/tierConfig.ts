export type Tier = "free" | "student" | "believer" | "ministry" | "seminary";

export const TIER_CONFIG: Record<Tier, { messageLimit: number; model: "haiku" | "sonnet" }> = {
  free:     { messageLimit: 30,   model: "haiku" },
  student:  { messageLimit: 200,  model: "haiku" },
  believer: { messageLimit: 300,  model: "sonnet" },
  ministry: { messageLimit: 800,  model: "sonnet" },
  seminary: { messageLimit: 2000, model: "sonnet" },
};

export function getModelConfig(tier: Tier) {
  const config = TIER_CONFIG[tier];
  const useSonnet = config.model === "sonnet";

  const modelId = useSonnet
    ? "claude-sonnet-4-6"
    : "claude-haiku-4-5-20251001";

  const thinkingConfig: any = useSonnet
    ? { type: "adaptive" }
    : { type: "enabled", budget_tokens: 7000 };

  const effortConfig: any = useSonnet
    ? { effort: "medium" }
    : undefined;

  return { modelId, thinkingConfig, effortConfig, messageLimit: config.messageLimit };
}
