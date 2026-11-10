import { useEffect, useState } from "react"
import { TriangleAlert } from "lucide-react"
import { verifyText } from "@/config/safety"
import type { App } from "@/lib/apps"
import { getAppChecks, requestSafetyCheck, type AppCheck } from "@/lib/safety"

/**
 * 공개되지 않은 자료의 안내(68) — 작성자·운영진에게만 보인다(그 밖의 사람은 자료 자체가 안 보인다).
 * 자동 점검에서 걸린 항목과 "다시 점검" 버튼. 점검이 끝나면 onChecked 로 자료를 다시 읽게 한다.
 */
export function ReviewNotice({ app, onChecked }: { app: App; onChecked: () => void }) {
  const [check, setCheck] = useState<AppCheck | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    getAppChecks(app.id).then((list) => {
      if (active) setCheck(list[0] ?? null)
    })
    return () => {
      active = false
    }
  }, [app.id, app.reviewStatus, app.verificationStatus])

  async function recheck() {
    setError(null)
    setBusy(true)
    try {
      await requestSafetyCheck(app.id, "manual")
      onChecked()
    } catch (err) {
      setError(err instanceof Error ? err.message : "자동 점검을 하지 못했습니다.")
    } finally {
      setBusy(false)
    }
  }

  const blocks = check?.status === "blocked" ? check.findings.filter((f) => f.level === "block") : []
  const canRecheck = app.appUrl.trim() !== "" && app.reviewStatus !== "suspended"

  return (
    <div className="rounded-xl border border-border bg-surface p-4">
      <p className="flex items-start gap-2 font-semibold">
        <TriangleAlert className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
        {verifyText.review[app.reviewStatus].notice}
      </p>
      {blocks.length > 0 && (
        <ul className="mt-2 list-disc space-y-1 pl-9 text-sm text-muted-foreground">
          {blocks.map((f) => (
            <li key={f.rule + f.evidence}>{f.evidence}</li>
          ))}
        </ul>
      )}
      {error && <p className="mt-2 pl-6 text-sm text-destructive">{error}</p>}
      {canRecheck && (
        <button
          type="button"
          onClick={recheck}
          disabled={busy}
          className="ml-6 mt-3 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium hover:bg-accent disabled:opacity-50"
        >
          {busy ? verifyText.rechecking : verifyText.recheck}
        </button>
      )}
    </div>
  )
}
