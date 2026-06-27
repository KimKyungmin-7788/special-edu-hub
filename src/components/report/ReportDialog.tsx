import { useId, useState, type FormEvent } from "react"
import { Modal } from "@/components/ui/Modal"
import { REPORT_REASONS, REPORT_DETAIL_MAX } from "@/lib/reports"

/**
 * 신고 다이얼로그 (묶음 R-2) — 사유 선택 + 상세(선택) 제출.
 * Modal 을 재사용한다. 제출 동작은 부모가 onSubmit 으로 주입(대상별로 다름).
 * 신고자 신원·접수 사실은 피신고자에게 노출되지 않는다(조회 권한은 RLS, staff 전용).
 *
 * 어떤 대상이든 재사용 가능하게 만들되, 이번 범위 사용처는 쪽지(MessageBox)뿐.
 */

type ReportDialogProps = {
  open: boolean
  onClose: () => void
  /** 무엇을 신고하는지(제목 표시용). 예: "쪽지" */
  targetLabel: string
  /** 실제 제출. 성공하면 접수 화면으로 전환된다. */
  onSubmit: (reason: string, detail: string) => Promise<void>
}

export function ReportDialog({ open, onClose, targetLabel, onSubmit }: ReportDialogProps) {
  const titleId = useId()
  const [reason, setReason] = useState<string>(REPORT_REASONS[0].code)
  const [detail, setDetail] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function handleClose() {
    // 닫을 때 상태 초기화(다음에 다시 열면 깨끗하게).
    onClose()
    setReason(REPORT_REASONS[0].code)
    setDetail("")
    setSubmitting(false)
    setDone(false)
    setError(null)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      await onSubmit(reason, detail)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "신고를 접수하지 못했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} labelledBy={titleId}>
      <div className="p-6">
        <h2 id={titleId} className="pr-8 text-lg font-semibold tracking-tight">
          {targetLabel} 신고
        </h2>

        {done ? (
          <div className="mt-4 space-y-4">
            <p className="text-sm text-foreground">
              신고가 접수되었습니다. 운영진이 확인 후 처리합니다.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="w-full rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
            >
              닫기
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-4 space-y-4">
            <fieldset className="space-y-2">
              <legend className="text-sm font-medium">신고 사유</legend>
              {REPORT_REASONS.map((r) => (
                <label key={r.code} className="flex items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="report-reason"
                    value={r.code}
                    checked={reason === r.code}
                    onChange={() => setReason(r.code)}
                    className="accent-[var(--primary)]"
                  />
                  {r.label}
                </label>
              ))}
            </fieldset>

            <div className="space-y-1.5">
              <label htmlFor="report-detail" className="text-sm font-medium">
                상세 내용 <span className="text-muted-foreground">(선택)</span>
              </label>
              <textarea
                id="report-detail"
                value={detail}
                onChange={(e) => {
                  setDetail(e.target.value)
                  if (error) setError(null)
                }}
                rows={3}
                maxLength={REPORT_DETAIL_MAX}
                placeholder="상황을 자세히 적어주시면 처리에 도움이 됩니다."
                className="w-full resize-none rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="block text-right text-xs text-muted-foreground">
                {detail.length}/{REPORT_DETAIL_MAX}
              </span>
            </div>

            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                취소
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
              >
                {submitting ? "접수 중…" : "신고하기"}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  )
}
