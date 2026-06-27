import { Link } from "react-router-dom"
import { site } from "@/config/site"
import { CONTAINER } from "@/config/layout"
import { cn } from "@/lib/utils"

/** 푸터 — 누리집명 + 안내 문구 + 정책/소개 링크(전부 config에서). */
export function Footer() {
  return (
    <footer className="mt-16 border-t bg-surface">
      <div
        className={cn(
          CONTAINER,
          "flex flex-col gap-4 py-8 sm:flex-row sm:items-start sm:justify-between",
        )}
      >
        <p className="text-sm font-medium">{site.name}</p>

        <nav aria-label="정책 및 안내">
          <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
            {site.footer.links.map((l) => (
              <li key={l.to}>
                <Link
                  to={l.to}
                  className={cn(
                    "text-muted-foreground hover:text-foreground",
                    l.emphasis && "font-medium text-foreground",
                  )}
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  )
}
