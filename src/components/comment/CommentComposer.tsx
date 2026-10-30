import {
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
} from "react"
import { ImagePlus, X } from "lucide-react"
import {
  COMMENT_BODY_MAX,
  COMMENT_IMAGE_MAX,
  COMMENT_IMAGE_MIME,
  type CommentImage,
} from "@/lib/comments"
import { encodeMentions, searchMentionUsers, type MentionUser } from "@/lib/mentions"
import { avatarTone, AVATAR_PHOTO } from "@/lib/avatarTone"
import { cn } from "@/lib/utils"

/**
 * 댓글·답글 입력창 (트랙 E). 최상위 댓글과 답글이 같은 입력창을 쓴다.
 * - '@' 뒤에 닉네임 앞부분을 치면 사용자 자동완성 목록이 뜬다(↑↓ 이동, Enter/Tab 선택, Esc 닫기).
 * - 고른 사람은 입력창에 '@닉네임' 으로 보이고, 등록할 때 멘션 토큰으로 바뀐다(lib/mentions).
 * - 사진 첨부(allowImages = 인증교사): 최대 4장. 새 사진을 붙이면 학생 개인정보 확인 체크가 필수.
 *   파일은 등록할 때 올린다(고르기만 하고 취소하면 서버에 남지 않게).
 * - onSubmit 이 성공하면 입력창을 비운다. 실패하면 오류를 보여 주고 글은 남겨 둔다.
 */

/** 등록할 때 넘기는 이미지 — kept = 기존 사진 중 남길 경로(수정 때), files = 새로 고른 파일. */
export type ComposerImages = { kept: string[]; files: File[] }

const PRIVACY_CHECK =
  "사진에 학생이 식별되지 않도록 처리했거나(얼굴·이름·학교 등), 보호자 동의를 받았습니다."

type CommentComposerProps = {
  onSubmit: (body: string, images: ComposerImages) => Promise<void>
  onCancel?: () => void
  /** 처음 채워 둘 글(답글의 답글이면 '@닉네임 '). */
  initialText?: string
  /** initialText 안에 이미 들어 있는 멘션 대상. */
  initialPicked?: MentionUser[]
  placeholder?: string
  submitLabel?: string
  rows?: number
  autoFocus?: boolean
  /** 사진을 새로 붙일 수 있는지(인증교사). 기존 사진 빼기는 항상 된다. */
  allowImages?: boolean
  /** 수정할 때 이미 붙어 있는 사진. */
  initialImages?: CommentImage[]
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
  allowImages = false,
  initialImages = [],
}: CommentComposerProps) {
  const [text, setText] = useState(initialText)
  const [picked, setPicked] = useState<MentionUser[]>(initialPicked)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [mention, setMention] = useState<{ start: number; query: string } | null>(null)
  const [suggestions, setSuggestions] = useState<MentionUser[]>([])
  const [activeIndex, setActiveIndex] = useState(0)

  const [kept, setKept] = useState<CommentImage[]>(initialImages)
  const [files, setFiles] = useState<File[]>([])
  const [privacyOk, setPrivacyOk] = useState(false)

  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const listId = useId()

  // 새로 고른 파일 미리보기 주소. 바뀌거나 사라지면 해제한다.
  const previews = useMemo(() => files.map((f) => URL.createObjectURL(f)), [files])
  useEffect(() => () => previews.forEach((u) => URL.revokeObjectURL(u)), [previews])

  const imageCount = kept.length + files.length

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

  function handleFiles(e: ChangeEvent<HTMLInputElement>) {
    const chosen = Array.from(e.target.files ?? [])
    e.target.value = "" // 같은 파일을 다시 고를 수 있게
    if (chosen.length === 0) return
    if (chosen.some((f) => !COMMENT_IMAGE_MIME.includes(f.type))) {
      setError("이미지(PNG·JPG·WebP·GIF) 파일만 첨부할 수 있습니다.")
      return
    }
    const room = COMMENT_IMAGE_MAX - imageCount
    if (chosen.length > room) setError(`이미지는 최대 ${COMMENT_IMAGE_MAX}장까지 첨부할 수 있습니다.`)
    else setError(null)
    if (room > 0) setFiles((prev) => [...prev, ...chosen.slice(0, room)])
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    const trimmed = text.trim()
    if (trimmed === "" && imageCount === 0) return
    if (files.length > 0 && !privacyOk) {
      setError("사진을 올리려면 학생 개인정보 확인에 체크해 주세요.")
      return
    }
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(encodeMentions(trimmed, picked), {
        kept: kept.map((k) => k.path),
        files,
      })
      setText("")
      setPicked([])
      setMention(null)
      setKept([])
      setFiles([])
      setPrivacyOk(false)
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
                <span
                  className={cn(
                    "flex size-6 shrink-0 items-center justify-center overflow-hidden rounded-full border text-xs",
                    u.avatarUrl ? AVATAR_PHOTO : avatarTone(u.nickname),
                  )}
                >
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
      {imageCount > 0 && (
        <ul className="flex flex-wrap gap-2" aria-label="첨부한 사진">
          {kept.map((img) => (
            <li key={img.path} className="relative">
              <img
                src={img.url}
                alt=""
                className="size-20 rounded-md border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => setKept((prev) => prev.filter((k) => k.path !== img.path))}
                disabled={submitting}
                aria-label="사진 빼기"
                className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
          {files.map((f, i) => (
            <li key={previews[i]} className="relative">
              <img
                src={previews[i]}
                alt=""
                className="size-20 rounded-md border border-border object-cover"
              />
              <button
                type="button"
                onClick={() => setFiles((prev) => prev.filter((x) => x !== f))}
                disabled={submitting}
                aria-label="사진 빼기"
                className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground"
              >
                <X className="size-3" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {files.length > 0 && (
        <label className="flex items-start gap-2 rounded-md border border-border bg-card p-2.5 text-xs">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={privacyOk}
            onChange={(e) => {
              setPrivacyOk(e.target.checked)
              if (error) setError(null)
            }}
            disabled={submitting}
          />
          <span>
            <span className="font-medium">학생 개인정보 확인 (필수)</span>
            <span className="mt-0.5 block text-muted-foreground">{PRIVACY_CHECK}</span>
          </span>
        </label>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          {allowImages && (
            <>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={submitting || imageCount >= COMMENT_IMAGE_MAX}
                className="inline-flex items-center gap-1 rounded-md px-1.5 py-1 hover:bg-accent hover:text-foreground disabled:opacity-60"
              >
                <ImagePlus className="size-4" aria-hidden />
                사진 {imageCount}/{COMMENT_IMAGE_MAX}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept={COMMENT_IMAGE_MIME.join(",")}
                multiple
                onChange={handleFiles}
                className="hidden"
              />
              <span className="h-3 w-px bg-border" aria-hidden />
            </>
          )}
          <span>
            {text.length}/{COMMENT_BODY_MAX} · @닉네임으로 언급
          </span>
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
            disabled={submitting || (text.trim() === "" && imageCount === 0)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {submitting ? "등록 중…" : submitLabel}
          </button>
        </span>
      </div>
    </form>
  )
}
