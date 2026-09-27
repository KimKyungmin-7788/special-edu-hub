import { Link } from "react-router-dom"
import { Eye, Lock, Paperclip, NotebookPen } from "lucide-react"
import { getCategory } from "@/config/categories"
import type { Practice } from "@/lib/practices"

/** 날짜 표시 "2026.09.28" */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  const p = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}.${p(d.getMonth() + 1)}.${p(d.getDate())}`
}

/** 대표 교과(첫 상위 분류) 짧은 이름. */
export function mainSubjectLabel(p: Practice): string | null {
  const c = p.categoryIds.map((id) => getCategory(id)).find((c) => c && !c.parentId)
  return c ? (c.shortName ?? c.name) : null
}

/** 대표 사진 — 없으면 중립 플레이스홀더. 부모는 relative + aspect 지정. */
export function PracticeCover({ practice }: { practice: Practice }) {
  if (practice.coverUrl)
    return (
      <img
        src={practice.coverUrl}
        alt=""
        loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
      />
    )
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-surface text-muted-foreground">
      <NotebookPen className="size-7" aria-hidden />
    </div>
  )
}

export function OwnerAvatar({ name, url, size = "size-5" }: { name: string; url: string | null; size?: string }) {
  return (
    <span
      className={`flex ${size} shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-[10px] font-medium text-muted-foreground`}
    >
      {url ? (
        <img src={url} alt="" loading="lazy" className="size-full object-cover" />
      ) : (
        (name || "?").charAt(0).toUpperCase()
      )}
    </span>
  )
}

/**
 * 수업실천사례 카드 — 앱 카드(AppCard)와 같은 틀.
 * 대표 사진 / 좌상단 대표 교과 뱃지(+교사 전용 칩) / 제목·요약 2줄 고정 / 하단 작성자·날짜 / 조회·첨부 수.
 * 볼 권한 없는 교사 전용 사례는 사진 위 잠금 표시.
 */
export function PracticeCard({ practice }: { practice: Practice }) {
  const label = mainSubjectLabel(practice)
  const teachersOnly = practice.visibility === "teachers" && !practice.locked
  const name = practice.ownerNickname ?? "선생님"

  return (
    <Link
      to={`/practices/${practice.id}`}
      className="group flex h-full flex-col overflow-hidden rounded-xl border bg-card transition-[border-color,box-shadow,translate] duration-200 hover:border-primary/50 hover:shadow-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-safe:hover:-translate-y-1"
    >
      <div className="relative aspect-video overflow-hidden bg-surface">
        <div className="h-full w-full transition-transform duration-300 motion-safe:group-hover:scale-[1.04]">
          <PracticeCover practice={practice} />
        </div>
        {practice.locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-background/90 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm">
              <Lock className="size-3.5" aria-hidden />
              인증교사 전용
            </span>
          </div>
        )}
        {(label || teachersOnly) && (
          <div className="absolute left-2 top-2 flex max-w-[calc(100%-1rem)] items-center gap-1">
            {label && (
              <span className="truncate rounded-full bg-brand-muted px-2.5 py-0.5 text-xs font-semibold text-brand-muted-foreground shadow-sm ring-1 ring-brand-line">
                {label}
              </span>
            )}
            {teachersOnly && (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-xs font-medium text-foreground shadow-sm">
                <Lock className="size-3" aria-hidden />
                교사 전용
              </span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col gap-2 px-4 pt-3.5 pb-3">
        <h3 className="line-clamp-2 min-h-[2lh] text-base font-semibold leading-snug tracking-tight transition-colors group-hover:text-primary">
          {practice.title}
        </h3>
        <p className="line-clamp-2 min-h-[2lh] text-sm leading-snug text-muted-foreground">
          {practice.summary}
        </p>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-muted-foreground">
          <span className="flex min-w-0 items-center gap-1.5">
            <OwnerAvatar name={name} url={practice.ownerAvatarUrl} />
            <span className="truncate">{name}</span>
          </span>
          <span className="flex shrink-0 items-center gap-3">
            {practice.fileCount > 0 && (
              <span className="inline-flex items-center gap-1" title="첨부파일">
                <Paperclip className="size-3.5" aria-hidden />
                {practice.fileCount}
              </span>
            )}
            <span className="inline-flex items-center gap-1" title="조회수">
              <Eye className="size-3.5" aria-hidden />
              {practice.viewCount}
            </span>
          </span>
        </div>
      </div>
    </Link>
  )
}

/** 목록 보기 한 줄 — 작은 사진 · 교과 · 제목/요약 · 작성자 · 날짜. */
export function PracticeRow({ practice }: { practice: Practice }) {
  const label = mainSubjectLabel(practice)
  const name = practice.ownerNickname ?? "선생님"
  return (
    <Link
      to={`/practices/${practice.id}`}
      className="group flex items-center gap-4 px-2 py-3 transition-colors hover:bg-accent/60 sm:px-3"
    >
      <div className="relative aspect-video w-24 shrink-0 overflow-hidden rounded-md bg-surface sm:w-32">
        <PracticeCover practice={practice} />
        {practice.locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/50">
            <Lock className="size-4 text-foreground" aria-hidden />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {label && <span className="font-semibold text-primary">{label}</span>}
          {practice.target && <span>{practice.target}</span>}
          {practice.visibility === "teachers" && (
            <span className="inline-flex items-center gap-0.5">
              <Lock className="size-3" aria-hidden />
              교사 전용
            </span>
          )}
        </div>
        <p className="mt-0.5 truncate font-medium group-hover:text-primary">{practice.title}</p>
        <p className="truncate text-sm text-muted-foreground">{practice.summary}</p>
      </div>
      <div className="hidden shrink-0 flex-col items-end gap-1 text-xs text-muted-foreground sm:flex">
        <span className="flex items-center gap-1.5">
          <OwnerAvatar name={name} url={practice.ownerAvatarUrl} />
          {name}
        </span>
        <span className="flex items-center gap-3">
          {practice.fileCount > 0 && (
            <span className="inline-flex items-center gap-1">
              <Paperclip className="size-3.5" aria-hidden />
              {practice.fileCount}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            <Eye className="size-3.5" aria-hidden />
            {practice.viewCount}
          </span>
          <span className="tabular-nums">{formatDate(practice.createdAt)}</span>
        </span>
      </div>
    </Link>
  )
}
