import { useParams } from "react-router-dom"

/** 앱 상세 — 묶음 4에서 제목·개발자·앱 열기·소개 본문·조회수로 채운다. */
export function AppDetail() {
  const { id } = useParams<{ id: string }>()

  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">앱 상세</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        앱 상세(id: {id ?? "?"})는 묶음 4에서 작성됩니다.
      </p>
    </div>
  )
}
