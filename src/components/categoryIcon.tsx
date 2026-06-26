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
  Zap,
  type LucideIcon,
} from "lucide-react"

/** config 의 icon 문자열 → lucide 아이콘 컴포넌트 매핑. */
export const iconMap: Record<string, LucideIcon> = {
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
  zap: Zap,
}

/** icon 문자열로 lucide 컴포넌트 조회. 없으면 Sparkles 로 대체. */
export function getCategoryIcon(name?: string): LucideIcon {
  return (name && iconMap[name]) || Sparkles
}
