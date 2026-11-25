import { useEffect, useRef, useState } from "react"
import { AlertTriangle, Plus, X } from "lucide-react"
import { planText } from "@/config/practice"
import { errorText } from "@/lib/practices"
import {
  PRACTICE_PHOTOS_MAX,
  photoToCanvas,
  signPracticePhotos,
  uploadPracticePhoto,
  type PracticePhoto,
} from "@/lib/practicePhotos"
import { PhotoMosaicDialog } from "@/components/practice/PhotoMosaicDialog"

const t = planText.photos

/**
 * 실천 기록 활동사진 칸(78) — 사진을 고르면 모자이크 창이 열리고, '올리기'를 누를 때 다시 그린 JPG 만 올린다.
 * 빼기는 목록에서만 뺀다. 저장소 정리는 부모가 저장 성공 후 한다.
 * checked: 사진이 있을 때 필수인 개인정보 확인란(부모가 저장 때 검사).
 */
export function PracticePhotoField({
  value,
  onChange,
  checked,
  onCheckedChange,
  onBusyChange,
  disabled,
}: {
  value: PracticePhoto[]
  onChange: (v: PracticePhoto[]) => void
  checked: boolean
  onCheckedChange: (v: boolean) => void
  onBusyChange?: (busy: boolean) => void
  disabled?: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [urls, setUrls] = useState<Map<string, string>>(new Map())
  const [editing, setEditing] = useState<HTMLCanvasElement | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const missing = value.map((p) => p.path).filter((p) => !urls.has(p))
  useEffect(() => {
    if (!missing.length) return
    let alive = true
    signPracticePhotos(missing).then((m) => alive && setUrls((cur) => new Map([...cur, ...m])))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missing.join("|")])

  async function pick(file: File | undefined) {
    if (!file) return
    setError(null)
    try {
      setEditing(await photoToCanvas(file))
    } catch (e) {
      setError(errorText(e, "사진을 열지 못했어요."))
    }
  }

  async function upload(canvas: HTMLCanvasElement) {
    setUploading(true)
    onBusyChange?.(true)
    setError(null)
    try {
      const photo = await uploadPracticePhoto(canvas)
      onChange([...value, photo])
      setEditing(null)
    } catch (e) {
      setError(errorText(e, "사진을 올리지 못했어요."))
    } finally {
      setUploading(false)
      onBusyChange?.(false)
    }
  }

  return (
    <div className="flex flex-col gap-3 px-3 py-3">
      <p className="flex gap-2 rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm leading-relaxed">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
        <span>{t.notice}</span>
      </p>

      <div className="grid max-w-xl grid-cols-2 gap-3">
        {value.map((p, i) => (
          <div key={p.path} className="relative aspect-[4/3] overflow-hidden rounded-md bg-surface">
            {urls.get(p.path) && (
              <img src={urls.get(p.path)} alt={`${t.label} ${i + 1}`} className="size-full object-cover" />
            )}
            <button
              type="button"
              onClick={() => onChange(value.filter((x) => x.path !== p.path))}
              disabled={disabled || uploading}
              aria-label={`${t.label} ${i + 1} ${t.remove}`}
              className="absolute right-1.5 top-1.5 rounded-md bg-background/90 p-1 text-muted-foreground hover:text-foreground disabled:opacity-50"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ))}
        {value.length < PRACTICE_PHOTOS_MAX && (
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={disabled || uploading}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border text-sm text-muted-foreground hover:bg-accent hover:text-foreground disabled:opacity-50"
          >
            <Plus className="size-5" aria-hidden />
            <span className="whitespace-nowrap">{t.add}</span>
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0])
          e.target.value = ""
        }}
      />
      {error && !editing && <p className="text-xs text-destructive">{error}</p>}

      {value.length > 0 && (
        <label className="flex items-start gap-2.5 rounded-md border border-border bg-card p-3 text-sm">
          <input
            type="checkbox"
            className="mt-0.5"
            checked={checked}
            onChange={(e) => onCheckedChange(e.target.checked)}
            disabled={disabled}
          />
          <span>
            <span className="font-medium">{t.checkTitle}</span>
            <span className="mt-0.5 block text-muted-foreground">{t.check}</span>
          </span>
        </label>
      )}

      {editing && (
        <PhotoMosaicDialog
          source={editing}
          busy={uploading}
          error={error}
          onCancel={() => {
            setEditing(null)
            setError(null)
          }}
          onDone={upload}
        />
      )}
    </div>
  )
}
