import { useEffect, useState } from "react"
import {
  listOpenInquiries,
  listHandledInquiries,
  handleInquiry,
  inquiryTypeLabel,
  type Inquiry,
} from "@/lib/inquiries"
import { ProfileTrigger } from "@/components/profile/ProfileTrigger"

/**
 * 관리자 "문의 큐" — 대기 / 처리 내역 (트랙 C).
 * 21_inquiries.sql 의 RLS(staff 조회) + handle_inquiry RPC 가 있어야 동작.
 *
 * 이 화면은 접수·처리상태만 관리한다. 실제 회신은 기존 쪽지로 한다
 * (로그인 작성자는 이름 클릭 → 프로필 → 쪽지 보내기. 비로그인은 이메일로 회신).
 */
type QueueView = "open" | "handled"

export function AdminInquiryQueue() {
  const [view, setView] = useState<QueueView>("open")
  return (
    <>
      <div className="mb-3 inline-flex rounded-md border border-border p-0.5 text-sm">
        <SegButton active={view === "open"} onClick={() => setView("open")}>
          대기
        </SegButton>
        <SegButton active={view === "handled"} onClick={() => setView("handled")}>
          처리 내역
        </SegButton>
      </div>
      {view === "open" ? <OpenList /> : <HandledList />}
    </>
  )
}

function SegButton({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        "rounded px-3 py-1 font-medium " +
        (active
          ? "bg-secondary text-secondary-foreground"
          : "text-muted-foreground hover:text-foreground")
      }
    >
      {children}
    </button>
  )
}

/** 대기(open) — 처리완료 + 메모. 처리한 행은 목록에서 제거. */
function OpenList() {
  const [items, setItems] = useState<Inquiry[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    listOpenInquiries().then((data) => {
      if (active) setItems(data)
    })
    return () => {
      active = false
    }
  }, [])

  function removeItem(id: string) {
    setItems((list) => list?.filter((it) => it.id !== id) ?? null)
  }

  if (items === null) {
    return <p className="mt-2 text-sm text-muted-foreground">불러오는 중…</p>
  }
  if (items.length === 0) {
    return (
      <p className="mt-2 rounded-lg border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
        대기 중인 문의가 없습니다.
      </p>
    )
  }

  return (
    <>
      <p className="mb-2 text-sm text-muted-foreground">대기 {items.length}건</p>
      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
      <ul className="flex flex-col gap-3">
        {items.map((q) => (
          <OpenCard
            key={q.id}
            inquiry={q}
            onDone={() => removeItem(q.id)}
            onError={setError}
          />
        ))}
      </ul>
    </>
  )
}

/** 처리 내역(handled) — 읽기 전용. */
function HandledList() {
  const [items, setItems] = useState<Inquiry[] | null>(null)

  useEffect(() => {
    let active = true
    listHandledInquiries().then((data) => {
      if (active) setItems(data)
    })
    return () => {
      active = false
    }
  }, [])

  if (items === null) {
    return <p className="mt-2 text-sm text-muted-foreground">불러오는 중…</p>
  }
  if (items.length === 0) {
    return (
      <p className="mt-2 rounded-lg border border-border bg-surface p-6 text-center text-sm text-muted-foreground">
        처리한 문의가 없습니다.
      </p>
    )
  }

  return (
    <>
      <p className="mb-2 text-sm text-muted-foreground">처리 {items.length}건</p>
      <ul className="flex flex-col gap-3">
        {items.map((q) => (
          <HandledCard key={q.id} inquiry={q} />
        ))}
      </ul>
    </>
  )
}

/** 문의 공통 머리(유형 배지 · 제목 · 작성자/이메일 · 본문). */
function InquiryBody({ inquiry }: { inquiry: Inquiry }) {
  const authorName = inquiry.author?.nickname?.trim() || null
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {inquiryTypeLabel(inquiry.type)}
        </span>
        <span className="text-sm font-medium">{inquiry.subject}</span>
      </div>

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">작성자</dt>
        <dd className="min-w-0 truncate">
          {inquiry.author ? (
            <ProfileTrigger userId={inquiry.author.id}>
              {authorName ?? "(닉네임 없음)"}
            </ProfileTrigger>
          ) : (
            "비회원"
          )}
        </dd>
        <dt className="text-muted-foreground">회신 이메일</dt>
        <dd className="min-w-0 truncate">
          <a
            href={`mailto:${inquiry.email}`}
            className="underline-offset-2 hover:underline"
          >
            {inquiry.email}
          </a>
        </dd>
      </dl>

      <div className="mt-3">
        <p className="text-xs text-muted-foreground">문의 내용</p>
        <p className="mt-1 whitespace-pre-wrap break-words rounded-md bg-muted px-3 py-2 text-sm">
          {inquiry.body}
        </p>
      </div>
    </>
  )
}

/** 대기 카드 — 처리완료 + 메모(선택). */
function OpenCard({
  inquiry,
  onDone,
  onError,
}: {
  inquiry: Inquiry
  onDone: () => void
  onError: (msg: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState("")

  async function submit() {
    setBusy(true)
    onError("")
    try {
      await handleInquiry(inquiry.id, note)
      onDone()
    } catch (err) {
      onError(err instanceof Error ? err.message : "처리에 실패했습니다.")
      setBusy(false)
    }
  }

  return (
    <li className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <InquiryBody inquiry={inquiry} />
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatDate(inquiry.createdAt)}
        </span>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        회신은 작성자에게 쪽지(회원) 또는 위 이메일로 보내고, 마무리되면 처리완료로 표시하세요.
      </p>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="처리 메모 (선택, 운영진만 봄)"
        className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="mt-2">
        <button
          type="button"
          onClick={submit}
          disabled={busy}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "처리 중…" : "처리완료"}
        </button>
      </div>
    </li>
  )
}

/** 처리 내역 카드 — 처리일 + 메모. */
function HandledCard({ inquiry }: { inquiry: Inquiry }) {
  return (
    <li className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2">
            <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
              처리완료
            </span>
          </div>
          <InquiryBody inquiry={inquiry} />
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {inquiry.handledAt ? formatDate(inquiry.handledAt) : "—"}
        </span>
      </div>

      {inquiry.handlerNote && (
        <p className="mt-2 rounded-md bg-muted px-3 py-2 text-sm">
          메모: {inquiry.handlerNote}
        </p>
      )}
    </li>
  )
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}
