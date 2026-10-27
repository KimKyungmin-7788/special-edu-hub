import { Link } from "react-router-dom"

export function BoardNotice({ title, body, to = "/board", label = "목록으로" }: { title: string; body?: string; to?: string; label?: string }) {
  return <div className="rounded-lg border bg-card p-6">
    <h2 className="font-semibold">{title}</h2>
    {body && <p className="mt-2 text-sm text-muted-foreground">{body}</p>}
    <Link to={to} className="mt-4 inline-block text-sm font-medium text-primary underline underline-offset-4">{label}</Link>
  </div>
}
