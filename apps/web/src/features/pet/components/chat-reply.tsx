import Markdown from "react-markdown";

import {
  officialResearchURL,
  type ResearchLookup,
} from "../chat.types.ts";

const LOOKUP_LABELS = {
  found: "Sources retrieved",
  "no-matches": "Search sent · No sources",
  unavailable: "Search sent · Library unavailable",
};

const SKIPPED_LABELS = {
  urgency: "Search skipped · Urgent query",
  "image-only": "Search skipped · Image query",
  "no-query": "Search skipped · No search terms",
};

const EVIDENCE_LABELS: Record<string, string> = {
  operational: "Operational procedure",
  operational_guidance: "Operational guidance",
  historical: "Historical practice",
  capability: "Treatment capability",
  countermeasure: "Countermeasure",
  proposed_countermeasure: "Proposed countermeasure",
  monitoring: "Monitoring method",
  training: "Crew training",
  bibliographic_reference: "Bibliographic reference",
  research_method: "Research method",
  research_evidence: "Research evidence",
  study_record: "Study record",
};

function ResearchDetails({ research }: { research: ResearchLookup }) {
  if (research.status === "skipped") {
    return <p className="text-xs text-ink">{SKIPPED_LABELS[research.reason]}</p>;
  }

  return (
    <details className="rounded-md bg-accent-soft p-3 text-xs">
      <summary className="cursor-pointer text-foreground">{LOOKUP_LABELS[research.status]}</summary>
      <p className="mt-2 break-words font-mono">{research.query}</p>
      <p className="mt-1 text-ink">{research.origin === "model" ? "Origin · Model" : "Origin · Fallback rules"}</p>
      {research.sources.length > 0 && (
        <ul className="mt-3 space-y-3">
          {research.sources.map(({ id, title, url, page, section, evidenceType }) => {
            const officialURL = officialResearchURL(url);
            const description = [
              page != null ? `Page ${page}` : section,
              evidenceType ? EVIDENCE_LABELS[evidenceType] : undefined,
            ].filter(Boolean).join(" · ");
            return (
              <li key={id}>
                {officialURL ? (
                  <a href={officialURL} target="_blank" rel="noreferrer" className="text-signal underline underline-offset-2">
                    [{id}] {title}
                  </a>
                ) : <span>[{id}] {title}</span>}
                {description && <p className="mt-1 text-ink">{description}</p>}
              </li>
            );
          })}
        </ul>
      )}
    </details>
  );
}

export function ChatReplyView({ content, research }: { content: string; research?: ResearchLookup }) {
  return (
    <>
      <div className="min-w-0 space-y-3 [overflow-wrap:anywhere] [&_blockquote]:border-l-2 [&_blockquote]:border-signal [&_blockquote]:pl-3 [&_h1]:text-base [&_h2]:text-base [&_h3]:font-semibold [&_ol]:list-decimal [&_ol]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-muted [&_pre]:p-2 [&_ul]:list-disc [&_ul]:pl-5">
        <Markdown
          skipHtml
          disallowedElements={["img"]}
          components={{
            a: ({ children }) => <span>{children}</span>,
          }}
        >
          {content}
        </Markdown>
      </div>
      {research && <ResearchDetails research={research} />}
    </>
  );
}
