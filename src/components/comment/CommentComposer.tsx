import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react"
import { COMMENT_BODY_MAX } from "@/lib/comments"
import { encodeMentions, searchMentionUsers, type MentionUser } from "@/lib/mentions"

/**
 * 댓글·답글 입력창 (트랙 E). 최상위 댓글과 답글이 같은 입력창을 쓴다.
 * - '@' 뒤에 닉네임 앞부분을 치면 사용자 자동완성 목록이 뜬다(↑↓ 이동, Enter/Tab 선택, Esc 닫기).
 * - 고른 사람은 입력창에 '@닉네임' 으로 보이고, 등록할 때 멘션 토큰으로 바뀐다(lib/mentions).
 * - onSubmit 이 성공하면 입력창을 비운다. 실패하면 오류를 보여 주고 글은 남겨 둔다.
 */

type CommentComposerProps = {
  onSubmit: (body: string) => Promise<void>
  onCancel?: () => void
  /** 처음 채워 둘 글(답글의 답글이면 '@닉네임 '). */
  initialText?: string
  /** initialText 안에 이미 들어 있는 멘션 대상. */
  initialPicked?: MentionUser[]
  placeholder?: string
  submitLabel?: string
  rows?: number
  autoFocus?: boolean
}

/** 커서 앞 글에서 진행 중인 '@검색어' 를 찾는다. 없으면 null. */
function activeMention(text: string, caret: number): { start: number; query: string } | null {
  const m = /(^|\s)@([^\s@]{1,20})$/.exec(text.slice(0, caret))
  if (!m) return null
  return { start: caret - m[2].length - 1, query: m[2] }
}

export function CommentComposer({
  onSubmit,
  onCancel,
  initialText = "",
  initialPicked = [],
  placeholder = "댓글을 남겨보세요.",
  submitLabel = "댓글 등록",
  rows = 3,
  autoFocus = false,
}: CommentComposerProps) {
  const [text, setText] = useState(initialText)
  const [picked, setPicked] = useState<MentionUser[]>(initialPicked)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [mention, setMention] = useState<{ start: number; query: string } | null>(null)
  const [suggestions, setSuggestions] = useState<MentionUser[]>([])
  const [activeIndex, setActiveIndex] = useState(0)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const listId = useId()

  useEffect(() => {
    if (!autoFocus) return
    const el = textareaRef.current
    if (!el) return
    el.focus()
    el.setSelectionRange(el.value.length, el.value.length)
  }, [autoFocus])

  // 검색어가 바뀌면 잠깐 기다렸다가 찾는다(타자마다 요청하지 않게).
  const query = mention?.query ?? null
  useEffect(() => {
    if (query === null) {
      setSuggestions([])
      return
    }
    let active = true
    const timer = window.setTimeout(() => {
      searchMentionUsers(query).then((list) => {
        if (active) {
          setSuggestions(list)
          setActiveIndex(0)
        }
      })
    }, 200)
    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [query])

  function updateMention(value: string, caret: number) {
    setMention(activeMention(value, caret))
  }

  function pick(user: MentionUser) {
    const el = textareaRef.current
    if (!mention || !el) return
    const caret = el.selectionStart
    const insert = `@${user.nickname} `
    const next = text.slice(0, mention.start) + insert + text.slice(caret)
    setText(next)
    setPicked((prev) => (prev.some((p) => p.id === user.id) ? prev : [...prev, user]))
    setMention(null)
    const pos = mention.start + insert.length
    requestAnimationFrame(() => {
      el.focus()
      el.setSelectionRange(pos, pos)
    })
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (!mention || suggestions.length === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((i) => (i + 1) % suggestions.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((i) => (i - 1 + suggestions.length) % suggestions.length)
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault()
      pick(suggestions[activeIndex])
    } else if (e.key === "Escape") {
      e.preventDefault()
      setMention(null)
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    const trimmed = text.trim()
    if (trimmed === "") return
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(encodeMentions(trimmed, picked))
      setText("")
      setPicked([])
      setMention(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : "댓글을 등록하지 못했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  const listOpen = mention !== null && suggestions.length > 0

  return (
    <form onSubmit={handleSubmit} className="space-y-2">
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            updateMention(e.target.value, e.target.selectionStart)
            if (error) setError(null)
          }}
          onSelect={(e) => updateMention(e.currentTarget.value, e.currentTarget.selectionStart)}
          onKeyDown={handleKeyDown}
          onBlur={() => window.setTimeout(() => setMention(null), 150)}
          rows={rows}
          maxLength={COMMENT_BODY_MAX}
          placeholder={placeholder}
          role="combobox"
          aria-autocomplete="list"
          aria-expanded={listOpen}
          aria-controls={listId}
          aria-activedescendant={listOpen ? `${listId}-${activeIndex}` : undefined}
          className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
        />
        {listOpen && (
          <ul
            id={listId}
            role="listbox"
            aria-label="언급할 사용자"
            className="absolute left-0 top-full z-20 mt-1 w-64 max-w-full overflow-hidden rounded-md border border-border bg-popover py-1 text-popover-foreground shadow-md"
          >
            {suggestions.map((u, i) => (
              <li
                key={u.id}
                id={`${listId}-${i}`}
                role="option"
                aria-selected={i === activeIndex}
                // blur 보다 먼저 고르도록 mousedown 에서 처리
                onMouseDown={(e) => {
                  e.preventDefault()
                  pick(u)
                }}
                onMouseEnter={() => setActiveIndex(i)}
                className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm ${
                  i === activeIndex ? "bg-accent text-accent-foreground" : ""
                }`}
              >
                <span className="flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-xs text-muted-foreground">
                  {u.avatarUrl ? (
                    <img src={u.avatarUrl} alt="" className="size-full object-cover" />
                  ) : (
                    u.nickname.slice(0, 1)
                  )}
                </span>
                <span className="truncate">{u.nickname}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">
          {text.length}/{COMMENT_BODY_MAX} · @닉네임으로 언급
        </span>
        <span className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md px-3 py-2 text-sm text-muted-foreground hover:text-foreground"
            >
              취소
            </button>
          )}
          <button
            type="submit"
            disabled={submitting || text.trim() === ""}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {submitting ? "등록 중…" : submitLabel}
          </button>
        </span>
      </div>
    </form>
  )
}
