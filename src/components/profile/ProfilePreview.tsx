import type { ComponentType } from "react"
import { Rss, Link as LinkIcon, Mail } from "lucide-react"
import { InstagramIcon, YoutubeIcon } from "@/components/profile/BrandIcons"
import type { Profile } from "@/lib/profile"

/**
 * 프로필 미리보기 내용 (2단계 묶음 C).
 * 아바타 · 닉네임 · 교사인증 배지 · (공개 시) 이메일 · 홍보 링크 · "프로필 전체 보기"(준비 중).
 * 홍보 링크는 흑백 브랜드 로고 아이콘 버튼으로 표시(글자 없이, 종류는 aria/title).
 * 모달 동작은 Modal/ProfileTrigger 가 담당하고, 여기는 표시만 한다.
 */

type ProfilePreviewProps = {
  profile: Profile | null
  loading: boolean
  /** 제목 요소 id (모달 aria-labelledby 연결) */
  titleId?: string
}

type IconComp = ComponentType<{ className?: string }>
type PromoLink = { href: string; label: string; Icon: IconComp }

/** 입력된 홍보 링크만 골라 표시 순서대로. */
function promoLinks(p: Profile): PromoLink[] {
  const links: PromoLink[] = []
  if (p.blogUrl) links.push({ href: p.blogUrl, label: "블로그", Icon: Rss })
  if (p.instagramUrl)
    links.push({ href: p.instagramUrl, label: "인스타그램", Icon: InstagramIcon })
  if (p.youtubeUrl)
    links.push({ href: p.youtubeUrl, label: "유튜브", Icon: YoutubeIcon })
  if (p.websiteUrl)
    links.push({ href: p.websiteUrl, label: "사이트", Icon: LinkIcon })
  return links
}

export function ProfilePreview({ profile, loading, titleId }: ProfilePreviewProps) {
  if (loading) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">불러오는 중…</p>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">
          프로필을 불러올 수 없습니다.
        </p>
      </div>
    )
  }

  const name = profile.nickname?.trim() || "이름 없음"
  const initial = name.charAt(0).toUpperCase()
  const links = promoLinks(profile)

  return (
    <div className="p-6">
      {/* 아바타 + 이름 + 교사인증 배지 */}
      <div className="flex items-center gap-4 pr-8">
        <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-surface text-xl font-medium text-muted-foreground">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt="" className="size-full object-cover" />
          ) : (
            <span>{initial}</span>
          )}
        </div>
        <div className="min-w-0">
          <h2
            id={titleId}
            className="truncate text-lg font-semibold tracking-tight"
          >
            {name}
          </h2>
          {profile.isTeacherVerified && (
            <span className="mt-1 inline-block rounded-full border border-border bg-surface px-2 py-0.5 text-xs font-medium text-foreground">
              교사 인증됨
            </span>
          )}
        </div>
      </div>

      {/* 이메일 — 본인이 공개로 둔 경우에만 */}
      {profile.emailPublic && profile.email && (
        <a
          href={`mailto:${profile.email}`}
          className="mt-4 inline-flex max-w-full items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <Mail className="size-4 shrink-0" aria-hidden />
          <span className="truncate">{profile.email}</span>
        </a>
      )}

      {/* 홍보 링크 — 입력된 것만, 흑백 로고 버튼. 새 탭 + noopener noreferrer */}
      {links.length > 0 && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {links.map(({ href, label, Icon }) => (
            <li key={href}>
              <a
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                title={label}
                aria-label={label}
                className="inline-flex size-9 items-center justify-center rounded-full border border-border text-foreground hover:bg-accent"
              >
                <Icon className="size-4" />
              </a>
            </li>
          ))}
        </ul>
      )}

      {/* 프로필 전체 보기 — 자리만(준비 중). 공개 프로필 페이지는 후속 단계. */}
      <button
        type="button"
        disabled
        title="준비 중"
        className="mt-6 w-full cursor-not-allowed rounded-md border border-border bg-card px-4 py-2 text-sm text-muted-foreground"
      >
        프로필 전체 보기 (준비 중)
      </button>
    </div>
  )
}
