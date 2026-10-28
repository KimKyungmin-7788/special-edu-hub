import { useEffect, useRef, useState } from "react"
import type { Transaction } from "@tiptap/pm/state"
import {
  useEditor,
  EditorContent,
  useEditorState,
  type Editor,
} from "@tiptap/react"
import StarterKit from "@tiptap/starter-kit"
import Image from "@tiptap/extension-image"
import {
  Heading2,
  Heading3,
  Bold,
  Italic,
  Strikethrough,
  Underline as UnderlineIcon,
  Quote,
  Minus,
  List,
  ListOrdered,
  Link2,
  ImagePlus,
  Crop,
  AlignLeft,
  AlignCenter,
  AlignRight,
  IndentIncrease,
  IndentDecrease,
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { uploadThumbnail, THUMBNAIL_MIME, THUMBNAIL_MAX_BYTES } from "@/lib/apps"
import { downscaleImage } from "@/lib/image"
import { BodyImageCropper } from "@/components/app/BodyImageCropper"
import { uploadResearchImage, RESEARCH_PATH_ATTR } from "@/lib/researchImages"
import { Indent, canIndent, changeIndent } from "@/components/app/editorIndent"

const BodyImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: (element) => {
          const width = Number(element.getAttribute("width"))
          return Number.isFinite(width) && width > 0 ? width : null
        },
        // 크기 버튼·실행 취소로 바뀐 너비도 NodeView와 저장된 본문에 반영.
        renderHTML: ({ width }) => Number.isFinite(width) && width > 0
          ? { width, style: `width: ${width}px; height: auto;` }
          : {},
      },
      // 사진 정렬(왼쪽은 기본값이라 저장하지 않는다). 표시는 .richtext [data-align] (index.css).
      align: {
        default: null,
        parseHTML: (element) => {
          const align = element.getAttribute("data-align")
          return align === "center" || align === "right" ? align : null
        },
        renderHTML: ({ align }) => align === "center" || align === "right" ? { "data-align": align } : {},
      },
      // 연구회 비공개 사진의 위치(lib/researchImages). src 는 잠깐 쓰는 서명 주소라 저장할 때 지운다.
      researchPath: {
        default: null,
        parseHTML: (element) => element.getAttribute(RESEARCH_PATH_ATTR),
        renderHTML: ({ researchPath }) => researchPath ? { [RESEARCH_PATH_ATTR]: researchPath } : {},
      },
    }
  },
})

// 업로드/자르기 중 글을 수정해도 원래 위치를 따라간다.
function trackPosition(editor: Editor, initial: number) {
  let position = initial
  let deleted = false
  const map = ({ transaction }: { transaction: Transaction }) => {
    const result = transaction.mapping.mapResult(position)
    position = result.pos
    deleted ||= result.deleted
  }
  editor.on("transaction", map)
  return {
    get: () => deleted || editor.isDestroyed ? null : position,
    stop: () => { editor.off("transaction", map) },
  }
}

// 웹·문서에서 글과 함께 복사한 사진이 data: 주소로 들어오면 파일로 바꿔 버킷에 올린다.
function dataUrlToFile(src: string): File | null {
  const match = /^data:(image\/[\w.+-]+);base64,(.+)$/i.exec(src)
  if (!match) return null
  try {
    const binary = atob(match[2])
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    const type = match[1].toLowerCase()
    return new File([bytes], `pasted.${type.split("/")[1].replace("jpeg", "jpg")}`, { type })
  } catch {
    return null
  }
}

// 한글·워드 등에서 복사하면 사진이 내 컴퓨터 경로(file:///)로 와서 깨진다 — 붙이기 전에 빼고 개수를 센다.
// 연구회(비공개)는 외부 주소 사진도 뺀다. 공개 쪽은 연구회 사진을 뺀다(임시 주소라 곧 깨지고, 공개되면 안 된다).
function stripUnreachableImages(html: string, privateStore: boolean) {
  if (!/<img[\s>]/i.test(html)) return { html, dropped: 0 }
  const doc = new DOMParser().parseFromString(html, "text/html")
  let dropped = 0
  for (const img of Array.from(doc.images)) {
    const src = img.getAttribute("src") ?? ""
    const research = img.hasAttribute(RESEARCH_PATH_ATTR)
    if (/^data:image\//i.test(src) && !research) continue
    if (privateStore ? research : /^https:\/\//i.test(src) && !research) continue
    img.remove()
    dropped++
  }
  return { html: dropped ? doc.body.innerHTML : html, dropped }
}

const IMAGE_LIMIT_MESSAGE = "사진 한 장은 2MB 이하로 넣어 주세요. 움직이는 GIF는 줄이지 않고 그대로 올라가요."

/**
 * 블로그형 본문 에디터 (묶음 G-2b) — TipTap 미니멀 커스텀.
 * StarterKit(굵게·기울임·취소선·밑줄·제목·목록·인용·구분선·링크) + Image.
 * 서식은 구조+강조만. 저장 형식은 HTML(onChange). 표시는 RichTextViewer(정화).
 * 콘텐츠 스타일은 .richtext (index.css) — 전부 중립 토큰.
 * 본문 이미지는 app-thumbnails 공개 버킷 업로드(uploadThumbnail 재사용).
 * imageStore="research" 면 연구회 비공개 버킷(lib/researchImages) — 본문에는 위치만 남긴다.
 */
export function RichTextEditor({
  value = "",
  onChange,
  placeholder,
  disabled = false,
  allowImages = true,
  imageStore = "public",
  onBusyChange,
}: {
  value?: string
  onChange: (html: string) => void
  /** 비어 있을 때 회색 안내 글(입력하면 사라짐). 줄바꿈(\n) 가능 */
  placeholder?: string
  allowImages?: boolean
  /** research = 연구회 비공개 버킷(연구회원만 열람). 기본은 공개 버킷. */
  imageStore?: "public" | "research"
  disabled?: boolean
  onBusyChange?: (busy: boolean) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [imgBusy, setImgBusy] = useState(false)
  const [imgError, setImgError] = useState<string | null>(null)
  const uploading = useRef(false)
  const [cropSrc, setCropSrc] = useState<string | null>(null)
  const cropTarget = useRef<ReturnType<typeof trackPosition> | null>(null)
  const inlineUploads = useRef(new Set<string>())
  const [inlineBusy, setInlineBusy] = useState(0)
  const droppedOnPaste = useRef(0)
  useEffect(() => () => cropTarget.current?.stop(), [])
  useEffect(() => { onBusyChange?.(imgBusy || inlineBusy > 0 || cropSrc !== null) }, [imgBusy, inlineBusy, cropSrc, onBusyChange])

  // 붙여넣기·끌어놓기 뒤에 남은 사진 경고를 띄운다(사진 파일로 들어온 경우는 경고 없음).
  function reportDropped(viaFiles: boolean) {
    const dropped = droppedOnPaste.current
    droppedOnPaste.current = 0
    if (dropped && !viaFiles) setImgError(`복사한 내용 속 사진 ${dropped}장은 붙일 수 없었어요(내 컴퓨터 파일이거나 다른 곳 주소의 사진). 사진만 따로 복사해 붙이거나 이미지 버튼으로 올려 주세요.`)
  }

  async function upload(file: File): Promise<{ src: string; researchPath: string | null }> {
    if (imageStore === "research") return uploadResearchImage(file)
    return { src: await uploadThumbnail(file), researchPath: null }
  }

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false },
      }),
      Indent,
      // 본문 이미지는 화면 폭에 맞춰 표시(.richtext img max-width). 지연 로딩.
      // allowBase64: 붙여넣은 data: 사진을 일단 받아 두고 곧바로 버킷 주소로 바꾼다(uploadInlineImages).
      ...(allowImages ? [BodyImage.configure({
        allowBase64: true,
        HTMLAttributes: { loading: "lazy" },
        resize: { enabled: true, directions: ["bottom-left", "bottom-right"], minWidth: 40, minHeight: 40, alwaysPreserveAspectRatio: true },
      })] : []),
    ],
    content: value,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
      if (allowImages) uploadInlineImages(editor)
    },
    editorProps: {
      attributes: { class: "richtext min-h-60 px-3 py-2.5 outline-none" },
      transformPastedHTML: (html) => {
        if (!allowImages) return html
        const result = stripUnreachableImages(html, imageStore === "research")
        droppedOnPaste.current = result.dropped
        return result.html
      },
      handlePaste: (_view, event) => {
        const files = Array.from(event.clipboardData?.files ?? []).filter((file) => file.type.startsWith("image/"))
        reportDropped(files.length > 0)
        if (!files.length) return false
        if (!allowImages) { event.preventDefault(); return true }
        event.preventDefault()
        void insertImages(files)
        return true
      },
      handleDrop: (view, event, _slice, moved) => {
        if (moved) return false // 본문에 이미 있는 사진 이동은 편집기 기본 동작 유지.
        const files = Array.from(event.dataTransfer?.files ?? []).filter((file) => file.type.startsWith("image/"))
        reportDropped(files.length > 0)
        if (!files.length) return false
        if (!allowImages) { event.preventDefault(); return true }
        event.preventDefault()
        const position = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos
        void insertImages(files, position)
        return true
      },
    },
  })

  useEffect(() => { editor?.setEditable(!disabled) }, [editor, disabled])

  async function insertImages(files: File[], at?: number) {
    if (!allowImages || !files.length || !editor) return
    if (uploading.current) {
      setImgError("이미지를 올리고 있어요. 완료된 뒤 다시 넣어 주세요.")
      return
    }
    uploading.current = true
    const target = trackPosition(editor, at ?? editor.state.selection.from)
    setImgError(null)
    setImgBusy(true)
    try {
      for (const file of files) {
        if (!THUMBNAIL_MIME.includes(file.type)) throw new Error("PNG·JPG·WebP·GIF 사진만 넣을 수 있습니다.")
        if (file.size > 20 * 1024 * 1024) throw new Error("사진 한 장은 20MB 이하로 넣어 주세요.")
        const resized = await downscaleImage(file)
        if (resized.size > THUMBNAIL_MAX_BYTES) throw new Error(IMAGE_LIMIT_MESSAGE)
        const uploaded = await upload(resized)
        const position = target.get()
        if (position === null) break
        editor.commands.insertContentAt(position, { type: "image", attrs: { ...uploaded, alt: file.name } }, { updateSelection: false })
      }
    } catch (e) {
      setImgError(e instanceof Error ? e.message : "이미지를 넣지 못했습니다.")
    } finally {
      target.stop()
      uploading.current = false
      setImgBusy(false)
    }
  }

  // 본문에 data: 사진이 생기면 하나씩 올려 주소를 바꾼다. 실패한 사진은 본문에서 뺀다(긴 data: 주소가 저장되지 않게).
  function uploadInlineImages(editor: Editor) {
    const pending: string[] = []
    editor.state.doc.descendants((node) => {
      const src = node.type.name === "image" ? node.attrs.src : null
      if (typeof src === "string" && src.startsWith("data:") && !inlineUploads.current.has(src) && !pending.includes(src)) pending.push(src)
    })
    for (const src of pending) void uploadInlineImage(editor, src)
  }

  async function uploadInlineImage(editor: Editor, src: string) {
    inlineUploads.current.add(src)
    setInlineBusy((n) => n + 1)
    let uploaded: Awaited<ReturnType<typeof upload>> | null = null
    try {
      const file = dataUrlToFile(src)
      if (!file || !THUMBNAIL_MIME.includes(file.type)) throw new Error("PNG·JPG·WebP·GIF 사진만 넣을 수 있습니다.")
      const resized = await downscaleImage(file)
      if (resized.size > THUMBNAIL_MAX_BYTES) throw new Error(IMAGE_LIMIT_MESSAGE)
      uploaded = await upload(resized)
    } catch (e) {
      setImgError(e instanceof Error ? e.message : "이미지를 넣지 못했습니다.")
    } finally {
      if (!editor.isDestroyed) {
        const tr = editor.state.tr
        editor.state.doc.descendants((node, pos) => {
          if (node.type.name !== "image" || node.attrs.src !== src) return
          if (uploaded) tr.setNodeMarkup(tr.mapping.map(pos), undefined, { ...node.attrs, ...uploaded })
          else tr.delete(tr.mapping.map(pos), tr.mapping.map(pos + node.nodeSize))
        })
        if (tr.docChanged) editor.view.dispatch(tr)
      }
      inlineUploads.current.delete(src)
      setInlineBusy((n) => n - 1)
    }
  }

  function closeCrop() {
    cropTarget.current?.stop()
    cropTarget.current = null
    setCropSrc(null)
  }

  function openCrop() {
    if (!editor || !editor.isActive("image")) return
    cropTarget.current?.stop()
    cropTarget.current = trackPosition(editor, editor.state.selection.from)
    setCropSrc(editor.getAttributes("image").src as string)
  }

  async function applyCrop(file: File) {
    if (!editor || !cropSrc) return
    const uploaded = await upload(file)
    const position = cropTarget.current?.get()
    if (position == null) throw new Error("원래 사진이 삭제되었습니다. 자르기를 취소해 주세요.")
    const node = editor.state.doc.nodeAt(position)
    if (node?.type.name !== "image" || node.attrs.src !== cropSrc) throw new Error("사진이 변경되었습니다. 다시 선택해 주세요.")
    // 새 비율에 맞춰 높이를 자동 계산하고, 기존 표시 너비는 유지한다.
    editor.view.dispatch(editor.state.tr.setNodeMarkup(position, undefined, { ...node.attrs, ...uploaded, height: null }))
    closeCrop()
  }

  function setLink() {
    if (!editor) return
    const prev = editor.getAttributes("link").href as string | undefined
    const url = window.prompt("링크 URL", prev ?? "https://")
    if (url === null) return
    if (url.trim() === "") {
      editor.chain().focus().unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run()
  }

  if (!editor) return null

  return (
    <div className="rounded-md border border-input">
      <Toolbar
        editor={editor}
        onLink={setLink}
        onImage={() => fileRef.current?.click()}
        onCrop={openCrop}
        allowImages={allowImages}
      />
      {allowImages && <p className="border-b border-border px-3 py-2 text-xs text-muted-foreground">사진을 끌어놓거나 붙여넣을 수 있어요. 사진 모서리를 끌면 비율을 유지하며 크기가 바뀌고, 사진을 선택한 뒤 자르기도 할 수 있어요.{imageStore === "research" && " 이 게시판의 사진은 연구회원만 볼 수 있게 따로 보관돼요."}</p>}
      {!allowImages && <p className="border-b border-border px-3 py-2 text-xs text-muted-foreground">연구회게시판은 글과 링크로 이야기를 나눠 주세요. 사진 첨부는 지원하지 않습니다.</p>}
      <div className="relative">
        <EditorContent editor={editor} />
        {placeholder && editor.isEmpty && (
          <p
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 whitespace-pre-line px-3 py-2.5 text-base text-muted-foreground"
          >
            {placeholder}
          </p>
        )}
      </div>
      {(imgBusy || inlineBusy > 0 || imgError) && (
        <div className="border-t border-border px-3 py-1.5 text-xs">
          {(imgBusy || inlineBusy > 0) && (
            <span className="text-muted-foreground">이미지 올리는 중…</span>
          )}
          {imgError && <span role="alert" className="text-destructive">{imgError}</span>}
        </div>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => {
          void insertImages(Array.from(e.target.files ?? []))
          e.target.value = ""
        }}
      />
      {cropSrc && <BodyImageCropper src={cropSrc} onCancel={closeCrop} onDone={applyCrop} />}
    </div>
  )
}

function Toolbar({
  editor,
  onLink,
  onImage,
  onCrop,
  allowImages,
}: {
  editor: Editor
  onLink: () => void
  onImage: () => void
  onCrop: () => void
  allowImages: boolean
}) {
  // 선택 변화에 따라 활성 상태를 구독(툴바 하이라이트 갱신).
  const s = useEditorState({
    editor,
    selector: ({ editor }) => ({
      h2: editor.isActive("heading", { level: 2 }),
      h3: editor.isActive("heading", { level: 3 }),
      bold: editor.isActive("bold"),
      italic: editor.isActive("italic"),
      underline: editor.isActive("underline"),
      strike: editor.isActive("strike"),
      quote: editor.isActive("blockquote"),
      bullet: editor.isActive("bulletList"),
      ordered: editor.isActive("orderedList"),
      link: editor.isActive("link"),
      image: editor.isActive("image"),
      align: (editor.getAttributes("image").align as string | null) ?? "left",
      canIndent: canIndent(editor, 1),
      canOutdent: canIndent(editor, -1),
    }),
  })

  const chain = () => editor.chain().focus()

  return (
    // 긴 글을 쓰며 내려가도 도구가 헤더(h-16) 바로 아래에 붙어 따라온다.
    <div className="sticky top-16 z-10 flex flex-wrap items-center gap-0.5 rounded-t-md border-b border-border bg-background p-1">
      <Btn icon={Heading2} title="제목" active={s.h2} onClick={() => chain().toggleHeading({ level: 2 }).run()} />
      <Btn icon={Heading3} title="소제목" active={s.h3} onClick={() => chain().toggleHeading({ level: 3 }).run()} />
      <Sep />
      <Btn icon={Bold} title="굵게" active={s.bold} onClick={() => chain().toggleBold().run()} />
      <Btn icon={Italic} title="기울임" active={s.italic} onClick={() => chain().toggleItalic().run()} />
      <Btn icon={UnderlineIcon} title="밑줄" active={s.underline} onClick={() => chain().toggleUnderline().run()} />
      <Btn icon={Strikethrough} title="취소선" active={s.strike} onClick={() => chain().toggleStrike().run()} />
      <Sep />
      <Btn icon={Quote} title="인용" active={s.quote} onClick={() => chain().toggleBlockquote().run()} />
      <Btn icon={Minus} title="구분선" onClick={() => chain().setHorizontalRule().run()} />
      <Btn icon={List} title="목록" active={s.bullet} onClick={() => chain().toggleBulletList().run()} />
      <Btn icon={ListOrdered} title="번호 목록" active={s.ordered} onClick={() => chain().toggleOrderedList().run()} />
      <Btn icon={IndentDecrease} title="내어쓰기" disabled={!s.canOutdent} onClick={() => changeIndent(editor, -1)} />
      <Btn icon={IndentIncrease} title="들여쓰기" disabled={!s.canIndent} onClick={() => changeIndent(editor, 1)} />
      <Sep />
      <Btn icon={Link2} title="링크" active={s.link} onClick={onLink} />
      {allowImages && <Btn icon={ImagePlus} title="이미지" onClick={onImage} />}
      {s.image && <>
        <Sep />
        {[50, 75, 100].map((percent) => (
          <button key={percent} type="button" aria-label={`사진 너비 ${percent}%`}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => chain().updateAttributes("image", { width: Math.round(editor.view.dom.clientWidth * percent / 100), height: null }).run()}
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-accent hover:text-foreground">{percent}%</button>
        ))}
        <Btn icon={Crop} title="선택한 사진 자르기" onClick={onCrop} />
        <Sep />
        <Btn icon={AlignLeft} title="사진 왼쪽 정렬" active={s.align === "left"} onClick={() => chain().updateAttributes("image", { align: null }).run()} />
        <Btn icon={AlignCenter} title="사진 가운데 정렬" active={s.align === "center"} onClick={() => chain().updateAttributes("image", { align: "center" }).run()} />
        <Btn icon={AlignRight} title="사진 오른쪽 정렬" active={s.align === "right"} onClick={() => chain().updateAttributes("image", { align: "right" }).run()} />
      </>}
    </div>
  )
}

function Btn({
  icon: Icon,
  title,
  active,
  disabled,
  onClick,
}: {
  icon: LucideIcon
  title: string
  active?: boolean
  disabled?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      disabled={disabled}
      // 클릭 시 에디터 선택이 풀리지 않도록 mousedown 기본동작 차단.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded transition-colors disabled:pointer-events-none disabled:opacity-35",
        active
          ? "bg-accent text-accent-foreground"
          : "text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      <Icon className="size-4" aria-hidden />
    </button>
  )
}

function Sep() {
  return <span aria-hidden className="mx-0.5 h-5 w-px bg-border" />
}
