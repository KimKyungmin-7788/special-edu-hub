import type { Copyright, DataItem, StudentData, TargetAge } from "@/lib/safety"

/**
 * 안전 확인 정보(자료 등록·상세)의 화면 문구. 입력란과 상세 카드가 함께 쓴다.
 * 보호자 동의 안내의 출처·확인일은 PRD 14.1.1.
 */
export const safetyText = {
  title: "안전 확인 정보",
  intro: "여기 입력된 것은 선생님의 앱을 사용하는 동료 교사를 위한 정보로 사용됩니다.",
  confirmedBy: "등록 교사 확인",
  studentData: {
    label: "학생 정보 저장",
    options: { none: "저장하지 않음", device: "기기에만 저장", server: "서버에 저장" } satisfies Record<StudentData, string>,
  },
  dataItems: {
    label: "저장하는 항목",
    options: {
      non_identifying: { name: "개인비식별정보", example: "학교, 별명" },
      identifying: { name: "개인식별가능정보", example: "이름, 학년, 반 등" },
      other: { name: "직접 입력", example: "" },
    } satisfies Record<DataItem, { name: string; example: string }>,
  },
  studentAi: {
    label: "이 앱에서 학생이 AI 사용",
    shortLabel: "학생의 AI 사용",
    yes: "사용함",
    no: "사용하지 않음",
    serviceLabel: "AI 서비스 이름",
  },
  targetAge: {
    label: "대상 연령",
    options: { all: "전 연령", over14: "만 14세 이상 학생 사용" } satisfies Record<TargetAge, string>,
  },
  copyright: {
    label: "저작권",
    options: { own: "모두 직접 만듦", includes_others: "다른 사람의 자료 포함" } satisfies Record<Copyright, string>,
  },
  guardianNotice: "개인정보 보호법 제22조의2에 의거해 만 14세 미만 학생은 보호자 동의가 필요합니다.",
}

export const DATA_ITEM_ORDER: DataItem[] = ["non_identifying", "identifying", "other"]

/** 검증 마크와 게시 상태 문구(68). 마크는 '확인한 범위'를 말할 뿐 안전을 보증하지 않는다. */
export const verifyText = {
  marks: {
    verified: { label: "자동 점검 확인", detail: "누리집이 앱 주소의 파일을 받아 읽어 본 결과, 확인이 필요한 항목이 없었습니다." },
    reviewing: { label: "검토 중", detail: "자동 점검에서 확인이 필요한 항목이 나와 운영진이 확인하고 있습니다." },
    reverify: { label: "재검증 필요", detail: "마지막 점검 뒤 확인이 필요한 항목이 나와 다시 확인하고 있습니다." },
    unverified: { label: "점검 미확인", detail: "누리집이 이 자료의 파일을 받아 볼 수 없었거나 아직 점검하지 않았습니다." },
  },
  minimalNotice: "누리집은 자체 검증 시스템으로 확인할 수 있는 범위 안에서 최소한으로 점검합니다.",
  review: {
    pending: { label: "점검 대기", notice: "자동 점검을 기다리고 있어 아직 공개되지 않았습니다." },
    held: { label: "보류", notice: "운영진 확인 중이라 아직 공개되지 않았습니다." },
    changes_requested: { label: "보완 요청", notice: "운영진이 보완을 요청해 아직 공개되지 않았습니다." },
    approved: { label: "공개", notice: "" },
    suspended: { label: "게시 중단", notice: "운영진이 게시를 중단한 자료입니다." },
  },
  recheck: "다시 점검",
  rechecking: "점검 중…",
}
