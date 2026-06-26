/**
 * 반려(rejected) 상태 — 사유 표시 + 재신청 유도.
 * 재신청 폼은 부모(VerifyPage)에서 mode="reapply"로 VerifyForm을 렌더링한다.
 */
export function VerifyRejected({
  rejectReason,
  onReapply,
}: {
  rejectReason: string | null
  onReapply: () => void
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-destructive/40 bg-destructive/5 p-4">
        <p className="text-sm font-semibold text-destructive">인증 반려 안내</p>
        <p className="mt-2 text-sm text-muted-foreground">
          {rejectReason?.trim()
            ? rejectReason
            : "반려 사유가 기록되지 않았습니다. 관리자에게 문의해 주세요."}
        </p>
      </div>
      <p className="text-sm text-muted-foreground">
        서류를 다시 준비한 후 재신청할 수 있습니다.
      </p>
      <button
        type="button"
        onClick={onReapply}
        className="self-start rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted"
      >
        재신청하기 →
      </button>
    </div>
  )
}
