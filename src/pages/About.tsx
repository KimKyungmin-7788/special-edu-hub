import { about } from "@/config/about"
import { CONTAINER } from "@/config/layout"
import { usePageTitle } from "@/lib/usePageTitle"

/** 소개(/about) — 정체성 문장 + 우리의 생각 5가지. 문구는 config/about. */
export function About() {
  usePageTitle("소개")
  const { identity, beliefsHeading, beliefs } = about

  return (
    <div className={`${CONTAINER} py-10`}>
      <h1 className="text-2xl font-bold tracking-tight">소개</h1>

      <section className="mt-6 rounded-xl bg-brand-soft px-6 py-12 text-center break-keep">
        <p className="text-base font-semibold leading-relaxed text-foreground/80 sm:text-lg">
          {identity.lead}
        </p>
        <p className="mt-2 text-2xl font-extrabold tracking-tight text-brand-muted-foreground sm:text-3xl">
          {identity.main}
        </p>
      </section>

      <section className="mx-auto mt-14 max-w-3xl">
        <h2 className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span aria-hidden className="h-[18px] w-1 rounded-full bg-primary" />
          {beliefsHeading}
        </h2>
        <ol className="mt-2">
          {beliefs.map((b, i) => (
            <li
              key={b.title}
              className="grid grid-cols-[2.75rem_1fr] gap-4 border-b border-border py-6 last:border-b-0"
            >
              <span
                aria-hidden
                className="mt-0.5 flex size-9 items-center justify-center rounded-full bg-brand-muted font-bold text-brand-muted-foreground"
              >
                {i + 1}
              </span>
              <div className="break-keep">
                <h3 className="mt-1.5 text-base font-bold sm:text-lg">{b.title}</h3>
                <p className="mt-2 leading-relaxed text-foreground/80">{b.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  )
}
