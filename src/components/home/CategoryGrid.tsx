import { Link } from "react-router-dom"
import {
  BookOpen,
  Calculator,
  Globe,
  FlaskConical,
  Music,
  Palette,
  Activity,
  House,
  Briefcase,
  Sparkles,
  Users,
  Settings,
  type LucideIcon,
} from "lucide-react"
import { categories, type Category } from "@/config/categories"

/** config 의 icon 문자열 → lucide 아이콘 컴포넌트 매핑. */
const iconMap: Record<string, LucideIcon> = {
  "book-open": BookOpen,
  calculator: Calculator,
  globe: Globe,
  "flask-conical": FlaskConical,
  music: Music,
  palette: Palette,
  activity: Activity,
  house: House,
  briefcase: Briefcase,
  sparkles: Sparkles,
  users: Users,
  settings: Settings,
}

/** 카테고리는 과목→과목별 상세, 업무→업무혁신 페이지로 이동. */
function categoryTo(c: Category): string {
  return c.type === "work" ? "/apps/work" : `/apps/subject/${c.id}`
}

/** 카테고리 진입 그리드 — 아이콘 + 라벨. */
export function CategoryGrid() {
  return (
    <section>
      <h2 className="mb-4 text-lg font-semibold tracking-tight">카테고리</h2>
      <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-6">
        {categories.map((c) => {
          const Icon = iconMap[c.icon] ?? Sparkles
          return (
            <li key={c.id}>
              <Link
                to={categoryTo(c)}
                className="flex flex-col items-center gap-2 rounded-lg border bg-card px-2 py-4 text-center transition-colors hover:border-foreground/30 hover:bg-accent"
              >
                <Icon className="size-6 text-foreground" aria-hidden />
                <span className="text-sm">{c.name}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
