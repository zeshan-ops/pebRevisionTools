import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { cn } from "@/lib/utils";

/**
 * Renders supplement .mdx bodies as markdown (react-markdown + remark-gfm),
 * not compiled MDX. The supplement files contain plain prose, lists and
 * GFM tables with no embedded JSX, so a markdown renderer is sufficient and
 * avoids compiling arbitrary code from content files.
 */
export function Markdown({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn("prose-note space-y-4", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: (props) => <h3 className="font-serif text-lg font-semibold text-ink mt-6 mb-2" {...props} />,
          h3: (props) => <h4 className="font-serif text-base font-semibold text-ink mt-4 mb-1.5" {...props} />,
          p: (props) => <p className="text-ink" {...props} />,
          strong: (props) => <strong className="font-semibold text-ink" {...props} />,
          ul: (props) => <ul className="list-disc space-y-1.5 pl-5 marker:text-ink-faint" {...props} />,
          ol: (props) => <ol className="list-decimal space-y-1.5 pl-5 marker:text-ink-faint" {...props} />,
          li: (props) => <li className="text-ink" {...props} />,
          a: (props) => (
            <a
              className="text-accent hover:text-accent-hover underline decoration-1 underline-offset-2"
              target={props.href?.startsWith("http") ? "_blank" : undefined}
              rel={props.href?.startsWith("http") ? "noopener noreferrer" : undefined}
              {...props}
            />
          ),
          code: (props) => (
            <code className="font-mono text-sm bg-paper-sunk rounded-sm px-1 py-0.5" {...props} />
          ),
          table: (props) => (
            <div className="scroll-x">
              <table className="w-full border-collapse text-sm" {...props} />
            </div>
          ),
          thead: (props) => <thead className="border-b border-rule-strong" {...props} />,
          th: (props) => <th className="text-left font-sans font-medium text-ink-muted py-1.5 pr-4" {...props} />,
          td: (props) => <td className="py-1.5 pr-4 border-t border-rule align-top" {...props} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
