/**
 * 하이터치 사례 목록 — 지도안 '학생 특성·개별화 지원'의 하이터치 칸에서 골라 담는다.
 * 하이터치 = 기술(하이테크)이 대신할 수 없는, 교사가 학생과 직접 주고받는 관계·정서·상호작용.
 * 각 묶음은 아래 근거 자료에 바탕을 둔다. 항목 문장은 교실에서 바로 쓸 수 있게 풀어 썼다.
 */

export type HighTouchSource = { name: string; url: string }

export const highTouchSources = {
  moe: {
    name: "교육부, 디지털 기반 교육혁신 방안(2023) — 하이터치 하이테크",
    url: "https://educator.edunet.net/sub/sub1/digital_down_001.pdf",
  },
  hlp: {
    name: "CEC·CEEDAR, 특수교육 고효과 교수 실제(HLP, 2017) — 7 긍정적 학습 환경, 8·22 피드백",
    url: "https://exceptionalchildren.org/sites/default/files/2021-11/HLP%20CEC%20K12%20Standards%20Crosswalk.pdf",
  },
  bsp: {
    name: "IRIS Center(밴더빌트대), 행동을 짚는 구체적 칭찬",
    url: "https://iris.peabody.vanderbilt.edu/module/ecbm/cresource/q2/p06/",
  },
  ncaep: {
    name: "NCAEP, 자폐성장애 학생 근거기반 실제 28가지(2020)",
    url: "https://ncaep.fpg.unc.edu/wp-content/uploads/EBP-Report-2020.pdf",
  },
  hand: {
    name: "미국 농맹교육센터(NCDB), 손 아래 손 안내",
    url: "https://www.nationaldb.org/media/doc/HandUnderHandTechnique_a.pdf",
  },
} satisfies Record<string, HighTouchSource>

export type HighTouchSourceKey = keyof typeof highTouchSources

export type HighTouchItem = { id: string; text: string }
export type HighTouchGroup = {
  id: string
  title: string
  sources: HighTouchSourceKey[]
  note?: string
  items: HighTouchItem[]
}

export const highTouchGroups: HighTouchGroup[] = [
  {
    id: "relation",
    title: "관계·환영",
    sources: ["hlp", "moe"],
    items: [
      { id: "relation-1", text: "교실에 들어올 때 이름을 불러 반갑게 맞이하기" },
      { id: "relation-2", text: "학생 눈높이에 맞춰 앉거나 무릎을 굽혀 말하기" },
      { id: "relation-3", text: "학생이 고른 인사 방식(하이파이브·주먹 인사·손 흔들기)으로 인사하기" },
      { id: "relation-4", text: "수업 전 1분, 좋아하는 것(캐릭터·노래·간식)으로 짧게 이야기 나누기" },
      { id: "relation-5", text: "어제 있었던 일이나 지난 수업에서 잘한 점을 기억해 먼저 말 걸기" },
      { id: "relation-6", text: "활동이 끝나면 \"함께해서 즐거웠어\"처럼 관계를 마무리하는 말 건네기" },
      { id: "relation-7", text: "학생이 스스로 시작한 말·몸짓에 바로 웃으며 반응하기" },
    ],
  },
  {
    id: "praise",
    title: "칭찬·피드백",
    sources: ["bsp", "hlp", "ncaep"],
    note: "칭찬과 바로잡는 말의 비율 4:1 은 널리 권하는 기준이지만, 근거가 탄탄한 것은 '무엇을 잘했는지 짚는 칭찬'이에요.",
    items: [
      { id: "praise-1", text: "무엇을 잘했는지 짚어 칭찬하기(\"오늘 칸을 스스로 찾았네!\")" },
      { id: "praise-2", text: "결과보다 끝까지 해 본 노력과 과정을 칭찬하기" },
      { id: "praise-3", text: "잘한 직후 바로 칭찬하기(시간이 지나면 연결이 약해짐)" },
      { id: "praise-4", text: "학생이 좋아하는 방식(엄지척·박수·좋아하는 소리·스티커)으로 칭찬하기" },
      { id: "praise-5", text: "다른 친구와 비교하지 않고 그 학생의 어제와 비교해 칭찬하기" },
      { id: "praise-6", text: "틀렸을 때 \"다시 해 보자\"로 이어 주고, 다시 하면 바로 칭찬하기" },
      { id: "praise-7", text: "바로잡는 말보다 칭찬을 훨씬 자주 하도록 의식하기" },
      { id: "praise-8", text: "조금이라도 다가간 시도(첫 글자·가리키기)도 놓치지 않고 알아주기" },
    ],
  },
  {
    id: "prompt",
    title: "기다림·도움 주기",
    sources: ["ncaep", "hand"],
    note: "신체 도움은 학생이 편안해할 때, 학교 지침과 보호자 협의 안에서만 해요.",
    items: [
      { id: "prompt-1", text: "질문한 뒤 3~5초 기다리며 스스로 답할 기회 주기" },
      { id: "prompt-2", text: "도움은 가장 약한 것부터(몸짓 → 말 → 시범 → 신체 도움) 차례로 주기" },
      { id: "prompt-3", text: "익숙해지면 도움을 주기 전 기다리는 시간을 조금씩 늘리기(시간 지연)" },
      { id: "prompt-4", text: "먼저 시범을 보이고 \"이제 같이 해 볼까?\" 하며 함께 해 보기" },
      { id: "prompt-5", text: "손을 잡아 끌기보다 교사 손을 학생 손 아래에 두고 안내하기(손 아래 손)" },
      { id: "prompt-6", text: "성공하면 다음 번엔 도움을 한 단계 줄이기" },
      { id: "prompt-7", text: "어려워하면 과제를 더 작은 단계로 나눠 한 단계씩 함께하기" },
      { id: "prompt-8", text: "틀릴 것 같을 때 미리 도와 실패보다 성공 경험을 먼저 쌓게 하기" },
    ],
  },
  {
    id: "communication",
    title: "의사소통 지원",
    sources: ["ncaep"],
    items: [
      { id: "communication-1", text: "학생의 의사소통판(AAC)을 교사가 먼저 짚으며 말하기(모델링)" },
      { id: "communication-2", text: "\"이거? 저거?\"처럼 선택지 두 개를 보여 주고 고르게 하기" },
      { id: "communication-3", text: "말이 아니어도 몸짓·소리·눈짓을 대답으로 받아 주기" },
      { id: "communication-4", text: "짧고 분명한 말로 한 번에 하나씩 안내하기" },
      { id: "communication-5", text: "학생이 한 말을 조금 늘려 되돌려 주기(\"사과\" → \"빨간 사과 먹고 싶어?\")" },
      { id: "communication-6", text: "\"도와주세요\"·\"쉬고 싶어요\"를 말·카드로 표현하면 바로 들어주기" },
      { id: "communication-7", text: "원하는 물건을 살짝 멀리 두어 요청할 기회 만들기" },
    ],
  },
  {
    id: "choice",
    title: "선택과 스스로 하기",
    sources: ["ncaep", "hlp"],
    items: [
      { id: "choice-1", text: "활동 순서를 학생이 고르게 하기(\"앱 먼저? 카드 먼저?\")" },
      { id: "choice-2", text: "쓸 도구·색·자리를 학생이 고르게 하기" },
      { id: "choice-3", text: "'쉬는 시간' 카드를 주고 필요할 때 스스로 요청하게 하기" },
      { id: "choice-4", text: "그림 확인표로 한 일을 스스로 체크하게 하기" },
      { id: "choice-5", text: "오늘의 작은 목표를 학생과 함께 정하고 끝나면 함께 확인하기" },
      { id: "choice-6", text: "다 한 뒤 \"어땠어?\" 물어 기분 카드로 스스로 돌아보게 하기" },
    ],
  },
  {
    id: "predict",
    title: "미리 알려 주기·전환",
    sources: ["ncaep", "hlp"],
    items: [
      { id: "predict-1", text: "시각 일과표로 오늘 할 활동 순서를 미리 함께 보기" },
      { id: "predict-2", text: "활동이 끝나기 전에 타이머나 \"두 번만 더\"로 미리 알려 주기" },
      { id: "predict-3", text: "앱을 끄기 전 같은 신호(노래·손뼉)로 전환 알리기" },
      { id: "predict-4", text: "어려운 과제 전에 쉽고 좋아하는 과제를 2~3번 먼저 하기(행동 모멘텀)" },
      { id: "predict-5", text: "바뀌는 일정이 있으면 그림이나 사진으로 먼저 보여 주고 이유를 말해 주기" },
      { id: "predict-6", text: "\"먼저 ○○, 그다음 ○○\" 카드로 다음에 좋은 일이 있음을 보여 주기" },
    ],
  },
  {
    id: "emotion",
    title: "정서·조절 돕기",
    sources: ["hlp", "ncaep"],
    items: [
      { id: "emotion-1", text: "수업 시작에 감정 카드로 오늘 기분을 묻고 공감해 주기" },
      { id: "emotion-2", text: "힘들어 보이면 꾸짖기보다 낮고 차분한 목소리로 다가가기" },
      { id: "emotion-3", text: "필요할 때 갈 수 있는 쉼 공간을 미리 알려 주고 다녀오면 반갑게 맞기" },
      { id: "emotion-4", text: "오래 앉아 있었으면 짧은 몸 움직이기 휴식 넣기" },
      { id: "emotion-5", text: "속상해할 때 \"속상했구나\"처럼 마음을 먼저 말로 짚어 주기" },
      { id: "emotion-6", text: "진정한 뒤 다시 참여하면 지난 일을 따지지 않고 바로 환영하기" },
      { id: "emotion-7", text: "소리·빛에 예민한 학생은 자리·소리 크기를 미리 조절해 주기" },
    ],
  },
  {
    id: "digital",
    title: "디지털 활동과 이어 주기",
    sources: ["moe"],
    items: [
      { id: "digital-1", text: "앱에서 한 결과를 실물(달력·카드·물건)로 함께 확인하기" },
      { id: "digital-2", text: "화면 속 성공을 교사와 함께 소리 내어 축하하기" },
      { id: "digital-3", text: "화면 내용을 학생 생활 장면과 이어 묻기(\"우리 집에도 있어?\")" },
      { id: "digital-4", text: "혼자 조작할 때는 옆에서 지켜보다 막힐 때만 다가가기" },
      { id: "digital-5", text: "앱 활동 뒤에는 화면을 끄고 얼굴을 마주 보며 정리 이야기 나누기" },
      { id: "digital-6", text: "앱이 주는 칭찬 소리 뒤에 교사가 이름을 불러 한 번 더 칭찬하기" },
    ],
  },
  {
    id: "peer",
    title: "친구와 함께",
    sources: ["ncaep"],
    items: [
      { id: "peer-1", text: "또래 짝과 번갈아 하며 차례 지키기 경험하기" },
      { id: "peer-2", text: "친구가 잘한 점을 서로 말해 주는 시간 만들기" },
      { id: "peer-3", text: "학생에게 '도우미' 역할을 맡겨 도움을 주는 경험도 하게 하기" },
      { id: "peer-4", text: "함께 성공하면 모둠이 같이 축하하는 신호 정하기" },
    ],
  },
]
