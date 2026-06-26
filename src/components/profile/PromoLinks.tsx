import { type ComponentType } from "react"
import { Rss, Link as LinkIcon } from "lucide-react"
import { InstagramIcon, YoutubeIcon } from "@/components/profile/BrandIcons"
import { cn } from "@/lib/utils"
import type { Profile } from "@/lib/profile"

/**
 * 홍보 링크 아이콘 줄 (흑백 로고 버튼, 글자 없이 aria/title 로 종류 표시).
 * 새 탭 + rel="noopener noreferrer" — 외부 URL 안전 규칙(PRD §11.1).
 * 프로필 미리보기 모달과 앱 상세(개발자) 양쪽에서 공용.
 */
type IconComp = ComponentType<{ className?: string }>
type PromoLink = { href: string; label: string; Icon: IconComp }

function collect(p: Profile): PromoLink[] {
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

export function PromoLinks({
  profile,
  className,
}: {
  profile: Profile
  className?: string
}) {
  const links = collect(profile)
  if (links.length === 0) return null

  return (
    <ul className={cn("flex flex-wrap gap-2", className)}>
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
  )
}
