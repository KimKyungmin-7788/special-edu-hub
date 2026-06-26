import { useEffect, useState } from "react"
import {
  listPendingRequests,
  listReviewedRequests,
  approveRequest,
  rejectRequest,
  createDocSignedUrl,
  type AdminVerificationRequest,
} from "@/lib/verification"

/**
 * 관리자 "교사인증 큐" — 대기(심사) / 처리 내역(이력) 두 화면 (묶음 A·B-1).
 * 14_admin.sql 의 verif_update_admin · verif_docs_read_admin 정책이 있어야 동작.
 * 승인 시 09 의 트리거가 신청자 is_teacher_verified 를 반영한다.
 */
type QueueView = "pending" | "reviewed"

export function AdminVerifyQueue() {
  const [view, setView] = useState<QueueView>("pending")
  return (
    <>
      <div className="mb-3 inline-flex rounded-md border border-border p-0.5 text-sm">
        <SegButton active={view === "pending"} onClick={() => setView("pending")}>
          대기
        </SegButton>
        <SegButton active={view === "reviewed"} onClick={() => setView("reviewed")}>
          처리 내역
        </SegButton>
      </div>
      {view === "pending" ? <PendingList /> : <ReviewedList />}
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

/** 대기(pending) — 서류 열람 + 승인/반려. 처리한 행은 목록에서 제거. */
function PendingList() {
  const [items, setItems] = useState<AdminVerificationRequest[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    listPendingRequests().then((data) => {
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
        대기 중인 인증 신청이 없습니다.
      </p>
    )
  }

  return (
    <>
      <p className="mb-2 text-sm text-muted-foreground">
        심사 대기 {items.length}건
      </p>
      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
      <ul className="flex flex-col gap-3">
        {items.map((req) => (
          <QueueCard
            key={req.id}
            req={req}
            onDone={() => removeItem(req.id)}
            onError={setError}
          />
        ))}
      </ul>
    </>
  )
}

/** 처리 내역(approved/rejected) — 읽기 전용. 서류는 노출하지 않는다. */
function ReviewedList() {
  const [items, setItems] = useState<AdminVerificationRequest[] | null>(null)

  useEffect(() => {
    let active = true
    listReviewedRequests().then((data) => {
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
        처리한 인증 신청이 없습니다.
      </p>
    )
  }

  return (
    <>
      <p className="mb-2 text-sm text-muted-foreground">처리 {items.length}건</p>
      <ul className="flex flex-col gap-3">
        {items.map((req) => (
          <ReviewedCard key={req.id} req={req} />
        ))}
      </ul>
    </>
  )
}

/** 처리 내역 카드 — 상태 배지 + 신청자·지역·학교 + 처리일 + (반려)사유. */
function ReviewedCard({ req }: { req: AdminVerificationRequest }) {
  const approved = req.status === "approved"
  return (
    <li className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span
              className={
                "rounded-full px-2 py-0.5 text-xs font-medium " +
                (approved
                  ? "border border-border text-muted-foreground"
                  : "bg-destructive/10 text-destructive")
              }
            >
              {approved ? "승인" : "반려"}
            </span>
            <span className="truncate text-sm font-medium">
              {req.applicantNickname || "(닉네임 없음)"}
            </span>
          </div>
          {req.applicantEmail && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {req.applicantEmail}
            </p>
          )}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {req.reviewedAt ? formatDate(req.reviewedAt) : "—"}
        </span>
      </div>

      <p className="mt-2 text-sm text-muted-foreground">
        {req.region} · {req.school}
      </p>

      {!approved && req.rejectReason && (
        <p className="mt-2 rounded-md bg-muted px-3 py-2 text-sm">
          반려 사유: {req.rejectReason}
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

/** 신청 한 건 카드 — 신청자·지역·학교·신청일 + 서류 보기 + 승인/반려. */
function QueueCard({
  req,
  onDone,
  onError,
}: {
  req: AdminVerificationRequest
  onDone: () => void
  onError: (msg: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [rejecting, setRejecting] = useState(false)
  const [reason, setReason] = useState("")

  async function openDoc() {
    onError("")
    // 새 탭은 클릭 제스처 안에서 즉시 연다(서명 URL 을 await 한 뒤 window.open 하면
    // 팝업 차단기가 막는다). opener 를 끊어 noopener 와 같은 보안 효과를 낸다.
    const win = window.open("about:blank", "_blank")
    if (win) win.opener = null
    try {
      const url = await createDocSignedUrl(req.documentPath)
      if (win) win.location.href = url
      else window.location.href = url // 팝업이 끝내 막히면 현재 탭으로 폴백
    } catch (err) {
      if (win) win.close()
      onError(err instanceof Error ? err.message : "서류를 열 수 없습니다.")
    }
  }

  async function approve() {
    setBusy(true)
    onError("")
    try {
      await approveRequest(req.id)
      onDone()
    } catch (err) {
      onError(err instanceof Error ? err.message : "승인에 실패했습니다.")
      setBusy(false)
    }
  }

  async function reject() {
    if (reason.trim() === "") {
      onError("반려 사유를 입력하세요.")
      return
    }
    setBusy(true)
    onError("")
    try {
      await rejectRequest(req.id, reason)
      onDone()
    } catch (err) {
      onError(err instanceof Error ? err.message : "반려에 실패했습니다.")
      setBusy(false)
    }
  }

  return (
    <li className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium">
            {req.applicantNickname || "(닉네임 없음)"}
          </p>
          {req.applicantEmail && (
            <p className="truncate text-xs text-muted-foreground">
              {req.applicantEmail}
            </p>
          )}
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatDate(req.createdAt)}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">근무 지역</dt>
        <dd>{req.region}</dd>
        <dt className="text-muted-foreground">학교</dt>
        <dd>{req.school}</dd>
      </dl>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={openDoc}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent"
        >
          서류 보기 ↗
        </button>
        <button
          type="button"
          onClick={approve}
          disabled={busy}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "처리 중…" : "승인"}
        </button>
        <button
          type="button"
          onClick={() => setRejecting((v) => !v)}
          disabled={busy}
          className="rounded-md border border-destructive/40 px-3 py-1.5 text-sm font-medium text-destructive hover:bg-destructive/5 disabled:opacity-50"
        >
          반려
        </button>
      </div>

      {rejecting && (
        <div className="mt-3 flex flex-col gap-2">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            placeholder="반려 사유 (신청자에게 표시됩니다)"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={reject}
            disabled={busy}
            className="self-start rounded-md bg-destructive px-3 py-1.5 text-sm font-medium text-destructive-foreground hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "처리 중…" : "반려 확정"}
          </button>
        </div>
      )}
    </li>
  )
}
