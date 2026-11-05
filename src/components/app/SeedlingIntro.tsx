import { ArrowDown, ArrowRight, BookOpen, HeartHandshake, Lightbulb, NotebookPen, Sprout } from "lucide-react"
import { seedling } from "@/config/seedling"
import { WriteButton } from "@/components/app/WriteButton"

const journeyIcons = [Lightbulb, NotebookPen, HeartHandshake]
const roomIcons = [Sprout, BookOpen]

/** 시작·기록·응원의 흐름과 두 자료방의 공유 목적을 보여 주는 안내. */
export function SeedlingIntro({ categoryId }: { categoryId?: string }) {
  return (
    <section aria-labelledby="seedling-title" className="overflow-hidden rounded-2xl border border-brand-line bg-brand-soft">
      <div className="grid gap-6 px-5 py-5 sm:px-6 sm:py-6 xl:grid-cols-5 xl:items-center xl:gap-8">
        <div className="xl:col-span-2">
          <h1 id="seedling-title" className="flex items-center gap-2 text-base font-bold text-primary">
            <Sprout className="size-5" aria-hidden />{seedling.title}
          </h1>
          <p className="mt-3 break-keep text-2xl font-bold leading-snug tracking-tight text-hero-foreground sm:text-3xl">
            {seedling.headline.map((line) => <span key={line} className="block">{line}</span>)}
          </p>
          <p className="mt-3 text-sm font-semibold text-hero-foreground">{seedling.welcome}</p>
          <p className="mt-1 text-sm leading-relaxed text-hero-muted">{seedling.invitation}</p>
          <WriteButton seedling categoryId={categoryId} label="나의 시작 남기기" className="mt-4 min-h-11" />
        </div>

        <ol aria-label="새싹자료방에서 함께하는 일" className="grid gap-3 min-[480px]:grid-cols-3 min-[480px]:gap-4 xl:col-span-3">
          {seedling.journey.map((step, index) => {
            const Icon = journeyIcons[index]
            return (
              <li key={step.title} className="relative flex items-center gap-4 py-2 min-[480px]:flex-col min-[480px]:gap-0 min-[480px]:py-0 min-[480px]:text-center">
                <div className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl border border-brand-line bg-background text-primary min-[480px]:mb-3 min-[480px]:size-16">
                  <Icon className="size-7 min-[480px]:size-8" strokeWidth={1.5} aria-hidden />
                  <span aria-hidden className="absolute -right-2 -top-2 flex size-5 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">{index + 1}</span>
                </div>
                {index < seedling.journey.length - 1 && (
                  <>
                    <ArrowRight className="absolute -right-4 top-5 hidden size-5 text-primary/50 min-[480px]:block" aria-hidden />
                    <ArrowDown className="absolute -bottom-3 left-5 size-4 text-primary/50 min-[480px]:hidden" aria-hidden />
                  </>
                )}
                <div>
                  <h2 className="text-base font-bold tracking-tight text-hero-foreground">{step.title}</h2>
                  <p className="mt-1 text-xs leading-relaxed text-hero-muted min-[480px]:mt-2">{step.description}</p>
                  <p className="mt-2 inline-block rounded-full bg-background/80 px-2.5 py-1 text-xs text-primary min-[480px]:mt-2">{step.note}</p>
                </div>
              </li>
            )
          })}
        </ol>
      </div>

      <div className="border-t border-brand-line bg-background px-5 py-4 sm:px-6">
        <div className="grid gap-4 min-[480px]:grid-cols-2 sm:gap-6">
          {seedling.rooms.map((room, index) => {
            const Icon = roomIcons[index]
            return (
              <div key={room.title} className="flex items-start gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-surface text-primary">
                  <Icon className="size-5" aria-hidden />
                </span>
                <div>
                  <p className="text-xs text-muted-foreground">{room.title} · {room.focus}</p>
                  <h2 className="mt-1 break-keep text-sm font-semibold text-foreground">“{room.quote}”</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{room.description}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
