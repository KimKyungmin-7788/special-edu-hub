/**
 * 인증 완료 상태 — 배지 표시.
 */
export function VerifyAlreadyCertified() {
  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <div className="text-4xl">✅</div>
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
          교사인증 완료
        </span>
        <p className="mt-4 text-lg font-semibold">이미 교사인증이 완료된 계정입니다</p>
        <p className="mt-1 text-sm text-muted-foreground">
          인증된 교사로 등록되어 있습니다. 앱 등록 등 교사 전용 기능을 이용할 수 있습니다.
        </p>
      </div>
    </div>
  )
}
