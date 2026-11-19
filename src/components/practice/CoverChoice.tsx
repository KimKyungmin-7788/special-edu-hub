import { useState } from "react"
import { ImagePlus } from "lucide-react"
import { planText } from "@/config/practice"
import { displayTitle, type App } from "@/lib/apps"
import { CoverField, type CoverValue } from "@/components/practice/CoverField"
import { cn } from "@/lib/utils"

/**
 * 표지 고르기 — 이 수업에 연결한 학습자료의 썸네일 중 하나, 또는 사진을 직접 올리기.
 * 고른 썸네일 주소를 그대로 표지로 쓴다(사진 파일을 새로 만들지 않음).
 */
export function CoverChoice({
  apps,
  value,
  onChange,
  disabled,
}: {
  apps: App[]
  value: CoverValue
  onChange: (v: CoverValue) => void
  disabled?: boolean
}) {
  const withThumb = apps.filter((a) => a.thumbnailUrl)
  const pickedApp = !value.file && withThumb.some((a) => a.thumbnailUrl === value.url)
  // 직접 고르기 전(null)에는 지금 표지가 자료 썸네일인지로 정한다 — 자료 목록이 늦게 와도 맞게 보이도록.
  const [upload, setUpload] = useState<boolean | null>(null)
  const showUpload = withThumb.length === 0 || (upload ?? !pickedApp)

  return (
    <div className="flex flex-col gap-3">
      {withThumb.length > 0 && (
        <div className="flex flex-wrap gap-3">
          {withThumb.map((a) => {
            const on = !showUpload && value.url === a.thumbnailUrl
            return (
              <button
                key={a.id}
                type="button"
                onClick={() => {
                  setUpload(false)
                  onChange({ file: null, url: a.thumbnailUrl })
                }}
                aria-pressed={on}
                disabled={disabled}
                className={cn(
                  "w-36 rounded-lg border p-1 text-left text-xs",
                  on ? "border-primary ring-2 ring-primary" : "border-border hover:bg-accent",
                )}
              >
                <img src={a.thumbnailUrl} alt="" className="aspect-video w-full rounded-md object-cover" />
                <span className="mt-1 block truncate px-0.5">{displayTitle(a)}</span>
              </button>
            )
          })}
          <button
            type="button"
            onClick={() => {
              setUpload(true)
              if (pickedApp) onChange({ file: null, url: "" })
            }}
            aria-pressed={showUpload}
            disabled={disabled}
            className={cn(
              "flex w-36 flex-col items-center justify-center gap-1 rounded-lg border p-1 text-xs",
              showUpload ? "border-primary ring-2 ring-primary" : "border-border text-muted-foreground hover:bg-accent",
            )}
          >
            <span className="flex aspect-video w-full items-center justify-center rounded-md bg-surface">
              <ImagePlus className="size-5" aria-hidden />
            </span>
            {planText.coverUpload}
          </button>
        </div>
      )}
      {showUpload && <CoverField value={value} onChange={onChange} disabled={disabled} />}
    </div>
  )
}
