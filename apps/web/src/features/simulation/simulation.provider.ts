export type AnalysisProvider = "medgemma" | "gemini";

export const PROVIDER_LABELS: Record<AnalysisProvider, string> = {
  medgemma: "MedGemma",
  gemini: "Gemini",
};

export function pickProvider(config: {
  chatUrl: string | undefined;
  geminiApiKey: string | undefined;
}): AnalysisProvider | null {
  if (config.chatUrl) return "medgemma";
  if (config.geminiApiKey) return "gemini";
  return null;
}

export function providerLabel(provider: AnalysisProvider | undefined): string {
  return PROVIDER_LABELS[provider ?? "medgemma"];
}
