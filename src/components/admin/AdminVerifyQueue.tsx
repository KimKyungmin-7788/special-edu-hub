import { useEffect, useState } from "react"
import {
  listPendingRequests,
  approveRequest,
  rejectRequest,
  createDocSignedUrl,
  type AdminVerificationRequest,
} from "@/lib/verification"

/**
 * 관리자 "교사인증 큐" — pending 신청 목록 + 서류 열람 + 승인/반려 (묶음 A).
 * 14_admin.sql 의 verif_update_admin · verif_docs_read_admin 정책이 있어야 동작.
 * 승인 시 09 의 트리거가 신청자 is_teacher_verified 를 반영한다.
 * 처리한 행은 pending 에서 빠지므로 목록에서 제거한다.
 */
export function AdminVerifyQueue() {
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
    try {
      const url = await createDocSignedUrl(req.documentPath)
      window.open(url, "_blank", "noopener,noreferrer")
    } catch (err) {
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
