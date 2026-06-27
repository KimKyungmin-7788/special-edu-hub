import { useEffect, useState } from "react"
import {
  listPendingReports,
  listHandledReports,
  handleReport,
  reasonLabel,
  type Report,
} from "@/lib/reports"
import { ProfileTrigger } from "@/components/profile/ProfileTrigger"

/**
 * 관리자 "신고 큐" — 대기 / 처리 내역 두 화면 (묶음 R-3).
 * 17_reports.sql 의 reports RLS(staff 조회) + handle_report RPC 가 있어야 동작.
 *
 * 이 화면은 staff 의 판정(조치함/기각)·메모를 기록한다.
 * 실제 조치(앱 숨김·교사인증 회수 등)는 기존 앱 관리·교사인증·회원 탭의 도구로 한다.
 * (강제탈퇴는 service_role Edge Function — 후속)
 */
type QueueView = "pending" | "handled"

const TARGET_LABEL: Record<Report["targetType"], string> = {
  message: "쪽지",
  user: "사용자",
  app: "앱",
}

export function AdminReportQueue() {
  const [view, setView] = useState<QueueView>("pending")
  return (
    <>
      <div className="mb-3 inline-flex rounded-md border border-border p-0.5 text-sm">
        <SegButton active={view === "pending"} onClick={() => setView("pending")}>
          대기
        </SegButton>
        <SegButton active={view === "handled"} onClick={() => setView("handled")}>
          처리 내역
        </SegButton>
      </div>
      {view === "pending" ? <PendingList /> : <HandledList />}
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

/** 대기(pending) — 조치함/기각 + 메모. 처리한 행은 목록에서 제거. */
function PendingList() {
  const [items, setItems] = useState<Report[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    listPendingReports().then((data) => {
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
        대기 중인 신고가 없습니다.
      </p>
    )
  }

  return (
    <>
      <p className="mb-2 text-sm text-muted-foreground">대기 {items.length}건</p>
      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}
      <ul className="flex flex-col gap-3">
        {items.map((r) => (
          <PendingCard
            key={r.id}
            report={r}
            onDone={() => removeItem(r.id)}
            onError={setError}
          />
        ))}
      </ul>
    </>
  )
}

/** 처리 내역(resolved/dismissed) — 읽기 전용. */
function HandledList() {
  const [items, setItems] = useState<Report[] | null>(null)

  useEffect(() => {
    let active = true
    listHandledReports().then((data) => {
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
        처리한 신고가 없습니다.
      </p>
    )
  }

  return (
    <>
      <p className="mb-2 text-sm text-muted-foreground">처리 {items.length}건</p>
      <ul className="flex flex-col gap-3">
        {items.map((r) => (
          <HandledCard key={r.id} report={r} />
        ))}
      </ul>
    </>
  )
}

/** 신고 공통 머리(대상 배지 · 사유 · 신고자/피신고자 · 본문 스냅샷). */
function ReportBody({ report }: { report: Report }) {
  const reporterName = report.reporter.nickname?.trim() || "(닉네임 없음)"
  const reportedName = report.reported?.nickname?.trim() || "(닉네임 없음)"
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full border border-border px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {TARGET_LABEL[report.targetType]}
        </span>
        <span className="text-sm font-medium">{reasonLabel(report.reason)}</span>
      </div>

      <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">신고자</dt>
        <dd className="min-w-0 truncate">{reporterName}</dd>
        <dt className="text-muted-foreground">피신고자</dt>
        <dd className="min-w-0 truncate">
          {report.reported ? (
            <ProfileTrigger userId={report.reported.id}>
              {reportedName}
            </ProfileTrigger>
          ) : (
            reportedName
          )}
        </dd>
      </dl>

      {report.targetSnapshot && (
        <div className="mt-3">
          <p className="text-xs text-muted-foreground">신고된 내용</p>
          <p className="mt-1 whitespace-pre-wrap break-words rounded-md bg-muted px-3 py-2 text-sm">
            {report.targetSnapshot}
          </p>
        </div>
      )}

      {report.detail && (
        <p className="mt-2 text-sm">
          <span className="text-muted-foreground">상세: </span>
          {report.detail}
        </p>
      )}
    </>
  )
}

/** 대기 카드 — 조치함/기각 + 처리 메모(선택). */
function PendingCard({
  report,
  onDone,
  onError,
}: {
  report: Report
  onDone: () => void
  onError: (msg: string) => void
}) {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState("")

  async function submit(status: "resolved" | "dismissed") {
    setBusy(true)
    onError("")
    try {
      await handleReport(report.id, status, note)
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
          <ReportBody report={report} />
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {formatDate(report.createdAt)}
        </span>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">
        실제 조치(앱 숨김·교사인증 회수 등)는 앱 관리·교사인증·회원 탭에서 진행하세요.
      </p>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        rows={2}
        placeholder="처리 메모 (선택, 운영진만 봄)"
        className="mt-2 w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => submit("resolved")}
          disabled={busy}
          className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? "처리 중…" : "조치함"}
        </button>
        <button
          type="button"
          onClick={() => submit("dismissed")}
          disabled={busy}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          기각
        </button>
      </div>
    </li>
  )
}

/** 처리 내역 카드 — 판정 배지 + 처리일 + 메모. */
function HandledCard({ report }: { report: Report }) {
  const resolved = report.status === "resolved"
  return (
    <li className="rounded-lg border border-border bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex items-center gap-2">
            <span
              className={
                "rounded-full px-2 py-0.5 text-xs font-medium " +
                (resolved
                  ? "border border-border text-muted-foreground"
                  : "bg-muted text-muted-foreground")
              }
            >
              {resolved ? "조치함" : "기각"}
            </span>
          </div>
          <ReportBody report={report} />
        </div>
        <span className="shrink-0 text-xs text-muted-foreground">
          {report.handledAt ? formatDate(report.handledAt) : "—"}
        </span>
      </div>

      {report.handlerNote && (
        <p className="mt-2 rounded-md bg-muted px-3 py-2 text-sm">
          메모: {report.handlerNote}
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
