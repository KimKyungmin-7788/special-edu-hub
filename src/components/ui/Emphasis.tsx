/** **낱말** 로 감싼 부분을 연두 바탕 강조로 그린다 — 문서·안내에서 핵심 낱말에 눈이 가게 */
export function Emphasis({ text }: { text: string }) {
  return (
    <>
      {text.split("**").map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="rounded-sm bg-brand-muted px-0.5 font-semibold text-foreground">
            {part}
          </strong>
        ) : (
          part
        ),
      )}
    </>
  )
}

/** 강조 표시(**)를 뺀 글 — DB 사본·메일처럼 글자만 쓰는 곳 */
export const plainText = (text: string) => text.replaceAll("**", "")
