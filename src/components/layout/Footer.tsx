import { site } from "@/config/site"
import { CONTAINER } from "@/config/layout"

/** 푸터 — 누리집명 + 안내 문구(config에서). */
export function Footer() {
  return (
    <footer className="mt-16 border-t bg-surface">
      <div className={`${CONTAINER} py-8`}>
        <p className="text-sm font-medium">{site.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">{site.footer.note}</p>
      </div>
    </footer>
  )
}
