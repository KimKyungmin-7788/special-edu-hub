/**
 * "준비 중" 공용 페이지 — 수업실천사례 / 자유게시판 / 교사인증센터.
 * 자리만 존재하고 기능은 후속 단계(CLAUDE.md 규칙 4).
 */
export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-24 text-center">
      <p className="text-xs font-medium tracking-wide text-muted-foreground">
        준비 중
      </p>
      <h1 className="mt-2 text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        이 페이지는 후속 단계에서 제공될 예정입니다.
      </p>
    </div>
  )
}
