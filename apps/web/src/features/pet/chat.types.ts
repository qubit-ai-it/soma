export const IMAGE_ONLY_PROMPT = "Describe esta imagen.";

export type ResearchSource = {
  id: string;
  title: string;
  url: string;
  page?: number;
  section?: string;
  evidenceType?: string;
};

export type ResearchLookup =
  | { status: "skipped"; reason: "urgency" | "image-only" | "no-query" }
  | {
      status: "found" | "no-matches" | "unavailable";
      query: string;
      origin: "model" | "fallback";
      sources: ResearchSource[];
    };

export type ChatReply = {
  reply: string;
  research?: ResearchLookup;
};

export type ChatRole = "user" | "assistant";

export type ChatMessage = {
  role: ChatRole;
  content: string;
  images?: string[];
  imageCount?: number;
  research?: ResearchLookup;
};

export function officialResearchURL(value: string): string | undefined {
  try {
    const url = new URL(value);
    const host = url.hostname;
    if (
      url.protocol === "https:" &&
      !url.username &&
      !url.password &&
      (host === "nasa.gov" || host.endsWith(".nasa.gov") || host === "pmc.ncbi.nlm.nih.gov")
    ) {
      return url.href;
    }
  } catch {
    return undefined;
  }
}
