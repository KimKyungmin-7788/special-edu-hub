import { useRef } from "react"
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
  type LucideIcon,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { uploadThumbnail } from "@/lib/apps"

/**
 * 블로그형 본문 에디터 (묶음 G-2b) — TipTap 미니멀 커스텀.
 * StarterKit(굵게·기울임·취소선·밑줄·제목·목록·인용·구분선·링크) + Image.
 * 서식은 구조+강조만. 저장 형식은 HTML(onChange). 표시는 RichTextViewer(정화).
 * 콘텐츠 스타일은 .richtext (index.css) — 전부 중립 토큰.
 * 본문 이미지는 app-thumbnails 공개 버킷 업로드(uploadThumbnail 재사용).
 */
export function RichTextEditor({
  value = "",
  onChange,
}: {
  value?: string
  onChange: (html: string) => void
}) {
  const fileRef = useRef<HTMLInputElement>(null)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false },
      }),
      Image,
    ],
    content: value,
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
    editorProps: {
      attributes: { class: "richtext min-h-60 px-3 py-2.5 outline-none" },
    },
  })

  async function pickImage(file?: File | null) {
    if (!file || !editor) return
    try {
      const url = await uploadThumbnail(file)
      editor.chain().focus().setImage({ src: url }).run()
    } catch (e) {
      console.error("[editor] 본문 이미지 업로드 실패:", e)
    }
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
      />
      <EditorContent editor={editor} />
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          pickImage(e.target.files?.[0])
          e.target.value = ""
        }}
      />
    </div>
  )
}

function Toolbar({
  editor,
  onLink,
  onImage,
}: {
  editor: Editor
  onLink: () => void
  onImage: () => void
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
    }),
  })

  const chain = () => editor.chain().focus()

  return (
    <div className="flex flex-wrap items-center gap-0.5 border-b border-border p-1">
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
      <Sep />
      <Btn icon={Link2} title="링크" active={s.link} onClick={onLink} />
      <Btn icon={ImagePlus} title="이미지" onClick={onImage} />
    </div>
  )
}

function Btn({
  icon: Icon,
  title,
  active,
  onClick,
}: {
  icon: LucideIcon
  title: string
  active?: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      title={title}
      aria-label={title}
      aria-pressed={active}
      // 클릭 시 에디터 선택이 풀리지 않도록 mousedown 기본동작 차단.
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded transition-colors",
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
