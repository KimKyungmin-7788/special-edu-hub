import { useEffect } from "react"
import { site } from "@/config/site"
import { categories } from "@/config/categories"

/**
 * 묶음 1 확인용 임시 화면.
 * 토큰(색·폰트·반경) + config 연결이 동작하는지만 보여준다.
 * 실제 레이아웃·라우팅·페이지는 묶음 2부터 작성한다.
 */
function App() {
  useEffect(() => {
    document.title = site.name
  }, [])

  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <p className="text-sm text-muted-foreground">{site.logoText}</p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">{site.name}</h1>

      <section className="mt-8 rounded-lg border bg-surface p-6">
        <p className="whitespace-pre-line text-lg leading-relaxed">
          {site.hero.title}
        </p>
        <button className="mt-5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">
          {site.hero.ctaLabel}
        </button>
      </section>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-muted-foreground">
          카테고리 ({categories.length})
        </h2>
        <ul className="mt-3 flex flex-wrap gap-2">
          {categories.map((c) => (
            <li
              key={c.id}
              className="rounded-md border bg-card px-3 py-1.5 text-sm"
            >
              {c.name}
            </li>
          ))}
        </ul>
      </section>

      <p className="mt-10 text-xs text-muted-foreground">
        묶음 1 (초기화) 확인용 화면 — 토큰·config 연결 점검.
      </p>
    </main>
  )
}

export default App
