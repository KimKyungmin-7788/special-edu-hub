import { useSearchParams } from "react-router-dom"
import type { ReactNode } from "react"
import { Check, Flag } from "lucide-react"
import {
  STEPS,
  TOOL_NAME,
  bodyFor,
  logoFor,
  titleFor,
  type Tool,
} from "./steps"
import { useProgress } from "./useProgress"
import { Landing } from "./components/Landing"
import { StepView } from "./components/StepView"

/**
 * 바이브코딩 시작 준비(/vibecoding/setup). 원래 vibecoding-setting 단독 앱이던 것을 허브로 옮겼다.
 * 현재 단계는 ?step= 으로만 관리(도구를 고르기 전에는 항상 시작 화면).
 * 허브 헤더 아래 한 칸: [단계 표시줄] + [본문]. 넓은 화면에선 화면 높이에 맞춰 스크롤 없이 보이게 한다.
 */
export function VibeSetup() {
  const [params, setParams] = useSearchParams()
  const { tool, checks, toggleCheck, setTool } = useProgress()

  const stepId = params.get("step")
  const found = STEPS.findIndex((s) => s.id === stepId)
  // 도구를 고르기 전에는 항상 시작 화면이에요.
  const index = tool ? found : -1
  const step = index >= 0 ? STEPS[index] : null

  const go = (i: number) => {
    if (i < 0) setParams({})
    else setParams({ step: STEPS[Math.min(i, STEPS.length - 1)].id })
  }

  const isDone = (i: number) => {
    const b = bodyFor(STEPS[i], tool)
    return !!b && b.checks.length > 0 && b.checks.every((c) => checks[c.id])
  }

  const pick = (t: Tool) => {
    // 같은 도구로 다시 들어오면 멈췄던 단계부터, 바꾸면 처음부터 해요.
    const resume =
      t === tool
        ? Math.max(
            0,
            STEPS.findIndex((_, i) => !isDone(i)),
          )
        : 0
    setTool(t)
    setParams({ step: STEPS[resume].id })
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-xl border bg-card shadow-sm lg:h-[calc(100svh-7rem)] lg:min-h-[36rem]">
      <div className="flex h-14 shrink-0 items-center gap-3 border-b px-3 sm:px-4">
        <nav aria-label="진행 단계" className="min-w-0 flex-1 overflow-x-auto">
          <ol className="flex items-center gap-1">
            <StepTab
              label="시작"
              mark={<Flag aria-hidden className="size-3" />}
              done={!!tool}
              current={index < 0}
              onClick={() => go(-1)}
            />
            {STEPS.map((s, i) => (
              <StepTab
                key={s.id}
                label={s.short}
                mark={i + 1}
                done={isDone(i)}
                current={i === index}
                disabled={!tool}
                onClick={() => go(i)}
              />
            ))}
          </ol>
        </nav>

        {tool && (
          <span className="shrink-0 rounded-full bg-brand-muted px-2.5 py-0.5 text-xs font-semibold text-brand-muted-foreground ring-1 ring-brand-line">
            {TOOL_NAME[tool]}
          </span>
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto bg-surface">
        {step ? (
          <StepView
            step={step}
            title={titleFor(step, tool)}
            logo={logoFor(step, tool)}
            helpWhere={
              // 앱을 설치하기 전이라 웹 채팅에 물어봐요.
              step.id === "install"
                ? tool === "codex"
                  ? "ChatGPT 웹 채팅"
                  : "Claude 웹 채팅(claude.ai)"
                : tool
                  ? TOOL_NAME[tool]
                  : "Claude Code·Codex"
            }
            index={index}
            body={bodyFor(step, tool)}
            checks={checks}
            onToggle={toggleCheck}
            prevLabel={index === 0 ? "처음 화면" : STEPS[index - 1].short}
            nextLabel={index < STEPS.length - 1 ? STEPS[index + 1].short : null}
            onPrev={() => go(index - 1)}
            onNext={() => go(index + 1)}
          />
        ) : (
          <Landing onPick={pick} />
        )}
      </div>
    </div>
  )
}

function StepTab({
  label,
  mark,
  done,
  current,
  disabled,
  onClick,
}: {
  label: string
  /** 동그라미 안 표시. 완료하면 체크로 바뀌어요 */
  mark: ReactNode
  done: boolean
  current: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={disabled}
        aria-current={current ? "step" : undefined}
        className={
          "flex h-14 items-center gap-1 border-b-2 px-1.5 text-sm transition-colors disabled:cursor-default " +
          (current
            ? "border-primary font-semibold text-foreground"
            : "border-transparent text-muted-foreground enabled:hover:text-foreground")
        }
      >
        <span
          className={
            "flex size-5 items-center justify-center rounded-full text-[11px] font-bold " +
            (current
              ? "bg-primary text-primary-foreground"
              : done
                ? "bg-brand-muted text-brand-muted-foreground ring-1 ring-brand-line"
                : "bg-accent")
          }
        >
          {done ? <Check aria-hidden className="size-3" /> : mark}
        </span>
        <span
          className={
            "hidden whitespace-nowrap md:inline " +
            (current
              ? "text-sm font-semibold text-foreground"
              : "text-xs text-muted-foreground/70")
          }
        >
          {label}
        </span>
      </button>
    </li>
  )
}
