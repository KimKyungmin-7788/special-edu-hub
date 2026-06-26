import { useRef, useState, type ChangeEvent, type FormEvent } from "react"
import {
  submitVerification,
  VERIFICATION_DOC_MAX_BYTES,
  VERIFICATION_DOC_MIME,
} from "@/lib/verification"
import type { VerificationRequest } from "@/lib/verification"

const inputClass =
  "w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"

const labelClass = "text-sm font-medium"

/**
 * 교사인증 신청 폼.
 * mode="new"  → 처음 신청
 * mode="reapply" → 반려 후 재신청 (UI 제목만 다름)
 * 제출 성공 시 onSuccess(request) 콜백 → 부모가 상태 전환.
 */
export function VerifyForm({
  mode,
  onSuccess,
}: {
  mode: "new" | "reapply"
  onSuccess: (req: VerificationRequest) => void
}) {
  const [region, setRegion] = useState("")
  const [school, setSchool] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
    setFileError(null)
    const picked = e.target.files?.[0] ?? null
    if (!picked) {
      setFile(null)
      return
    }
    if (!VERIFICATION_DOC_MIME.includes(picked.type)) {
      setFileError("이미지(JPG·PNG·WebP) 또는 PDF 파일만 업로드할 수 있습니다.")
      setFile(null)
      return
    }
    if (picked.size > VERIFICATION_DOC_MAX_BYTES) {
      setFileError("파일 크기는 5MB 이하여야 합니다.")
      setFile(null)
      return
    }
    setFile(picked)
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setSubmitError(null)

    if (!file) {
      setFileError("서류 파일을 선택해 주세요.")
      return
    }

    setSubmitting(true)
    try {
      const req = await submitVerification({ file, region, school })
      onSuccess(req)
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "오류가 발생했습니다.")
    } finally {
      setSubmitting(false)
    }
  }

  const formattedSize = file
    ? file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(0)} KB`
      : `${(file.size / 1024 / 1024).toFixed(1)} MB`
    : null

  return (
    <div className="flex flex-col gap-6">
      {/* 절차 안내 */}
      <div className="rounded-md border border-border bg-muted/40 p-4">
        <p className="text-sm font-semibold">인증 절차 안내</p>
        <ol className="mt-2 list-decimal space-y-1 pl-4 text-sm text-muted-foreground">
          <li>개인정보(이름·주민번호 등)를 가린 재직증명서 또는 경력증명서를 준비합니다.</li>
          <li>아래 폼에 근무 지역·학교와 함께 서류를 첨부해 제출합니다.</li>
          <li>관리자가 1~3일(영업일) 이내에 심사 후 결과를 알려드립니다.</li>
        </ol>
      </div>

      {/* 신청 폼 */}
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* 근무 지역 */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>
            근무 지역 <span className="text-destructive">*</span>
          </label>
          <input
            className={inputClass}
            placeholder="예: 강원특별자치도 강릉시"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            required
            disabled={submitting}
          />
        </div>

        {/* 학교 */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>
            학교 <span className="text-destructive">*</span>
          </label>
          <input
            className={inputClass}
            placeholder="예: 강릉오성학교"
            value={school}
            onChange={(e) => setSchool(e.target.value)}
            required
            disabled={submitting}
          />
        </div>

        {/* 서류 파일 */}
        <div className="flex flex-col gap-1.5">
          <label className={labelClass}>
            재직/경력증명서 <span className="text-destructive">*</span>
          </label>
          <p className="text-xs text-muted-foreground">
            개인정보를 가린 파일만 업로드하세요. JPG·PNG·WebP·PDF / 최대 5MB
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={submitting}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-muted disabled:opacity-50"
            >
              파일 선택
            </button>
            {file ? (
              <span className="text-sm text-foreground">
                {file.name}
                <span className="ml-1.5 text-xs text-muted-foreground">({formattedSize})</span>
              </span>
            ) : (
              <span className="text-sm text-muted-foreground">선택된 파일 없음</span>
            )}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.webp,.pdf"
            className="hidden"
            onChange={handleFileChange}
            disabled={submitting}
          />
          {fileError && (
            <p className="text-xs text-destructive">{fileError}</p>
          )}
        </div>

        {/* 에러 메시지 */}
        {submitError && (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            {submitError}
          </div>
        )}

        {/* 제출 버튼 */}
        <button
          type="submit"
          disabled={submitting}
          className="self-start rounded-md bg-primary px-6 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? "제출 중…" : mode === "reapply" ? "재신청하기" : "신청하기"}
        </button>
      </form>
    </div>
  )
}
