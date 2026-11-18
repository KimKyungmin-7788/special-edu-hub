import { useId, useState } from "react"
import { Modal } from "@/components/ui/Modal"
import { Emphasis } from "@/components/ui/Emphasis"
import { criteriaSource, guideInfo } from "@/config/criteria"

/**
 * 'KERIS 공교육 에듀테크 개인정보보호 가이드(2026) 필수기준' 글자를 링크처럼 보여 주고,
 * 누르면 가이드와 9개 기준을 쉬운 말로 푼 설명을 모달로 연다.
 */
export function GuideLink({ label = criteriaSource.name }: { label?: string }) {
  const [open, setOpen] = useState(false)
  const titleId = useId()

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-primary underline underline-offset-2 hover:opacity-80"
      >
        {label}
      </button>
      <Modal open={open} onClose={() => setOpen(false)} labelledBy={titleId} className="max-w-lg">
        <div className="max-h-[85vh] overflow-y-auto p-5 pr-12 text-sm leading-relaxed">
          <h2 id={titleId} className="text-base font-semibold">
            {guideInfo.title}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground">{guideInfo.source}</p>

          <p className="mt-3">
            <Emphasis text={guideInfo.intro} />
          </p>
          <p className="mt-2">
            <Emphasis text={guideInfo.scope} />
          </p>

          <h3 className="mt-4 font-semibold">필수기준 5개 영역 9개 항목</h3>
          <div className="mt-2 space-y-3">
            {guideInfo.areas.map((area) => (
              <div key={area.name}>
                <p className="font-medium text-primary">{area.name}</p>
                <ul className="mt-1 divide-y divide-border rounded-md border border-border">
                  {area.items.map((item) => (
                    <li key={item.id} className="px-3 py-2">
                      <p>
                        <span className="mr-1.5 text-xs text-muted-foreground">{item.id}</span>
                        {item.text}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">누리집: {item.check}</p>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <p className="mt-4 rounded-md bg-surface px-3 py-2 text-xs text-muted-foreground">
            {guideInfo.note} {criteriaSource.caveat}
          </p>
        </div>
      </Modal>
    </>
  )
}
