import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react"
import { Check, Info } from "lucide-react"
import { Modal } from "@/components/ui/Modal"
import { recordConsents, type ConsentItem } from "@/lib/consents"
import { consentLetter as letter, consents } from "@/config/consents"

/**
 * 약관 동의 창(66) — 로그인 뒤 아직 동의하지 않은 문서가 있는 회원에게
 * (기존 회원·구글 가입자, 문서가 개정된 경우). 닫으면 다음 로그인에 다시 묻는다.
 * 편지 형식: 쉬운 말로 푼 약속을 먼저 보여 주고, 정식 문서는 '자세히 보기'로 펼친다.
 * 편지를 끝까지 내려 읽어야 버튼을 누를 수 있다. 다른 화면으로 넘어가는 전문 링크는 맨 아래에 둔다.
 */
export function ConsentDialog({
  pending,
  onComplete,
  onClose,
}: {
  pending: ConsentItem[]
  onComplete: () => void
  onClose: () => void
}) {
  const [agreed, setAgreed] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // 편지를 끝까지 내렸는지 — 한 번 닿으면 유지. 화면이 커서 스크롤이 없으면 처음부터 닿은 것.
  const [readAll, setReadAll] = useState(false)
  const scrollRef = useRef<HTMLFormElement>(null)
  function checkRead() {
    const el = scrollRef.current
    if (el && el.scrollHeight - el.scrollTop - el.clientHeight < 24) setReadAll(true)
  }
  useEffect(checkRead, [])

  const count = letter.counts[pending.length] ?? ""
  const fill = (text: string) => text.replace("{count}", count)
  const pledge = pending.some((p) => p.kind === "upload_pledge") ? consents.upload_pledge : null

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    if (!agreed) return setError("필수 항목에 모두 동의해 주세요.")
    setSaving(true)
    try {
      await recordConsents(pending, "login")
      onComplete()
    } catch (err) {
      setError(err instanceof Error ? err.message : "저장에 실패했습니다.")
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={onClose} labelledBy="consent-title" className="max-w-md">
      <form
        ref={scrollRef}
        onScroll={checkRead}
        onSubmit={handleSubmit}
        className="flex max-h-[88vh] flex-col overflow-y-auto p-6 sm:p-8"
      >
        <h2 id="consent-title" className="text-2xl font-bold tracking-tight">
          {letter.greeting}
        </h2>
        <p className="mt-2.5 text-[0.95rem] leading-relaxed text-muted-foreground">
          <Emphasis text={fill(letter.lead)} />
        </p>

        <p className="mt-5 text-xs text-muted-foreground">{fill(letter.sectionLabel)}</p>
        <ol className="mt-1 divide-y divide-border border-y border-border">
          {pending.map((p, i) => {
            const promise = letter.promises[p.kind]
            const doc = consents[p.kind]
            return (
              <li key={p.kind} className="flex gap-3 py-3.5">
                <span
                  aria-hidden
                  className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground"
                >
                  {i + 1}
                </span>
                <div className="min-w-0">
                  <p className="font-bold leading-snug">{promise.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                    <Emphasis text={promise.body} />
                  </p>
                  {doc.items && (
                    <More label={promise.more}>
                      <DocItems items={doc.items} />
                    </More>
                  )}
                </div>
              </li>
            )
          })}
        </ol>

        {pledge?.notice && (
          <div className="mt-4 rounded-lg bg-surface px-4 py-3">
            <p className="flex items-center gap-1.5 text-sm font-bold">
              <Info className="size-4 shrink-0" aria-hidden />
              {letter.noteTitle}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {pledge.notice} {pledge.recommend}
            </p>
            {pledge.details && (
              <More label={letter.noteMore}>
                <DocItems items={pledge.details} />
              </More>
            )}
          </div>
        )}

        <p className="mt-4 text-right text-sm text-muted-foreground">{letter.signature}</p>

        {error && (
          <p role="alert" className="mt-3 text-xs text-destructive">
            {error}
          </p>
        )}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <label className="inline-flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => {
                setAgreed(e.target.checked)
                if (error) setError(null)
              }}
              disabled={saving}
            />
            {fill(letter.agree)}
          </label>
          <button
            type="submit"
            disabled={saving || !readAll}
            className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "저장 중…" : letter.submit}
          </button>
        </div>
        {!readAll && <p className="mt-2 text-right text-xs text-muted-foreground">{letter.readHint}</p>}

        <p className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
          {letter.fullLinks.map((l) => (
            <a key={l.href} href={l.href} target="_blank" rel="noopener" className="underline">
              {l.label}
            </a>
          ))}
        </p>
      </form>
    </Modal>
  )
}

/** **낱말** 로 감싼 부분을 연두 바탕 강조로 그린다 */
function Emphasis({ text }: { text: string }) {
  return (
    <>
      {text.split("**").map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="rounded-sm bg-brand-muted px-0.5 font-semibold text-foreground">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  )
}

/**
 * 정식 문서의 항목들을 읽기 쉽게 — "이름: 내용" 꼴은 이름을 굵게 하고 내용을 쉼표마다 한 줄씩,
 * 문장 꼴은 체크 표시와 함께 한 줄씩. 글자는 문서 그대로다.
 */
function DocItems({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2.5 rounded-md bg-surface px-3 py-2.5 text-[0.8125rem] text-foreground">
      {items.map((item) => {
        const cut = item.indexOf(": ")
        if (cut < 0)
          return (
            <li key={item} className="flex gap-2">
              <Check className="mt-0.5 size-3.5 shrink-0 text-primary" aria-hidden />
              <span>{item}</span>
            </li>
          )
        return (
          <li key={item}>
            <p className="font-semibold">{item.slice(0, cut)}</p>
            <ul className="mt-0.5 text-muted-foreground">
              {item.slice(cut + 2).split(", ").map((part) => (
                <li key={part}>· {part}</li>
              ))}
            </ul>
          </li>
        )
      })}
    </ul>
  )
}

/** 눌러서 펼치는 정식 문서 */
function More({ label, children }: { label: string; children: ReactNode }) {
  return (
    <details className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
      <summary className="cursor-pointer underline">{label}</summary>
      <div className="mt-1.5">{children}</div>
    </details>
  )
}
