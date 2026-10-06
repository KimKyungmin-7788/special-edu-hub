import { useState } from "react"
import { Check, Copy, Terminal } from "lucide-react"
import type { StepCommand } from "../steps"

export function CommandBox({ command }: { command: StepCommand }) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(command.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return (
    <div className="mt-4 rounded-xl border bg-surface p-4">
      <p className="flex items-center gap-1.5 text-sm font-semibold">
        <Terminal aria-hidden className="size-4 text-primary" />
        {command.label}
      </p>
      <div className="mt-2 flex items-center gap-3 rounded-lg border bg-background px-4 py-2.5">
        <code className="min-w-0 flex-1 truncate font-mono text-base font-semibold">
          {command.code}
        </code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
        >
          {copied ? (
            <Check aria-hidden className="size-4" />
          ) : (
            <Copy aria-hidden className="size-4" />
          )}
          <span aria-live="polite">{copied ? "복사했어요" : "복사"}</span>
        </button>
      </div>
    </div>
  )
}
