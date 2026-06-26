/**
 * 심사중(pending) 상태.
 */
export function VerifyPending({ createdAt }: { createdAt: string }) {
  const date = new Date(createdAt).toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  return (
    <div className="flex flex-col items-center gap-6 py-16 text-center">
      <div className="text-4xl">⏳</div>
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium text-foreground">
          심사 중
        </span>
        <p className="mt-4 text-lg font-semibold">서류를 검토하고 있습니다</p>
        <p className="mt-1 text-sm text-muted-foreground">
          통상 1~3일(영업일) 이내에 처리됩니다.
        </p>
        <p className="mt-3 text-xs text-muted-foreground">신청일: {date}</p>
      </div>
      <div className="w-full max-w-sm rounded-md border border-border bg-muted/50 p-4 text-left text-sm text-muted-foreground">
        <p className="font-medium text-foreground">안내</p>
        <ul className="mt-2 list-disc space-y-1 pl-4">
          <li>심사 결과는 이 페이지에서 확인할 수 있습니다.</li>
          <li>반려 시 사유와 함께 재신청 안내가 표시됩니다.</li>
        </ul>
      </div>
    </div>
  )
}
