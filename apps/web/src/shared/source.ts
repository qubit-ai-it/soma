export type SourceInfo = {
  provider: string;
  mode: "live" | "cache" | "mock";
  fetchedAt: string;
};

export function mockSource(provider = "mock"): SourceInfo {
  return { provider, mode: "mock", fetchedAt: new Date().toISOString() };
}
