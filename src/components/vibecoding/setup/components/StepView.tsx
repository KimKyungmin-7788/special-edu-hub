import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Check,
  Copy,
  ExternalLink,
  MessageSquareText,
  PartyPopper,
} from "lucide-react"
import { useState } from "react"
import type { Step, StepBody, StepFlowItem, StepLink } from "../steps"
import { GuideImage } from "./GuideImage"
import { LinkDialog } from "./LinkDialog"
import { HelpPrompt } from "./HelpPrompt"
import { RescueButton } from "./Rescue"
import { vibecoding } from "@/config/vibecoding"
import { cn } from "@/lib/utils"

interface Props {
  step: Step
  /** {도구}를 채운 제목 */
  title: string
  /** 제목 옆 브랜드 로고 파일 이름(public/logos). 없으면 단계 표시만 */
  logo?: string
  /** 막혔을 때 프롬프트를 붙여 넣을 곳 */
  helpWhere: string
  index: number
  body: StepBody | undefined
  checks: Record<string, boolean>
  onToggle: (id: string) => void
  /** 이전 단계 이름. 첫 단계면 "처음 화면" */
  prevLabel: string
  /** 다음 단계 이름. 마지막 단계면 null */
  nextLabel: string | null
  onPrev: () => void
  onNext: () => void
  /** 화면에 다 안 들어가면 true — 할 일이 5개 미만이어도 촘촘하게 보여 줘요(허브 전용) */
  forceDense?: boolean
}

export function StepView({
  step,
  title,
  logo,
  helpWhere,
  index,
  body,
  checks,
  onToggle,
  prevLabel,
  nextLabel,
  onPrev,
  onNext,
  forceDense = false,
}: Props) {
  const total = body?.checks.length ?? 0
  const doneCount = body ? body.checks.filter((c) => checks[c.id]).length : 0
  const allDone = total > 0 && doneCount === total

  return (
    <div className="grid w-full grid-cols-1 gap-6 p-4 sm:p-6 lg:h-full lg:gap-5 lg:py-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      {/* 왼쪽: 읽고, 그림 보고, 링크 열기 */}
      <section className="flex min-h-0 flex-col rounded-2xl border-2 border-primary bg-card p-6 shadow-sm lg:p-5">
        <div className="flex items-center gap-3">
          {logo && (
            <img
              src={`${vibecoding.assetBase}logos/${logo}.png`}
              alt=""
              className="size-11 shrink-0 rounded-xl bg-background object-contain ring-1 ring-border"
            />
          )}
          <div>
            <span className="rounded-full bg-brand-muted px-2.5 py-0.5 text-xs font-semibold text-brand-muted-foreground ring-1 ring-brand-line">
              {index + 1}단계
            </span>
            <h1 className="mt-1 text-2xl font-bold tracking-tight">{title}</h1>
          </div>
          <div className="ml-auto self-start">
            <RescueButton where={helpWhere} />
          </div>
        </div>

        {body ? (
          <>
            <div className="mt-4 space-y-1 text-[15px] leading-relaxed text-foreground/85">
              {body.lead.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>

            {body.links.length > 0 && (
              <div
                className={
                  "mt-4 grid gap-3 " +
                  (body.links.length > 1 ? "grid-cols-2" : "grid-cols-1")
                }
              >
                {body.links.map((link) => (
                  <LinkRow
                    key={link.label}
                    link={link}
                    compact={body.links.length > 1}
                  />
                ))}
              </div>
            )}

            {body.flow && (
              <FlowList items={body.flow} forceDense={forceDense} />
            )}

            {body.guide ? (
              <div className="mt-4 flex min-h-0 flex-1 gap-3">
                {(Array.isArray(body.guide) ? body.guide : [body.guide]).map(
                  (g) => (
                    // 여러 장이면 그림 비율만큼 폭을 나눠서 높이를 맞춰요.
                    <div
                      key={g.src}
                      className="flex min-h-0 min-w-0"
                      style={{ flex: `${g.width / g.height} 1 0` }}
                    >
                      <GuideImage guide={g} />
                    </div>
                  ),
                )}
              </div>
            ) : (
              <div className="flex-1" />
            )}

            {body.tip && (
              <TipBox title={body.tip.title} phrase={body.tip.phrase} />
            )}
          </>
        ) : (
          <>
            <p className="mt-4 text-sm text-muted-foreground">
              이 단계 내용은 준비 중이에요.
            </p>
            <div className="mt-auto max-w-md">
              <StepNav
                allDone={false}
                prevLabel={prevLabel}
                nextLabel={nextLabel}
                onPrev={onPrev}
                onNext={onNext}
              />
            </div>
          </>
        )}
      </section>

      {/* 오른쪽: 할 일 체크, 막혔을 때 */}
      {body && (
        <div className="flex min-h-0 flex-col gap-6 lg:gap-4">
          <section className="rounded-2xl border bg-card p-5 shadow-sm lg:p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-bold">할 일 체크</h3>
              <span
                className={
                  "rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 " +
                  (allDone
                    ? "bg-primary text-primary-foreground ring-primary"
                    : "bg-brand-muted text-brand-muted-foreground ring-brand-line")
                }
              >
                {doneCount} / {total} 완료
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              순서대로 하고, 끝낸 일을 눌러 체크해요.
            </p>

            <div
              className="mt-3 h-1.5 overflow-hidden rounded-full bg-accent"
              aria-hidden
            >
              <div
                className="h-full rounded-full bg-primary transition-[width] duration-300"
                style={{ width: `${total ? (doneCount / total) * 100 : 0}%` }}
              />
            </div>

            <ol className="mt-3 space-y-2">
              {body.checks.map((c, i) => {
                const on = !!checks[c.id]
                return (
                  <li key={c.id}>
                    <div
                      className={
                        "flex items-stretch rounded-xl border transition-colors " +
                        (on
                          ? "border-brand-line bg-brand-soft"
                          : "hover:border-primary/50")
                      }
                    >
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => onToggle(c.id)}
                        className={
                          "group flex min-w-0 flex-1 items-center gap-3 rounded-xl px-4 py-2.5 text-left text-sm " +
                          (on ? "" : "hover:bg-accent")
                        }
                      >
                        <span
                          className={
                            "flex size-6 shrink-0 items-center justify-center rounded-md border-2 transition-colors " +
                            (on
                              ? "border-primary bg-primary text-primary-foreground"
                              : "border-muted-foreground/40 bg-background group-hover:border-primary")
                          }
                        >
                          {on && (
                            <Check
                              aria-hidden
                              className="size-4"
                              strokeWidth={3}
                            />
                          )}
                        </span>
                        <span
                          className={
                            "min-w-0 flex-1 " +
                            (on
                              ? "font-semibold text-brand-muted-foreground"
                              : "")
                          }
                        >
                          <span className="mr-1.5 text-muted-foreground">
                            {i + 1}.
                          </span>
                          {c.label}
                          {c.ask && (
                            <span
                              title={c.ask}
                              className="mt-1 block truncate text-xs font-normal text-muted-foreground"
                            >
                              보낼 문장: “{c.ask}”
                            </span>
                          )}
                        </span>
                        {!c.ask && (
                          <span
                            className={
                              "shrink-0 text-xs " +
                              (on
                                ? "font-semibold text-primary"
                                : "text-muted-foreground")
                            }
                          >
                            {on ? "완료" : "눌러서 체크"}
                          </span>
                        )}
                      </button>
                      {c.ask && <AskCopy text={c.ask} />}
                    </div>
                  </li>
                )
              })}
            </ol>

            {allDone && (
              <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-primary">
                <PartyPopper aria-hidden className="size-4" />
                모두 끝났어요. 다음 단계로 가요.
              </p>
            )}

            <StepNav
              allDone={allDone}
              prevLabel={prevLabel}
              nextLabel={nextLabel}
              onPrev={onPrev}
              onNext={onNext}
            />
          </section>

          <HelpPrompt key={step.id} items={body.help} where={helpWhere} />
        </div>
      )}
    </div>
  )
}

function LinkRow({ link, compact }: { link: StepLink; compact: boolean }) {
  const [open, setOpen] = useState(false)
  const button =
    "inline-flex shrink-0 items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"

  return (
    <div className="flex items-center gap-3 rounded-xl border bg-surface p-3.5">
      <span
        className={
          (compact ? "hidden " : "flex ") +
          "size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft ring-1 ring-brand-line"
        }
      >
        {link.dialog ? (
          <BookOpen aria-hidden className="size-4 text-primary" />
        ) : (
          <ExternalLink aria-hidden className="size-4 text-primary" />
        )}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{link.label}</p>
        {link.note && (
          <p className="text-xs leading-snug text-muted-foreground">
            {link.note}
          </p>
        )}
      </div>
      {link.dialog ? (
        <>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className={button}
            aria-haspopup="dialog"
          >
            열기
          </button>
          <LinkDialog
            dialog={link.dialog}
            open={open}
            onClose={() => setOpen(false)}
          />
        </>
      ) : (
        <a href={link.href} target="_blank" rel="noopener" className={button}>
          열기
          <ExternalLink aria-hidden className="size-4" />
          <span className="sr-only">(새 탭)</span>
        </a>
      )}
    </div>
  )
}

function StepNav({
  allDone,
  prevLabel,
  nextLabel,
  onPrev,
  onNext,
}: {
  allDone: boolean
  prevLabel: string
  nextLabel: string | null
  onPrev: () => void
  onNext: () => void
}) {
  return (
    <nav aria-label="단계 이동" className="mt-4 flex gap-2 border-t pt-4">
      <button
        type="button"
        onClick={onPrev}
        className="inline-flex h-12 shrink-0 items-center gap-1.5 rounded-md border px-4 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <ArrowLeft aria-hidden className="size-4" />
        이전
        <span className="sr-only">: {prevLabel}</span>
      </button>
      {nextLabel ? (
        <button
          type="button"
          onClick={onNext}
          className={
            "inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-md px-5 text-base font-semibold transition " +
            (allDone
              ? "bg-cta text-cta-foreground shadow-sm hover:opacity-90"
              : "border-2 border-cta bg-background text-cta-foreground hover:bg-cta/30")
          }
        >
          {allDone ? "다 했어요, 다음 단계로" : "다음 단계로"}
          <span className="font-normal opacity-80">· {nextLabel}</span>
          <ArrowRight aria-hidden className="size-5" />
        </button>
      ) : (
        <p className="flex h-12 flex-1 items-center justify-center rounded-md bg-brand-soft text-sm font-semibold text-brand-muted-foreground ring-1 ring-brand-line">
          마지막 단계예요
        </p>
      )}
    </nav>
  )
}

/** 번호 순서대로 하는 일. 문장 복사·링크 열기를 그 자리에 붙여요 */
function FlowList({
  items,
  forceDense,
}: {
  items: StepFlowItem[]
  forceDense: boolean
}) {
  // 할 일이 5개 이상이면 한 화면에 들어가도록 촘촘하게 보여 줘요. 복사는 항상 전체 문장이에요.
  // 허브에서는 헤더·사이드바만큼 칸이 작아서, 화면에 안 들어갈 때도 촘촘하게 해요(forceDense).
  const dense = items.length >= 5 || forceDense
  return (
    <ol className={dense ? "mt-2 space-y-1.5" : "mt-3 space-y-2"}>
      {items.map((item, i) => (
        <li
          key={item.text}
          className={cn(
            "flex gap-3 rounded-xl border bg-surface px-3.5",
            dense ? "py-2" : "py-2.5",
          )}
        >
          <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
            {i + 1}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-semibold leading-snug">
              {item.text}
            </p>
            {item.note && (
              <p
                className={cn(
                  "mt-0.5 text-muted-foreground",
                  dense ? "text-xs" : "text-sm",
                )}
              >
                {item.note}
              </p>
            )}
            {item.copy && (
              <div
                className={cn(
                  "flex items-center gap-3 rounded-lg bg-background px-3 ring-1 ring-border",
                  dense ? "mt-1 py-1" : "mt-1.5 py-1.5",
                )}
              >
                <p
                  title={item.copy}
                  className={cn(
                    "min-w-0 flex-1 text-sm leading-snug",
                    dense ? "line-clamp-1" : "line-clamp-2",
                  )}
                >
                  “{item.copy}”
                </p>
                <AskCopy text={item.copy} bare />
              </div>
            )}
          </div>
          {item.link && (
            <a
              href={item.link.href}
              target="_blank"
              rel="noopener"
              className="inline-flex shrink-0 items-center gap-1.5 self-center rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              {item.link.label}
              <ExternalLink aria-hidden className="size-4" />
              <span className="sr-only">(새 탭)</span>
            </a>
          )}
        </li>
      ))}
    </ol>
  )
}

/** 왼쪽 칸 맨 아래 "앞으로는 이렇게 말해요" 상자 */
function TipBox({ title, phrase }: { title: string; phrase: string }) {
  return (
    <div className="mt-3 rounded-xl bg-brand-soft px-4 py-3 ring-1 ring-brand-line">
      <p className="flex items-center gap-1.5 text-sm font-semibold text-brand-muted-foreground">
        <MessageSquareText aria-hidden className="size-4 text-primary" />
        {title}
      </p>
      <div className="mt-2 flex items-center gap-3 rounded-lg bg-background px-4 py-2.5 ring-1 ring-brand-line">
        <p className="min-w-0 flex-1 text-base font-semibold">“{phrase}”</p>
        <AskCopy text={phrase} bare />
      </div>
    </div>
  )
}

/** 할 일 항목 옆의 [문장 복사]. 무엇을 물어볼지 바로 보이게 해요 */
function AskCopy({ text, bare }: { text: string; bare?: boolean }) {
  const [copied, setCopied] = useState(false)
  return (
    <div
      className={"flex shrink-0 items-center " + (bare ? "" : "border-l px-2")}
    >
      <button
        type="button"
        title={text}
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(text)
            setCopied(true)
            setTimeout(() => setCopied(false), 1600)
          } catch {
            setCopied(false)
          }
        }}
        className="inline-flex items-center gap-1 rounded-md bg-primary px-2.5 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90"
      >
        {copied ? (
          <Check aria-hidden className="size-3.5" />
        ) : (
          <Copy aria-hidden className="size-3.5" />
        )}
        <span aria-live="polite">{copied ? "복사했어요" : "문장 복사"}</span>
        <span className="sr-only">: {text}</span>
      </button>
    </div>
  )
}
