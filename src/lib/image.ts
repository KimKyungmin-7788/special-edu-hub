/**
 * 본문 삽입 이미지 다운스케일 — 업로드 직전 클라이언트에서 처리.
 * 긴 변을 maxDim 이하로 줄이고 WebP 로 재인코딩(투명도 유지·용량↓).
 * 고해상도·대용량 이미지 문제와 2MB 초과 업로드 실패를 예방한다.
 *
 * - 애니메이션 보존을 위해 GIF 는 원본 그대로 둔다.
 * - 이미 충분히 작으면(축소 불필요 + 1MB 이하) 재인코딩 없이 원본 반환.
 * - 변환 중 오류가 나면 원본을 반환(업로드 단계에서 크기·타입 재검증).
 */
export async function downscaleImage(
  file: File,
  maxDim = 1600,
  quality = 0.85,
): Promise<File> {
  if (!file.type.startsWith("image/")) return file
  if (file.type === "image/gif") return file

  try {
    const bitmap = await createImageBitmap(file)
    const longest = Math.max(bitmap.width, bitmap.height)
    const scale = Math.min(1, maxDim / longest)

    if (scale === 1 && file.size <= 1024 * 1024) {
      bitmap.close?.()
      return file
    }

    const w = Math.round(bitmap.width * scale)
    const h = Math.round(bitmap.height * scale)
    const canvas = document.createElement("canvas")
    canvas.width = w
    canvas.height = h
    const ctx = canvas.getContext("2d")
    if (!ctx) {
      bitmap.close?.()
      return file
    }
    ctx.drawImage(bitmap, 0, 0, w, h)
    bitmap.close?.()

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/webp", quality),
    )
    if (!blob) return file

    const name = file.name.replace(/\.[^.]+$/, "") + ".webp"
    return new File([blob], name, { type: "image/webp" })
  } catch {
    return file
  }
}
