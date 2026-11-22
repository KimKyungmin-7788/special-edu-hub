import { BookOpen, Sprout } from "lucide-react"
import { seedling } from "@/config/seedling"
import { WriteButton } from "@/components/app/WriteButton"

const roomIcons = [Sprout, BookOpen]

/** 새싹자료방의 뜻(처음 만든 앱 이야기, 시도→기록→응원)을 한 줄 띠로 보여 주는 안내. */
export function SeedlingIntro({ categoryId }: { categoryId?: string }) {
  return (
    <section aria-labelledby="seedling-title" className="overflow-hidden rounded-2xl border border-brand-line bg-brand-soft">
      <div className="flex flex-col gap-4 px-5 py-4 sm:flex-row sm:items-center sm:px-6">
        <div className="min-w-0 flex-1">
          <h1 id="seedling-title" className="flex items-start gap-2 break-keep text-lg font-bold leading-snug tracking-tight text-hero-foreground sm:text-xl">
            <Sprout className="mt-0.5 size-5 shrink-0 text-primary sm:size-6" aria-hidden />
            <span><span className="sr-only">{seedling.title}: </span>{seedling.tagline}</span>
          </h1>
          <p className="mt-1.5 text-sm text-primary sm:pl-8">
            {seedling.welcome}
            <span aria-hidden className="mx-2 text-brand-line">·</span>
            {seedling.steps.join(" → ")}
          </p>
        </div>
        <WriteButton seedling categoryId={categoryId} label="나의 시작 남기기" className="min-h-11 shrink-0 self-start sm:self-center" />
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-2 border-t border-brand-line bg-background px-5 py-3 text-sm text-muted-foreground sm:px-6">
        {seedling.rooms.map((room, index) => {
          const Icon = roomIcons[index]
          return (
            <span key={room.title} className="flex items-center gap-1.5">
              <Icon className="size-4 text-primary" aria-hidden />
              {room.title} = {room.focus}
            </span>
          )
        })}
      </div>
    </section>
  )
}
