import type { ReactNode } from "react";

function parseInline(text: string): ReactNode[] {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    return part;
  });
}

export function AnalysisMarkdown({ content }: { content: string }) {
  const lines = content.split("\n");

  return (
    <div className="space-y-2 text-sm leading-relaxed text-green-950">
      {lines.map((line, index) => {
        const trimmed = line.trimEnd();

        if (trimmed.startsWith("### ")) {
          return (
            <h3 key={index} className="text-base font-semibold text-green-900">
              {parseInline(trimmed.slice(4))}
            </h3>
          );
        }

        if (trimmed.startsWith("## ")) {
          return (
            <h2 key={index} className="text-lg font-semibold text-green-900">
              {parseInline(trimmed.slice(3))}
            </h2>
          );
        }

        if (trimmed.startsWith("# ")) {
          return (
            <h1 key={index} className="text-xl font-bold text-green-900">
              {parseInline(trimmed.slice(2))}
            </h1>
          );
        }

        if (trimmed === "") {
          return <div key={index} className="h-2" />;
        }

        return <p key={index}>{parseInline(trimmed)}</p>;
      })}
    </div>
  );
}
