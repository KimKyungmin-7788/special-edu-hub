import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { firstActivePage, training, trainingPath } from "@/config/training"

/**
 * 열린연수방이란?(/training, 누구나) — 이곳이 무엇인지, 연수 목록(준비 중 포함), 듣는 법, 앞으로의 계획.
 * 문구와 연수 목록은 config/training.ts 에서. 연수가 늘면 목록에 저절로 붙는다.
 */
export function TrainingGuide() {
  const { guide } = training
  return (
    <div className="max-w-3xl space-y-7 rounded-xl border bg-card p-6 shadow-sm lg:p-8">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{training.guideLabel}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{guide.lead}</p>
      </header>

      <section>
        <h2 className="text-base font-semibold">연수 목록</h2>
        <ul className="mt-3 space-y-2">
          {training.courses.map((course, i) => {
            const first = firstActivePage(course)
            const text = (
              <span>
                <span className="block text-sm font-semibold">
                  연수 {i + 1}. {course.title}
                </span>
                {course.summary && (
                  <span className="mt-0.5 block text-sm leading-relaxed text-muted-foreground">
                    {course.summary}
                  </span>
                )}
              </span>
            )
            return (
              <li key={course.slug}>
                {first ? (
                  <Link
                    to={trainingPath(course.slug, first.slug)}
                    className="group flex items-center justify-between gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-accent"
                  >
                    {text}
                    <ArrowRight
                      aria-hidden
                      className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-foreground"
                    />
                  </Link>
                ) : (
                  <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed px-4 py-3 text-muted-foreground">
                    {text}
                    <span className="shrink-0 rounded-sm bg-muted px-1.5 py-0.5 text-xs font-medium">
                      준비중
                    </span>
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      </section>

      {guide.sections.map((section) => (
        <section key={section.heading}>
          <h2 className="text-base font-semibold">{section.heading}</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-sm leading-relaxed text-foreground/80">
            {section.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          {section.link && (
            <Link
              to={section.link.to}
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary underline-offset-4 hover:underline"
            >
              {section.link.label}
              <ArrowRight aria-hidden className="size-3.5" />
            </Link>
          )}
        </section>
      ))}
    </div>
  )
}
