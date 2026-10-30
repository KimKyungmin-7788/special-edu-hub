import { Extension, type Editor } from "@tiptap/react"
import type { EditorState } from "@tiptap/pm/state"

/**
 * 본문 들여쓰기 — 도구 막대 '들여쓰기·내어쓰기' 버튼과 목록의 Tab/Shift+Tab.
 *  - 목록 항목: 한 단계 아래 목록으로 넣고 뺀다(sink/liftListItem). 첫 항목처럼 넣을 곳이 없으면 목록 전체를 들여쓴다.
 *  - 인용: 인용 상자 전체, 문단·제목: 그 줄을 들여쓴다.
 * 단계는 data-indent(1~4)로 저장하고 표시는 .richtext [data-indent] (index.css).
 * 문단·인용의 Tab 은 그대로 둔다(키보드만 쓰는 사람이 편집기 밖으로 나갈 수 있게) — 버튼으로만 들여쓴다.
 */
export const MAX_INDENT = 4
const INDENT_TYPES = ["paragraph", "heading", "blockquote", "bulletList", "orderedList"]
const LIST_TYPES = ["bulletList", "orderedList"]

type Target =
  | { kind: "item"; nested: boolean; listPos: number; listIndent: number }
  | { kind: "block"; pos: number; indent: number }

// 커서가 있는 곳에서 들여쓸 대상을 찾는다. 가장 안쪽의 목록 항목·인용이 먼저다.
function findTarget(state: EditorState): Target | null {
  const { $from } = state.selection
  for (let d = $from.depth; d > 0; d--) {
    const node = $from.node(d)
    if (node.type.name === "listItem") {
      // 가장 바깥 목록의 위치(목록 전체 들여쓰기용)와 중첩 여부.
      let outer = d - 1
      let nested = false
      for (let up = d - 1; up > 0; up--) {
        const name = $from.node(up).type.name
        if (name === "listItem") nested = true
        if (LIST_TYPES.includes(name)) outer = up
      }
      return { kind: "item", nested, listPos: $from.before(outer), listIndent: $from.node(outer).attrs.indent ?? 0 }
    }
    if (node.type.name === "blockquote") return { kind: "block", pos: $from.before(d), indent: node.attrs.indent ?? 0 }
  }
  const parent = $from.parent
  if ($from.depth > 0 && INDENT_TYPES.includes(parent.type.name)) return { kind: "block", pos: $from.before(), indent: parent.attrs.indent ?? 0 }
  return null
}

function setIndent(editor: Editor, pos: number, indent: number) {
  return editor.chain().focus().command(({ tr }) => {
    const node = tr.doc.nodeAt(pos)
    if (!node) return false
    tr.setNodeMarkup(pos, undefined, { ...node.attrs, indent })
    return true
  }).run()
}

export function canIndent(editor: Editor, step: 1 | -1): boolean {
  const target = findTarget(editor.state)
  if (!target) return false
  if (target.kind === "block") return step > 0 ? target.indent < MAX_INDENT : target.indent > 0
  // 목록 전체 들여쓰기는 바깥 목록 항목에서만(안쪽 항목이 더 못 들어갈 때 목록 전체가 움직이면 헷갈린다).
  if (step > 0) return editor.can().sinkListItem("listItem") || (!target.nested && target.listIndent < MAX_INDENT)
  return target.nested || target.listIndent > 0
}

export function changeIndent(editor: Editor, step: 1 | -1): boolean {
  const target = findTarget(editor.state)
  if (!target || !canIndent(editor, step)) return false
  if (target.kind === "block") return setIndent(editor, target.pos, target.indent + step)
  if (step > 0) {
    if (editor.can().sinkListItem("listItem")) return editor.chain().focus().sinkListItem("listItem").run()
    return setIndent(editor, target.listPos, target.listIndent + 1)
  }
  if (target.nested) return editor.chain().focus().liftListItem("listItem").run()
  return setIndent(editor, target.listPos, target.listIndent - 1)
}

export const Indent = Extension.create({
  name: "indent",
  // 목록 기본 Tab 처리(넣을 곳이 없으면 편집기 밖으로 나감)보다 먼저 받는다.
  priority: 200,

  addGlobalAttributes() {
    return [{
      types: INDENT_TYPES,
      attributes: {
        indent: {
          default: 0,
          parseHTML: (element) => {
            const level = Number(element.getAttribute("data-indent"))
            return Number.isInteger(level) && level > 0 ? Math.min(level, MAX_INDENT) : 0
          },
          renderHTML: ({ indent }) => indent > 0 ? { "data-indent": indent } : {},
        },
      },
    }]
  },

  addKeyboardShortcuts() {
    // 목록 안에서는 Tab 을 항상 편집기가 받는다(더 들여쓸 수 없어도 커서가 밖으로 나가지 않게).
    const inList = () => findTarget(this.editor.state)?.kind === "item"
    return {
      Tab: () => inList() ? (changeIndent(this.editor, 1), true) : false,
      "Shift-Tab": () => inList() ? (changeIndent(this.editor, -1), true) : false,
    }
  },
})
