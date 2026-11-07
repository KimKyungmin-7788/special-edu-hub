import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { training } from "@/config/training"

export function TrainingGuide() {
  const { guide } = training
  return (
    <div className="mx-auto max-w-5xl">
      <header className="rounded-2xl bg-hero px-6 py-9 sm:px-10 sm:py-12">
        <p className="text-sm font-semibold text-hero-accent">{training.guideLabel}</p>
        <h1 className="mt-4 max-w-2xl text-3xl leading-tight font-bold tracking-tight text-balance break-keep text-hero-foreground sm:text-4xl">{guide.heading}</h1>
        <p className="mt-5 text-base leading-relaxed break-keep text-hero-muted">{guide.lead}</p>
        <Link to={training.basePath} className="mt-7 inline-flex items-center gap-3 rounded-lg bg-cta px-5 py-3 text-sm font-bold text-cta-foreground">
          {guide.ctaLabel}<ArrowRight aria-hidden className="size-4" />
        </Link>
      </header>

      <ul className="mt-6 grid gap-4 sm:grid-cols-3">
        {guide.purposes.map((purpose, i) => (
          <li key={purpose.title} className="rounded-xl border bg-card p-6">
            <p aria-hidden className="text-sm font-semibold text-primary">0{i + 1}</p>
            <h2 className="mt-4 text-lg font-bold break-keep">{purpose.title}</h2>
            <p className="mt-3 text-sm leading-relaxed break-keep text-muted-foreground">{purpose.description}</p>
          </li>
        ))}
      </ul>

      <section className="my-10 grid gap-5 border-y py-8 sm:my-12 sm:grid-cols-[1fr_1.3fr] sm:gap-10 sm:py-10">
        <div>
          <p className="text-sm font-semibold text-primary">{guide.origin.label}</p>
          <h2 className="mt-3 text-xl leading-snug font-bold break-keep">{guide.origin.heading}</h2>
        </div>
        <p className="text-base leading-loose break-keep text-muted-foreground">{guide.origin.description}</p>
      </section>

      <section className="rounded-2xl border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-bold break-keep">{guide.sharing.heading}</h2>
        <ol className="my-7 flex items-center">
          {guide.sharing.steps.map((step, i) => (
            <li key={step} className="flex flex-1 items-center">
              <span className="flex-1 rounded-lg bg-brand-soft px-2 py-4 text-center text-base font-bold text-primary sm:text-lg">{step}</span>
              {i < guide.sharing.steps.length - 1 && <ArrowRight aria-hidden className="mx-2 size-4 shrink-0 text-muted-foreground sm:mx-4" />}
            </li>
          ))}
        </ol>
        <p className="max-w-3xl text-sm leading-relaxed break-keep text-muted-foreground">{guide.sharing.description}</p>
        <dl className="mt-6 grid gap-4 border-t pt-6 sm:grid-cols-2">
          {guide.sharing.access.map((item) => (
            <div key={item.title} className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
              <dt className="font-semibold">{item.title}</dt>
              <dd className="text-primary">{item.detail}</dd>
            </div>
          ))}
        </dl>
      </section>
      <p className="mt-6 text-xs leading-relaxed text-muted-foreground">{guide.footnote}</p>
    </div>
  )
}
