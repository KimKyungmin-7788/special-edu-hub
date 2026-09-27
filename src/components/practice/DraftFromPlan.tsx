import { useRef, useState } from "react"
import { FileUp, Loader2, Sparkles } from "lucide-react"
import {
  errorText,
  requestPracticeDraft,
  uploadPracticeFile,
  type PracticeDraft,
  type PracticeFile,
} from "@/lib/practices"

/**
 * 설계안 PDF → AI 초안 (PRD §13.4).
 * PDF 를 첨부파일로 올린 뒤 그 주소로 서버(/api/practice-draft)에 초안을 요청한다.
 * 받은 초안과 올린 파일을 부모(PracticeForm)에 넘기면, 부모가 폼 칸을 채운다.
 */
export function DraftFromPlan({
  onDraft,
  canAttach,
  disabled,
}: {
  onDraft: (draft: PracticeDraft, file: PracticeFile) => void
  /** 첨부 자리가 남았는지(설계안도 첨부파일로 들어간다). */
  canAttach: boolean
  disabled?: boolean
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<"idle" | "uploading" | "reading">("idle")
  const [error, setError] = useState<string | null>(null)
  const busy = step !== "idle"

  async function pick(file: File | null) {
    if (!file) return
    setError(null)
    if (!/\.pdf$/i.test(file.name)) {
      setError("PDF 파일만 분석할 수 있어요. 한글 파일은 [파일 → PDF로 저장] 후 올려 주세요.")
      return
    }
    try {
      setStep("uploading")
      const uploaded = await uploadPracticeFile(file)
      setStep("reading")
      const draft = await requestPracticeDraft(uploaded.url)
      onDraft(draft, uploaded)
    } catch (e) {
      setError(errorText(e, "초안을 만들지 못했습니다."))
    } finally {
      setStep("idle")
    }
  }

  return (
    <section className="rounded-lg border border-brand-line bg-brand-soft/40 p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <Sparkles className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
          <div>
            <p className="font-medium">수업 설계안이 있으신가요?</p>
            <p className="mt-0.5 text-sm text-muted-foreground">
              설계안 PDF를 올리면 제목·교과·수업 개요·활동 흐름을 초안으로 채워 드려요. 설계안은
              첨부파일로도 함께 들어갑니다.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={disabled || busy || !canAttach}
          className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <FileUp className="size-4" aria-hidden />
          )}
          {step === "uploading" ? "올리는 중…" : step === "reading" ? "읽는 중…" : "설계안 올리기"}
        </button>
      </div>

      {step === "reading" && (
        <p className="mt-3 text-sm text-muted-foreground" role="status">
          설계안을 읽고 초안을 쓰고 있어요. 30초~1분쯤 걸려요. 이 화면을 닫지 말아 주세요.
        </p>
      )}
      {!canAttach && !busy && (
        <p className="mt-3 text-xs text-muted-foreground">
          첨부파일이 가득 찼어요(5개). 하나를 빼면 설계안을 올릴 수 있어요.
        </p>
      )}
      <p className="mt-3 text-xs text-muted-foreground">
        올린 설계안은 초안 작성을 위해 AI 서비스(Anthropic, 해외)로 보내집니다. 학생 실명 등 개인정보가
        없는지 확인해 주세요. PDF만 가능하며, 하루 10번까지 쓸 수 있어요.
      </p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-destructive">
          {error}
        </p>
      )}

      <input
        ref={fileRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={(e) => {
          pick(e.target.files?.[0] ?? null)
          e.target.value = ""
        }}
      />
    </section>
  )
}
