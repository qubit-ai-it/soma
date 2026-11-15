import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const APP_DIR = fileURLToPath(new URL("../app", import.meta.url));

function collect(dir: string, prefix: string): string[] {
  const out: string[] = [];
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      out.push(...collect(full, prefix + (name.startsWith("(") ? "" : `/${name}`)));
    } else if (name === "page.tsx") {
      out.push(prefix === "" ? "/" : prefix);
    }
  }
  return out;
}

export function pagePatterns(): string[] {
  return collect(APP_DIR, "");
}

function matches(pattern: string, path: string): boolean {
  const a = pattern.split("/");
  const b = path.split("/");
  return a.length === b.length && a.every((seg, i) => seg.startsWith("[") || seg === b[i]);
}

export function routeExists(href: string): boolean {
  const path = href.split("?")[0].split("#")[0];
  return pagePatterns().some((pattern) => matches(pattern, path));
}
