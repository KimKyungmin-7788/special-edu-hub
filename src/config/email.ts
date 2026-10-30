import { site } from "./site.js"

/**
 * 안내 메일 문구 (47_email_notifications.sql · api/send-email.ts).
 * 다섯 메일의 전체 문구·설정 방법은 docs/안내메일.md 에 정리돼 있다(문구를 바꾸면 함께 고친다).
 * 언제 보낼지는 DB 트리거가, 무엇을 쓸지는 이 파일이 정한다. 문구는 여기서만 고친다.
 * 공식 도메인 개설 전까지 운영자 개인 지메일로 보내고 답장을 받는다(devNote).
 */

export type EmailKind =
  | "welcome"
  | "verify_received"
  | "verify_approved"
  | "verify_rejected"
  | "staff_new_request"

export type EmailInput = {
  nickname: string
  data: Record<string, string>
  /** 보내는 지메일 주소(서버 환경변수 GMAIL_USER). */
  replyTo: string
}

export type EmailContent = { subject: string; text: string }

/** 누리집이 지향하는 것 — 환영 메일에 그대로 들어간다. */
const mission = [
  "이 누리집은 특수교육에서 AI를 어떻게 활용해야 할지 함께 고민하고,",
  "그 고민을 실제 수업으로 실천하는 선생님들의 공간입니다.",
  "선생님들이 만든 교육 웹앱과 수업 이야기를 나누며, 서로에게 자유롭게 배우고 함께 성장하기를 바랍니다.",
  "앞으로 연수방도 열어 배운 것을 더 가까이에서 나누려고 합니다.",
]

const link = (path: string) => `${site.url}${path}`
const hello = (nickname: string) => `안녕하세요, ${nickname.trim() || "회원"} 님.`

/** 모든 회원 메일 끝에 붙는 안내 — 개발 단계·개인 메일로 소통하는 이유. */
function devNote(replyTo: string): string {
  return [
    "────────",
    `${site.name}은 아직 개발 단계입니다.`,
    `공식 도메인을 열기 전까지는 운영자 개인 메일(${replyTo})로 안내드리고 소통하려고 합니다.`,
    "궁금한 점이나 바라는 점이 있으면 이 메일에 바로 답장해 주세요. 운영자가 직접 읽고 답드립니다.",
    "",
    `${site.org.name}`,
    site.url,
  ].join("\n")
}

const templates: Record<EmailKind, (i: EmailInput) => EmailContent> = {
  welcome: (i) => ({
    subject: `[${site.name}] 가입을 환영합니다`,
    text: [
      hello(i.nickname),
      "",
      `${site.name}에 가입해 주셔서 고맙습니다.`,
      "",
      ...mission,
      "",
      "먼저 교육 웹앱과 수업실천사례를 둘러보고, 좋아요·담기·댓글로 함께해 주세요.",
      `자료 둘러보기: ${link("/apps/subject")}`,
      "",
      "선생님이시라면 교사인증을 받아 보세요. 인증을 받으면 직접 만든 자료를 등록하고 수업 사례를 쓸 수 있습니다.",
      `교사인증 하기: ${link("/verify")}`,
      "",
      devNote(i.replyTo),
    ].join("\n"),
  }),

  verify_received: (i) => ({
    subject: `[${site.name}] 교사인증 신청이 접수되었습니다`,
    text: [
      hello(i.nickname),
      "",
      "교사인증 신청이 잘 접수되었습니다.",
      "",
      "아직 서류를 보내지 않으셨다면 이 메일에 답장으로 첨부해 주세요.",
      "· 개인정보를 가린 재직증명서, 또는 본인 이름이 보이는 나이스 화면 캡처",
      "",
      "운영자가 확인한 뒤 결과를 메일과 누리집 알림으로 알려 드립니다.",
      `진행 상황 보기: ${link("/verify")}`,
      "",
      devNote(i.replyTo),
    ].join("\n"),
  }),

  verify_approved: (i) => ({
    subject: `[${site.name}] 교사인증이 완료되었습니다`,
    text: [
      hello(i.nickname),
      "",
      "교사인증이 완료되었습니다. 함께해 주셔서 고맙습니다.",
      "이제 직접 만든 교육 웹앱을 등록하고, 수업실천사례를 쓸 수 있습니다.",
      "AI를 수업에 들여온 선생님의 시도와 고민이 다른 선생님에게는 좋은 배움이 됩니다.",
      "작은 경험이라도 편하게 나눠 주세요. 연수방이 열리면 누리집에서 먼저 알려 드리겠습니다.",
      "",
      `자료 둘러보기: ${link("/apps/subject")}`,
      `수업 사례 쓰기: ${link("/practices/write")}`,
      "",
      devNote(i.replyTo),
    ].join("\n"),
  }),

  verify_rejected: (i) => ({
    subject: `[${site.name}] 교사인증 결과 안내`,
    text: [
      hello(i.nickname),
      "",
      "보내 주신 교사인증 신청을 이번에는 승인하지 못했습니다.",
      ...(i.data.reason?.trim() ? ["", `사유: ${i.data.reason.trim()}`] : []),
      "",
      "내용을 보완해 다시 신청하실 수 있습니다. 서류는 이 메일에 답장으로 보내 주셔도 됩니다.",
      `다시 신청하기: ${link("/verify")}`,
      "",
      devNote(i.replyTo),
    ].join("\n"),
  }),

  staff_new_request: (i) => ({
    subject: `[${site.name} 운영] 새 교사인증 신청 — ${i.data.applicantName || i.nickname}`,
    text: [
      "새 교사인증 신청이 들어왔습니다.",
      "",
      `닉네임: ${i.nickname}`,
      `성함: ${i.data.applicantName ?? ""}`,
      `소속 학교: ${i.data.school ?? ""}`,
      `가입 이메일: ${i.data.email ?? ""}`,
      "",
      `심사하기: ${link("/admin")}`,
    ].join("\n"),
  }),
}

export const emailKinds = Object.keys(templates) as EmailKind[]

export function buildEmail(kind: EmailKind, input: EmailInput): EmailContent {
  return templates[kind](input)
}
