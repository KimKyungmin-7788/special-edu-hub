import { consents, type ConsentKind } from "@/config/consents"

/**
 * 동의 체크 목록 — 가입 화면과 로그인 뒤 동의 창이 함께 쓴다.
 * 문구·본문은 config/consents 에서. 모두 필수 항목이다.
 */
export function ConsentChecks({
  kinds,
  checked,
  onChange,
  disabled,
}: {
  kinds: ConsentKind[]
  checked: ConsentKind[]
  onChange: (next: ConsentKind[]) => void
  disabled?: boolean
}) {
  function toggle(kind: ConsentKind, on: boolean) {
    onChange(on ? [...checked, kind] : checked.filter((k) => k !== kind))
  }

  return (
    <div className="space-y-3">
      {kinds.map((kind) => {
        const doc = consents[kind]
        const link = doc.href && (
          <a
            href={doc.href}
            target="_blank"
            rel="noopener"
            className="shrink-0 text-xs text-muted-foreground underline"
          >
            전문 보기
          </a>
        )
        return (
          <div key={kind}>
            <div className="flex items-start justify-between gap-2">
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={checked.includes(kind)}
                  onChange={(e) => toggle(kind, e.target.checked)}
                  disabled={disabled}
                />
                <span>
                  <span className="text-muted-foreground">(필수)</span> {doc.label}
                </span>
              </label>
              {link}
            </div>
            {doc.items && (
              <div className="ml-6 mt-1.5 rounded-md border border-border bg-card px-3 py-2 text-xs leading-relaxed text-muted-foreground">
                <ul className="list-disc space-y-1 pl-4">
                  {doc.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                {doc.notice && <p className="mt-2 text-foreground">{doc.notice}</p>}
                {doc.details && (
                  <details className="mt-1">
                    <summary className="cursor-pointer underline">자세히 보기</summary>
                    <ul className="mt-1.5 list-disc space-y-1 pl-4">
                      {doc.details.map((d) => (
                        <li key={d}>{d}</li>
                      ))}
                    </ul>
                  </details>
                )}
                {doc.recommend && <p className="mt-2 text-foreground">{doc.recommend}</p>}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
