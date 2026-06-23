import { site } from "@/config/site"

/** 푸터 — 누리집명 + 안내 문구(config에서). */
export function Footer() {
  return (
    <footer className="mt-16 border-t bg-surface">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <p className="text-sm font-medium">{site.name}</p>
        <p className="mt-1 text-sm text-muted-foreground">{site.footer.note}</p>
      </div>
    </footer>
  )
}
