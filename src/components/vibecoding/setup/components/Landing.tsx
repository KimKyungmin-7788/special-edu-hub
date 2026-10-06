import { Fragment } from "react"
import {
  ArrowRight,
  ChevronRight,
  Clock,
  CreditCard,
  ExternalLink,
} from "lucide-react"
import { SIGNUPS, TOOL_NAME, type Tool } from "../steps"
import { vibecoding } from "@/config/vibecoding"

const CHOICES: {
  tool: Tool
  service: string
  plan: string
  pricing: string
}[] = [
  {
    tool: "claude",
    service: "Claude",
    plan: "Pro 이상",
    pricing: "https://claude.com/pricing",
  },
  {
    tool: "codex",
    service: "ChatGPT",
    plan: "Plus 이상",
    pricing: "https://chatgpt.com/pricing",
  },
]

export function Landing({ onPick }: { onPick: (tool: Tool) => void }) {
  return (
    <div className="mx-auto flex min-h-full w-full max-w-5xl flex-col items-center justify-center px-4 py-8 text-center">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
        <span className="text-primary">바이브코딩</span>을 위한
        <br />
        <span className="text-primary">최소한의 환경 세팅</span>을 함께 해 봐요
      </h1>

      <p className="mt-6 inline-flex items-center gap-2 rounded-full bg-brand-muted px-5 py-2 text-base font-semibold text-brand-muted-foreground ring-1 ring-brand-line">
        <CreditCard aria-hidden className="size-4" />
        <span>
          Claude 또는 ChatGPT{" "}
          <strong className="font-extrabold text-primary underline decoration-2 underline-offset-4">
            유료 구독
          </strong>
          이 필요해요
        </span>
      </p>

      <h2 className="mt-8 text-base font-semibold text-muted-foreground">
        어떤 것을 사용 중인가요? 선택하면 바로 시작해요.
      </h2>

      <div className="mt-4 grid w-full max-w-4xl grid-cols-1 gap-5 sm:grid-cols-2">
        {CHOICES.map((c) => (
          <div key={c.tool} className="flex flex-col gap-2">
            <button
              type="button"
              onClick={() => onPick(c.tool)}
              className="group flex items-center justify-between gap-4 rounded-2xl border-2 bg-card px-8 py-8 text-left shadow-sm transition duration-200 hover:border-primary hover:shadow-lg motion-safe:hover:-translate-y-1"
            >
              <span>
                <span className="block text-4xl font-bold tracking-tight group-hover:text-primary">
                  {c.service}
                </span>
                <span className="mt-2 block text-sm text-muted-foreground">
                  {c.plan} · {TOOL_NAME[c.tool]}로 시작
                </span>
              </span>
              <span className="flex size-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground transition-transform duration-200 motion-safe:group-hover:translate-x-1">
                <ArrowRight aria-hidden className="size-6" />
              </span>
            </button>
            <a
              href={c.pricing}
              target="_blank"
              rel="noopener"
              className="text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
            >
              아직 구독 전이에요 · {c.service} 요금제 보기 ↗
            </a>
          </div>
        ))}
      </div>

      <section aria-labelledby="signup-title" className="mt-12 w-full">
        <div className="flex items-center gap-3">
          <span aria-hidden className="h-px flex-1 bg-border" />
          <h2
            id="signup-title"
            className="flex items-center gap-1.5 text-sm font-semibold text-muted-foreground"
          >
            <Clock aria-hidden className="size-4 text-primary" />
            시작 전에 미리 가입해 두면 10분을 아낄 수 있어요
          </h2>
          <span aria-hidden className="h-px flex-1 bg-border" />
        </div>

        <ol className="mt-4 flex items-stretch justify-between gap-2 rounded-2xl bg-brand-soft px-5 py-4 text-left ring-1 ring-brand-line">
          {SIGNUPS.map((item, i) => (
            <Fragment key={item.name}>
              {i > 0 && (
                <li aria-hidden className="flex items-center text-brand-line">
                  <ChevronRight className="size-5" />
                </li>
              )}
              <li className="flex min-w-0 items-center gap-3">
                <span className="flex shrink-0 -space-x-2">
                  {item.logos.map((logo) => (
                    <img
                      key={logo}
                      src={`${vibecoding.assetBase}logos/${logo}.png`}
                      alt=""
                      className="size-9 rounded-lg bg-background object-contain ring-1 ring-brand-line"
                    />
                  ))}
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-bold leading-tight">
                    {i + 1}. {item.name}
                  </span>
                  <span className="block text-xs text-hero-muted">
                    <strong className="font-bold text-primary">
                      {item.via.replace("로 가입", "")}
                    </strong>
                    로 가입
                  </span>
                  <span className="mt-0.5 flex gap-2">
                    {item.links.map((link) => (
                      <a
                        key={link.href}
                        href={link.href}
                        target="_blank"
                        rel="noopener"
                        className="inline-flex items-center gap-0.5 text-xs font-semibold text-primary underline-offset-4 hover:underline"
                      >
                        {link.label === "가입" ? "가입하기" : link.label}
                        <ExternalLink aria-hidden className="size-3" />
                        <span className="sr-only">(새 탭)</span>
                      </a>
                    ))}
                  </span>
                </span>
              </li>
            </Fragment>
          ))}
        </ol>
      </section>
    </div>
  )
}
