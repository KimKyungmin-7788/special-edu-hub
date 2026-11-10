import { useEffect, useState } from "react"
import { Link } from "react-router-dom"
import { verifyText } from "@/config/safety"
import { VerifyMark } from "@/components/app/VerifyMark"
import { getAllApps, type App } from "@/lib/apps"
import { getAppChecks, requestSafetyCheck, reviewApp, type AppCheck, type ReviewAction } from "@/lib/safety"

/**
 * 운영진 "안전 점검" 탭(68) — 자동 점검에서 걸렸거나 공개되지 않은 자료를 모아 보고
 * 승인 · 보완 요청 · 게시 중단 · 다시 점검을 한다. 권한은 DB(review_app RPC·RLS)가 강제한다.
 */

/** 운영진이 봐야 하는 자료: 공개 상태가 아니거나, 마크가 검토 중·재검증 필요 */
export function needsSafetyReview(app: App): boolean {
  return app.reviewStatus !== "approved" || app.verificationStatus === "reviewing" || app.verificationStatus === "reverify"
}

export function AdminSafetyQueue() {
  const [apps, setApps] = useState<App[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [bulk, setBulk] = useState<{ done: number; total: number } | null>(null)

  const load = () => getAllApps().then(setApps)
  useEffect(() => {
    load()
  }, [])

  if (apps === null) return <p className="mt-2 text-sm text-muted-foreground">불러오는 중…</p>

  const queue = apps.filter(needsSafetyReview)
  const unchecked = apps.filter((a) => a.reviewStatus === "approved" && a.verificationStatus === "unverified" && a.appUrl.trim())

  /** 아직 점검하지 않은 공개 자료를 차례로 점검한다(공개는 유지 — 걸리면 '재검증 필요'로 이 목록에 올라온다) */
  async function checkAll() {
    setError(null)
    setBulk({ done: 0, total: unchecked.length })
    for (const [i, app] of unchecked.entries()) {
      await requestSafetyCheck(app.id, "staff").catch((e) => setError(e instanceof Error ? e.message : "점검 실패"))
      setBulk({ done: i + 1, total: unchecked.length })
    }
    setBulk(null)
    load()
  }

  return (
    <>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          확인할 자료 {queue.length}개 · 점검 미확인 {unchecked.length}개
        </p>
        {unchecked.length > 0 && (
          <button
            type="button"
            onClick={checkAll}
            disabled={bulk !== null}
            className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
          >
            {bulk ? `점검 중… ${bulk.done}/${bulk.total}` : "점검 미확인 자료 모두 점검"}
          </button>
        )}
      </div>
      {error && <p className="mb-2 text-sm text-destructive">{error}</p>}

      {queue.length === 0 ? (
        <p className="rounded-lg border border-border bg-card p-6 text-center text-sm text-muted-foreground">
          확인할 자료가 없습니다.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border">
          {queue.map((app) => (
            <QueueItem key={app.id} app={app} onChanged={load} />
          ))}
        </ul>
      )}
    </>
  )
}

function QueueItem({ app, onChanged }: { app: App; onChanged: () => void }) {
  const [checks, setChecks] = useState<AppCheck[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [note, setNote] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getAppChecks(app.id, 5).then((list) => {
      if (active) setChecks(list)
    })
    return () => {
      active = false
    }
  }, [app.id, app.reviewStatus, app.verificationStatus])

  async function run(job: () => Promise<void>) {
    setError(null)
    setBusy(true)
    try {
      await job()
      setNote("")
      onChanged()
    } catch (err) {
      setError(err instanceof Error ? err.message : "처리에 실패했습니다.")
    } finally {
      setBusy(false)
    }
  }
  const review = (action: ReviewAction) => run(() => reviewApp(app.id, action, note.trim()))

  const latest = checks[0]
  let host = ""
  try {
    host = app.appUrl ? new URL(app.appUrl).hostname : ""
  } catch {
    host = app.appUrl
  }

  return (
    <li className="p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Link to={`/app/${app.id}`} className="font-medium hover:underline">
          {app.title}
        </Link>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs text-secondary-foreground">
          {verifyText.review[app.reviewStatus].label}
        </span>
        <VerifyMark status={app.verificationStatus} />
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        {app.authorName || "작성자 없음"} · {app.createdAt.slice(0, 10)} 등록{host && ` · ${host}`}
      </p>

      {latest ? (
        <ul className="mt-2 space-y-0.5 text-sm">
          {latest.findings.map((f) => (
            <li key={f.rule + f.evidence} className={f.level === "block" ? "text-destructive" : "text-muted-foreground"}>
              {f.evidence}
            </li>
          ))}
          {latest.findings.length === 0 && (
            <li className="text-muted-foreground">
              {latest.status === "unverifiable" ? "파일을 받아 볼 수 없어 확인하지 못했습니다." : "걸린 것이 없습니다."}
            </li>
          )}
        </ul>
      ) : (
        <p className="mt-2 text-sm text-muted-foreground">점검 기록이 없습니다.</p>
      )}

      <input
        className="mt-3 h-9 w-full rounded-md border border-input bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
        placeholder="작성자에게 전할 말(보완 요청·게시 중단 사유)"
        maxLength={500}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        disabled={busy}
      />
      {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {app.reviewStatus !== "approved" && <Action onClick={() => review("approve")} disabled={busy}>승인</Action>}
        {app.reviewStatus !== "changes_requested" && (
          <Action onClick={() => review("request_changes")} disabled={busy}>보완 요청</Action>
        )}
        {app.reviewStatus !== "suspended" && <Action onClick={() => review("suspend")} disabled={busy}>게시 중단</Action>}
        {app.appUrl.trim() && (
          <Action onClick={() => run(() => requestSafetyCheck(app.id, "staff"))} disabled={busy}>
            {verifyText.recheck}
          </Action>
        )}
        <Action onClick={() => setShowHistory((v) => !v)} disabled={false}>점검 이력</Action>
      </div>

      {showHistory && (
        <ul className="mt-2 space-y-1 rounded-md bg-surface px-3 py-2 text-xs text-muted-foreground">
          {checks.length === 0 && <li>점검 기록이 없습니다.</li>}
          {checks.map((c) => (
            <li key={c.createdAt}>
              {c.createdAt.slice(0, 16).replace("T", " ")} ·{" "}
              {c.status === "pass" ? "걸린 것 없음" : c.status === "blocked" ? "확인 필요" : "확인 불가"}
              {c.findings.length > 0 && ` · ${c.findings.map((f) => f.evidence).join(" / ")}`}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

function Action({ onClick, disabled, children }: { onClick: () => void; disabled: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-md border border-border px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
    >
      {children}
    </button>
  )
}
