import { Crown } from "lucide-react"
import { projects } from "@/config/projects"

/** 협업 완성 왕관 메달: '협업 완성 · 5명이 함께'(자료 카드는 short: '협업 · 5명이 함께'). 사람 수를 모르면 사람 수는 뺀다. */
export function CollabMedal({ people, short }: { people?: number; short?: boolean }) {
  const t = projects.medal
  return <span className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border border-gold-line bg-gold-soft py-0.5 pr-2.5 pl-0.5 text-xs font-medium whitespace-nowrap text-gold-text">
    <span className="flex size-5 items-center justify-center rounded-full bg-gold text-gold-foreground"><Crown className="size-3" aria-hidden /></span>
    {short ? t.short : t.label}{people ? ` · ${t.together(people)}` : ""}
  </span>
}
