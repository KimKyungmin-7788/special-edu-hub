import { ArrowRight, ListChecks, Monitor } from "lucide-react"
import { vibecoding } from "@/config/vibecoding"
import type { Chapter } from "../steps"
import { RescueCard } from "./Rescue"

interface Props {
  /** 장마다 이름과 단계 수 */
  chapters: { chapter: Chapter; count: number }[]
  onStart: () => void
}

/** 연수가 끝나면 내 AI에 연결되는 세 플랫폼(로고는 public/logos) */
const PLATFORMS = [
  { logo: "github", name: "깃허브", role: "코드를 보관하는" },
  { logo: "supabase", name: "슈파베이스", role: "데이터를 담는" },
  { logo: "vercel", name: "버셀", role: "주소를 만들어 주는" },
]

/** 맨 앞 표지 슬라이드 */
export function TitleCover({ chapters, onStart }: Props) {
  const total = chapters.reduce((n, c) => n + c.count, 0)

  return (
    <div className="flex h-full flex-col bg-hero lg:flex-row">
      <div className="flex flex-1 flex-col justify-center px-6 py-10 lg:pl-24 lg:pr-12">
        <h1 className="text-5xl font-bold leading-tight tracking-tight text-hero-foreground lg:text-7xl">
          바이브코딩
          <br />
          최소한의 환경구축
        </h1>
        <p className="mt-6 text-2xl font-semibold text-hero-accent lg:text-3xl">
          함께 차근차근 해 봐요
        </p>

        <ul className="mt-8 flex flex-wrap gap-2.5 text-sm font-semibold text-brand-muted-foreground">
          <li className="inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 shadow-sm">
            <Monitor aria-hidden className="size-4 text-primary" />
            Windows 기준
          </li>
          <li className="inline-flex items-center gap-1.5 rounded-full bg-card px-4 py-2 shadow-sm">
            <ListChecks aria-hidden className="size-4 text-primary" />
            3장 {total}단계
          </li>
        </ul>

        <div className="mt-6">
          <RescueCard />
        </div>

        <div className="mt-8">
          <button
            type="button"
            onClick={onStart}
            className="inline-flex h-14 items-center gap-2 rounded-2xl bg-cta px-8 text-lg font-semibold text-cta-foreground shadow-sm transition-all duration-200 hover:shadow-md active:scale-95 motion-safe:hover:-translate-y-0.5"
          >
            시작하기
            <ArrowRight aria-hidden className="size-5" />
          </button>
        </div>
      </div>

      {/* 오른쪽: 연수 목표 — 끝나면 내 AI에 연결되는 세 플랫폼 */}
      <section
        aria-labelledby="cover-goal"
        className="flex flex-col justify-center px-6 pb-10 lg:w-[500px] lg:shrink-0 lg:pb-0 lg:pl-0 lg:pr-20"
      >
        <h2
          id="cover-goal"
          className="text-xl font-bold leading-snug text-hero-foreground"
        >
          이 연수가 끝나면{" "}
          <span className="text-primary">3가지 필수 플랫폼</span>을
          <br />내 AI에 연결할 수 있어요
        </h2>
        <ul className="mt-5 flex flex-col gap-3">
          {PLATFORMS.map((p) => (
            <li
              key={p.logo}
              className="flex items-center gap-4 rounded-2xl bg-card p-4 shadow-sm"
            >
              <img
                src={`${vibecoding.assetBase}logos/${p.logo}.png`}
                alt=""
                className="size-12 shrink-0 rounded-xl object-contain ring-1 ring-brand-line"
              />
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-hero-accent">
                  {p.role}
                </span>
                <span className="block text-xl font-bold">{p.name}</span>
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
