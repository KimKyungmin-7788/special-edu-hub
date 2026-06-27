/**
 * 법적 문서(개인정보처리방침·이용약관) 공용 레이아웃.
 * 본문은 데이터(sections)로 받아 동일한 중립 스타일로 렌더한다.
 * 운영 주체·연락처·시행일 같은 값은 페이지가 config(site.org)에서 넣어준다.
 */

export type LegalSection = {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
}

type LegalPageProps = {
  title: string
  effectiveDate: string
  intro?: string
  sections: LegalSection[]
}

export function LegalPage({ title, effectiveDate, intro, sections }: LegalPageProps) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-xs text-muted-foreground">시행일 {effectiveDate}</p>
      {intro && (
        <p className="mt-4 text-sm leading-relaxed text-foreground">{intro}</p>
      )}

      <div className="mt-8 space-y-7">
        {sections.map((s) => (
          <section key={s.heading}>
            <h2 className="text-base font-semibold tracking-tight">{s.heading}</h2>
            {s.paragraphs?.map((p, i) => (
              <p key={i} className="mt-2 text-sm leading-relaxed text-foreground">
                {p}
              </p>
            ))}
            {s.bullets && (
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-foreground">
                {s.bullets.map((b, i) => (
                  <li key={i}>{b}</li>
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}
