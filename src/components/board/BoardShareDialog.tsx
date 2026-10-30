import { useEffect, useRef, useState } from "react"
import { Check, Link2, Mail, MessageCircle, type LucideIcon } from "lucide-react"
import { Modal } from "@/components/ui/Modal"
import { site } from "@/config/site"
import type { BoardSlug } from "@/lib/board"
import { cn } from "@/lib/utils"

/** 게시글 공유 주소. 연구회 글은 ?board=research — 권한 없는 사람이 열면 '연구회원 전용'으로 안내하기 위해. */
export function boardPostUrl(id: string, slug: BoardSlug) {
  return `${window.location.origin}/board/${id}${slug === "research" ? "?board=research" : ""}`
}

/**
 * 게시글 공유 창 — 위에 링크, 아래에 링크 복사·메일·카카오톡(준비 중) 버튼.
 * 연구회 글은 제목도 연구회원에게만 보이는 정보라, 메일에 제목을 넣지 않고 '연구회원만 열 수 있음'을 적는다.
 */
export function BoardShareDialog({ open, onClose, id, title, slug }: {
  open: boolean
  onClose: () => void
  id: string
  title: string
  slug: BoardSlug
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const url = boardPostUrl(id, slug)
  const research = slug === "research"

  useEffect(() => {
    if (open) return
    setCopied(false)
    setError(null)
  }, [open])

  async function copy() {
    setError(null)
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      // 브라우저가 클립보드를 막은 경우 — 주소를 선택해 두어 바로 Ctrl+C 할 수 있게
      inputRef.current?.select()
      setError("복사하지 못했어요. 선택된 링크를 직접 복사해 주세요.")
    }
  }

  const subject = research ? `[${site.name}] 연구회게시판 글 공유` : `[${site.name}] ${title}`
  const body = research ? `연구회게시판 글 링크예요. 연구회원만 열 수 있어요.\n${url}` : `${title}\n${url}`
  const mailto = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`

  return (
    <Modal open={open} onClose={onClose} labelledBy="board-share-title" className="max-w-md">
      <div className="p-6">
        <h2 id="board-share-title" className="pr-8 text-base font-semibold">공유하기</h2>
        {research && <p className="mt-1 text-xs text-muted-foreground">연구회게시판 글은 연구회원만 열 수 있어요.</p>}

        <label htmlFor="board-share-url" className="sr-only">공유 링크</label>
        <input
          id="board-share-url"
          ref={inputRef}
          readOnly
          value={url}
          onFocus={(e) => e.currentTarget.select()}
          className="mt-4 w-full rounded-md border border-input bg-surface px-3 py-2.5 text-sm text-muted-foreground"
        />

        <div className="mt-5 grid grid-cols-3 gap-2">
          <ShareAction icon={copied ? Check : Link2} label={copied ? "복사됨" : "링크 복사"} onClick={() => void copy()} active={copied} />
          <ShareAction icon={Mail} label="메일" href={mailto} />
          <ShareAction icon={MessageCircle} label="카카오톡" note="준비 중" disabled />
        </div>

        {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
      </div>
    </Modal>
  )
}

function ShareAction({ icon: Icon, label, note, onClick, href, active, disabled }: {
  icon: LucideIcon
  label: string
  note?: string
  onClick?: () => void
  href?: string
  active?: boolean
  disabled?: boolean
}) {
  const className = cn(
    "flex flex-col items-center gap-2 rounded-lg px-2 py-3 text-sm transition-colors",
    disabled ? "cursor-not-allowed text-muted-foreground" : "hover:bg-accent",
  )
  const content = <>
    <span className={cn(
      "inline-flex size-12 items-center justify-center rounded-full border border-border",
      active ? "bg-primary text-primary-foreground" : "bg-muted",
      disabled && "opacity-50",
    )}>
      <Icon className="size-5" aria-hidden />
    </span>
    <span className="font-medium">{label}</span>
    {note && <span className="-mt-1.5 text-xs text-muted-foreground">{note}</span>}
  </>
  if (href) return <a href={href} className={className}>{content}</a>
  return <button type="button" onClick={onClick} disabled={disabled} aria-live={active !== undefined ? "polite" : undefined} className={className}>{content}</button>
}
