export type Tool = "claude" | "codex";

export const TOOL_NAME: Record<Tool, string> = {
  claude: "Claude Code",
  codex: "Codex",
};

export interface StepLink {
  label: string;
  /** 새 탭으로 여는 주소. dialog가 있으면 없어도 돼요 */
  href?: string;
  note?: string;
  /** 정하면 [열기]를 눌렀을 때 새 탭 대신 이 안내 창이 떠요 */
  dialog?: StepDialog;
}

/** [열기]로 띄우는 안내 창 */
export interface StepDialog {
  title: string;
  steps: string[];
  command?: StepCommand;
  /** 창 아래에 붙는 참고 링크(새 탭) */
  more?: { label: string; href: string };
}

export interface StepCheck {
  id: string;
  label: string;
  /** Claude Code·Codex에 그대로 붙여 넣을 문장. 있으면 항목 옆에 [문장 복사]가 생겨요 */
  ask?: string;
}

export interface StepHelp {
  /** 막힌 상황 (칩에 보이는 짧은 문장) */
  situation: string;
  /** Claude Code·Codex에 붙여 넣을 프롬프트 */
  prompt: string;
}

/** 왼쪽 칸에 넣는 안내 그림. 좌표는 원본 이미지 픽셀 기준 */
export interface StepGuide {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** 주황 점선을 두를 곳. 그림에 이미 표시가 있으면 비워 둬요 */
  highlight?: { x: number; y: number; w: number; h: number };
  label?: string;
  /** 누르지 않아도 되는 곳을 흐리게 덮고 안내 문구를 얹어요 */
  dim?: { x: number; y: number; w: number; h: number; text: string };
  /** 그림 위에 붙는 짧은 설명 (예: "① [+] → 커넥터") */
  caption?: string;
  /** 작은 그림에서 점선·이름표 크기를 줄여요. 기본 1 */
  markScale?: number;
  /** 이름표 자리를 직접 정해요. 비우면 아래 → 오른쪽 → 위 순서로 자동 */
  labelSide?: "below" | "right" | "above";
}

export interface StepFlowItem {
  text: string;
  note?: string;
  /** 복사해서 보낼 문장 */
  copy?: string;
  /** 새 탭으로 여는 링크 */
  link?: { label: string; href: string };
}

/** 복사해서 붙여 넣는 명령어 한 줄 */
export interface StepCommand {
  label: string;
  code: string;
}

export interface StepBody {
  /** 화면 왼쪽 설명. 2~3문장 */
  lead: string[];
  /** 여러 장이면 왼쪽부터 순서대로 나란히 보여요 */
  guide?: StepGuide | StepGuide[];
  /** 번호를 붙여 차례대로 보여 주는 할 일. 링크·그림 대신 써요 */
  flow?: StepFlowItem[];
  /** 왼쪽 칸 맨 아래 "앞으로는 이렇게 말해요" 상자 */
  tip?: { title: string; phrase: string };
  links: StepLink[];
  checks: StepCheck[];
  help: StepHelp[];
}

export interface Step {
  id: string;
  /** 진행 막대에 보이는 짧은 이름 */
  short: string;
  title: string;
  /** 단계 제목 옆 브랜드 로고(public/logos). "tool"이면 고른 도구 로고. 없으면 단계 표시만 */
  logo?: string;
  /** 도구와 상관없이 같은 내용 */
  body?: StepBody;
  /** 클코·코덱스에 따라 내용이 갈라지는 단계 */
  byTool?: Partial<Record<Tool, StepBody>>;
}

/** 시작 전에 미리 가입해 두면 좋은 곳. 가입 순서대로예요. */
export interface Signup {
  name: string;
  /** "Google로 가입"처럼 "~로 가입" 형태로 써요 */
  via: string;
  /** public/logos 파일 이름 */
  logos: string[];
  /** label이 "가입"이면 화면에 "가입하기"로 보여요 */
  links: { label: string; href: string }[];
}

export const SIGNUPS: Signup[] = [
  {
    name: "Claude 또는 ChatGPT",
    via: "Google로 가입",
    logos: ["claude", "chatgpt"],
    // 데스크톱 앱을 받으면서 Google 계정으로 가입해요. ChatGPT 앱에 Codex가 들어 있어요.
    links: [
      { label: "Claude 앱 받기", href: "https://claude.com/download" },
      { label: "ChatGPT 앱 받기", href: "https://chatgpt.com/ko-KR/codex/" },
    ],
  },
  { name: "깃허브", via: "Google로 가입", logos: ["github"], links: [{ label: "가입", href: "https://github.com/signup" }] },
  {
    name: "슈파베이스",
    via: "깃허브로 가입",
    logos: ["supabase"],
    links: [{ label: "가입", href: "https://supabase.com/dashboard/sign-up" }],
  },
  { name: "버셀", via: "깃허브로 가입", logos: ["vercel"], links: [{ label: "가입", href: "https://vercel.com/signup" }] },
];

/** 어느 단계에서든 막혔을 때 쓰는 프롬프트. 표지와 단계마다 복사 버튼으로 보여요. */
export const RESCUE = {
  title: "문제해결 만능 프롬프트",
  /** [ ] 안은 선생님이 바꿔 넣는 자리 */
  prompt:
    "[발생한 문제 붙여넣기] 하다가 막혔는데, 원인을 쉬운 말로 설명하고, 명령은 네가 직접 실행하고 다 해 줘. 내가 해야 할 일은 한 번에 하나씩 쉬운 말로 알려 줘.",
  tip: "오류 화면은 Win + Shift + S로 캡처해서 함께 붙여 넣어요. 비밀번호·API 키는 붙여 넣지 않아요.",
};

/** 들어가며: 왜 바이브코딩인가? (표지와 도구 고르기 사이, 도구를 고르지 않아도 볼 수 있어요) */
export interface WhyPoint {
  /** 화면 아이콘 이름 (WhyView에서 고름) */
  icon: "fix" | "idea" | "folder" | "history" | "cloud" | "robot" | "heart" | "target" | "share" | "shield" | "chat";
  title: string;
  desc?: string;
}

export type WhySlide =
  | {
      kind: "reasons";
      id: string;
      short: string;
      title: string;
      lead: string;
      /** 바이브코딩이라는 말의 뜻과 유래 */
      define: { term: string; text: string; origin: string };
      points: WhyPoint[];
    }
  | {
      kind: "compare";
      id: string;
      short: string;
      title: string;
      lead: string;
      before: { label: string; tools: string; points: WhyPoint[] };
      after: { label: string; tools: string; points: WhyPoint[] };
      closing: string;
    }
  | {
      kind: "teacher";
      id: string;
      short: string;
      title: string;
      lead: string;
      points: WhyPoint[];
      closing: { label: string; text: string };
    };

export const WHY_TITLE = "왜 바이브코딩인가?";

export const WHY: WhySlide[] = [
  {
    kind: "reasons",
    id: "why",
    short: "교사가 만드는 이유",
    title: "교사의 아이디어에 기술이 더해지면, 가능성은 무한해져요",
    lead: "코딩을 몰라도 AI와 대화하며 내 수업에 필요한 것을 직접 만들 수 있어요.",
    define: {
      term: "바이브코딩",
      text: "만들고 싶은 것을 말로 설명하면 AI가 코드를 써 주는 방식이에요.",
      origin: "2025년 2월, AI 연구자 안드레이 카파시가 처음 붙인 이름이에요.",
    },
    points: [
      {
        icon: "fix",
        title: "현장의 문제를 직접 해결해요",
        desc: "우리 반, 우리 아이들에게 꼭 맞는 도구가 없을 때 기다리지 않고 직접 만들어요.",
      },
      {
        icon: "idea",
        title: "상상하던 것을 현실로 구체화해요",
        desc: "‘이런 자료가 있으면 좋겠다’던 생각을 실제로 쓸 수 있는 앱으로 만들어요.",
      },
    ],
  },
  {
    kind: "compare",
    id: "why-pc",
    short: "채팅창에서 내 PC로",
    title: "채팅창을 넘어, 내 PC에서 내 코드로",
    lead: "처음엔 대부분 채팅창에서 시작해요. 그런데 만들수록 한계가 보여요.",
    before: {
      label: "채팅창에서 만들 때",
      tools: "제미나이 · 구글 AI 스튜디오 · Claude 채팅",
      points: [
        { icon: "chat", title: "코드가 대화 속에만 있어 내 것 같지 않아요" },
        { icon: "history", title: "고치고 키울수록 관리하기 어려워요" },
        { icon: "share", title: "나누려면 코드를 따로 옮겨야 해요" },
      ],
    },
    after: {
      label: "내 PC의 AI 에이전트와 만들 때",
      tools: "Claude Code · Codex",
      points: [
        { icon: "folder", title: "코드가 내 폴더에 파일로 남아요", desc: "AI가 내 폴더의 파일을 직접 읽고 고쳐요." },
        { icon: "history", title: "버전을 기록하고 언제든 되돌려요", desc: "Git이 고친 기록을 차곡차곡 남겨요." },
        {
          icon: "cloud",
          title: "보관·데이터·공유까지 이어져요",
          desc: "깃허브에 보관하고, 슈파베이스에 데이터를 담고, 버셀로 주소를 만들어요.",
        },
        { icon: "robot", title: "명령도 AI가 직접 실행해요", desc: "백엔드를 만들고 배포하는 일까지 맡길 수 있어요." },
      ],
    },
    closing: "버전을 올려 가며 다듬다 보면, 완성도 있는 교육자료가 돼요.",
  },
  {
    kind: "teacher",
    id: "why-teacher",
    short: "개발자이기 전에 교사",
    title: "우리는 개발자이기 전에 교사예요",
    lead: "AI 기술은 도구일 뿐, 교사의 본질이 아니에요.",
    points: [
      { icon: "heart", title: "좋은 교육자료는 좋은 기술이 아니라, 교육적 고민과 깊이에서 나와요." },
      { icon: "target", title: "화려한 기술이 없어도, 내가 가르치는 아이들에게 맞는 자료라면 그게 정답이에요." },
      { icon: "share", title: "무엇이든 자신 있게 나누고 공유하며 함께 성장해요." },
      { icon: "shield", title: "AI가 만든 결과는 교사가 직접 확인해요. 학생 개인정보는 넣지 않아요." },
    ],
    closing: {
      label: "그래서 이 연수는",
      text: "교사의 교육적 고민을 기술의 제약 없이 AI 에이전트와 함께 구현할 수 있도록, 최소한의 환경을 함께 갖춰요.",
    },
  },
];

/** 목차의 장. 장마다 표지 슬라이드가 한 장씩 있어요. */
export interface Chapter {
  /** 주소에 쓰는 이름 (?step=ch1) */
  id: string;
  /** 목차에 보이는 이름 */
  short: string;
  /** 표지 큰 제목 */
  title: string;
  /** 표지 한 줄 설명 */
  lead: string;
  /** 이 장에 들어가는 단계 id (STEPS 순서대로) */
  steps: string[];
}

export const CHAPTERS: Chapter[] = [
  {
    id: "ch1",
    short: "준비하기",
    title: "도구를 설치하고 폴더를 준비해요",
    lead: "{도구}와 Git을 설치하고, 깃허브에 가입한 뒤 첫 프로젝트 폴더를 열어요.",
    steps: ["install", "git", "github", "folder"],
  },
  {
    id: "ch2",
    short: "연결하기",
    title: "깃허브·슈파베이스·버셀을 연결해요",
    lead: "폴더를 연 대화창 하나에서 세 서비스를 차례로 연결해요. 처음 한 번만 하면 돼요.",
    steps: ["connect", "supabase", "vercel"],
  },
  {
    id: "ch3",
    short: "만들기",
    title: "내 교육자료 아카이브를 만들어 공개해요",
    lead: "새 폴더에서 그릴 미로 정하고, 백엔드까지 갖춘 사이트를 만들어 인터넷에 올려요.",
    steps: ["start"],
  },
];

export const STEPS: Step[] = [
  {
    id: "install",
    short: "앱 설치",
    title: "PC 앱을 설치해요",
    logo: "tool",
    byTool: {
      claude: {
        lead: [
          "Claude Code는 Claude 데스크톱 앱 안에 들어 있어요.",
          "다운로드 페이지에서 Windows용 설치 파일을 받아 실행해요.",
          "설치한 뒤 유료 구독한 계정으로 로그인하고, 왼쪽 위 </> 버튼(Code 탭)을 눌러요.",
        ],
        guide: [
          {
            src: "guides/claude-download.png",
            alt: "Claude 다운로드 페이지. 가운데 다운로드 버튼을 누르면 돼요.",
            width: 1246,
            height: 555,
            highlight: { x: 498, y: 389, w: 233, h: 60 },
            label: "버튼 누르기",
            caption: "① 다운로드 버튼 누르기",
          },
          {
            src: "guides/claude-code-tab.png",
            alt: "설치한 Claude 앱의 왼쪽 위. </> 모양 버튼이 Code 탭이에요.",
            width: 305,
            height: 283,
            highlight: { x: 256, y: 17, w: 34, h: 32 },
            label: "Code 탭",
            markScale: 0.55,
            caption: "② 설치 후 </> 누르기",
          },
        ],
        links: [
          { label: "Claude 앱 다운로드", href: "https://claude.com/download", note: "Windows용 다운로드 버튼을 눌러요" },
        ],
        checks: [
          { id: "install-claude-app", label: "Claude 앱을 설치했어요" },
          { id: "install-claude-login", label: "유료 구독한 계정으로 로그인했어요" },
          { id: "install-claude-code", label: "왼쪽 위 </> 버튼을 눌러 Code 탭을 열었어요" },
        ],
        help: [
          {
            situation: "설치 파일이 안 열려요",
            prompt:
              "Claude 데스크톱 앱 설치 파일을 받았는데 실행이 안 돼요. 제 컴퓨터는 Windows예요. 화면에 뜬 메시지는 \"[메시지를 그대로 적어 주세요]\"예요. 코딩을 모르는 사람도 따라 할 수 있게 해결 방법을 순서대로 알려 주세요.",
          },
          {
            situation: "Code 탭이 안 보여요",
            prompt:
              "Claude 데스크톱 앱에 로그인했는데 Code 탭이 보이지 않아요. Claude Pro를 구독했어요. 구독 계정 확인, 앱 업데이트, 다시 로그인하기 중 무엇을 먼저 해 보면 되는지 순서대로 알려 주세요.",
          },
          {
            situation: "Windows 파일이 두 가지예요",
            prompt:
              "Claude 앱을 Windows에 설치하려는데 다운로드 파일이 x64와 arm64 두 가지예요. 제 컴퓨터가 어느 쪽인지 설정 화면에서 확인하는 방법을 쉽게 알려 주세요.",
          },
        ],
      },
      codex: {
        lead: [
          "Codex는 이제 ChatGPT 데스크톱 앱 안에 들어 있어요.",
          "아래 링크로 Codex 페이지를 열고 [Windows 버전 다운로드]를 눌러 설치 파일을 받아요.",
          "설치한 뒤 유료 구독한 계정으로 로그인하고, 앱에서 Codex로 바꿀 수 있으면 끝이에요.",
        ],
        links: [
          {
            label: "Codex 페이지 열기",
            // Windows로 접속하면 [Windows 버전 다운로드] 버튼이 보여요.
            // 이 버튼은 새 ChatGPT 앱(9PLM9XGG6VKS) 설치 파일을 받아요. (9NT1R1C2HH7J는 예전 앱 ChatGPT Classic)
            href: "https://chatgpt.com/ko-KR/codex/",
            note: "받은 파일 이름에 'Classic'이 없는지 확인해요",
          },
        ],
        checks: [
          { id: "install-codex-app", label: "ChatGPT 앱을 설치했어요" },
          { id: "install-codex-login", label: "유료 구독한 계정으로 로그인했어요" },
          { id: "install-codex-mode", label: "앱에서 Codex를 열 수 있어요" },
        ],
        help: [
          {
            situation: "Codex가 안 보여요",
            prompt:
              "ChatGPT 데스크톱 앱에 로그인했는데 Codex로 바꾸는 메뉴가 보이지 않아요. 제 컴퓨터는 Windows이고 ChatGPT Plus를 구독했어요. 앱 업데이트, 계정 확인, 다시 로그인하기 중 무엇을 먼저 해 보면 되는지 순서대로 알려 주세요.",
          },
          {
            situation: "설치가 안 돼요",
            prompt:
              "ChatGPT 데스크톱 앱을 설치하려는데 잘 안 돼요. 제 컴퓨터는 Windows예요. 화면에 뜬 메시지는 \"[메시지를 그대로 적어 주세요]\"예요. 코딩을 모르는 사람도 따라 할 수 있게 해결 방법을 순서대로 알려 주세요.",
          },
          {
            situation: "Classic이 받아졌어요",
            prompt:
              "Windows에서 ChatGPT 앱을 받았는데 이름이 'ChatGPT Classic'이에요. Codex가 들어 있는 새 ChatGPT 앱과 무엇이 다른지, 새 앱을 어디서 받으면 되는지, Classic은 지워도 되는지 알려 주세요.",
          },
        ],
      },
    },
  },
  {
    id: "git",
    short: "Git 설치",
    title: "기록 저장소 Git을 설치해요",
    body: {
      lead: ["Git은 작업한 기록을 차곡차곡 저장해 두는 프로그램이에요. 잘못돼도 예전 상태로 되돌릴 수 있어요."],
      flow: [
        {
          text: "Git 설치 파일을 받아요",
          note: "아래 그림처럼 맨 위 [Click here to download] 하나만 눌러요.",
          link: { label: "다운로드 페이지 열기", href: "https://git-scm.com/install/windows" },
        },
        {
          text: "설치 파일을 열고 [Next]만 눌러 끝까지 설치해요",
          note: "설정은 바꾸지 않아도 돼요.",
        },
        {
          text: "{도구}를 완전히 껐다가 다시 켜요",
          note: "그래야 방금 설치한 Git을 찾을 수 있어요.",
        },
        {
          text: "확인 문장을 보내서 버전이 나오면 끝이에요",
          copy: "내 컴퓨터에 Git이 설치되어 있는지 확인하고 버전을 알려 줘. 명령은 네가 직접 실행해 줘.",
        },
      ],
      guide: {
        src: "guides/git-windows.png",
        alt: "Git 설치 페이지. 맨 위 Click here to download 링크 하나만 누르면 돼요.",
        width: 711,
        height: 397,
        highlight: { x: 36, y: 135, w: 168, h: 22 },
        label: "이것만 누르기",
        dim: { x: 22, y: 191, w: 689, h: 206, text: "아래 링크들은 누르지 않아도 돼요" },
      },
      links: [],
      checks: [
        { id: "git-install", label: "[Next]만 눌러 Git 설치를 끝냈어요" },
        { id: "git-restart", label: "{도구}를 껐다가 다시 켰어요" },
        { id: "git-verify", label: "확인 문장을 보냈더니 Git 버전이 나왔어요" },
      ],
      help: [
        {
          situation: "어떤 파일인지 헷갈려요",
          prompt:
            "Windows에 Git을 설치하려는데 다운로드 페이지에 x64, ARM64, Setup, Portable 등 링크가 여러 개 있어요. 제 컴퓨터에 맞는 것이 무엇인지, 설정 화면에서 확인하는 방법과 함께 쉽게 알려 주세요.",
        },
        {
          situation: "{도구}가 Git을 못 찾아요",
          prompt:
            "Git을 설치했는데 {도구}에서 Git을 찾을 수 없다고 나와요. 제 컴퓨터는 Windows예요. 앱 재시작, 컴퓨터 재시작 중 무엇을 먼저 해 보면 되는지, 그래도 안 되면 어떻게 하는지 순서대로 알려 주세요.",
        },
      ],
    },
  },
  {
    id: "github",
    short: "깃허브 가입",
    title: "깃허브에 가입해요",
    logo: "github",
    body: {
      lead: [
        "깃허브는 Git으로 저장한 작업 기록을 인터넷에 보관하는 곳이에요. 컴퓨터가 고장 나도 작업이 남아요.",
        "가입 화면에서 [Continue with Google]을 누르면 비밀번호를 따로 만들지 않아도 돼요.",
        "사용자 이름(Username)은 나중에 주소에 쓰여요. 영어 소문자와 숫자로 짧게 정해요.",
      ],
      guide: {
        src: "guides/github-signup.png",
        alt: "깃허브 가입 화면. 맨 위 Continue with Google 버튼을 누르면 돼요.",
        width: 800,
        height: 540,
        highlight: { x: 114, y: 130, w: 572, h: 40 },
        label: "이것만 누르기",
        dim: { x: 0, y: 180, w: 800, h: 360, text: "이메일로 가입해도 되지만, Google이 더 쉬워요" },
      },
      links: [{ label: "깃허브 가입하기", href: "https://github.com/signup", note: "무료(Free) 요금제면 충분해요" }],
      checks: [
        { id: "github-signup", label: "Google 계정으로 깃허브에 가입했어요" },
        { id: "github-username", label: "사용자 이름(Username)을 정했어요" },
        { id: "github-login", label: "github.com에 로그인된 화면이 보여요" },
      ],
      help: [
        {
          situation: "사용자 이름을 못 정하겠어요",
          prompt:
            "깃허브 사용자 이름(Username)을 정하려고 해요. 저는 [하는 일, 예: 특수학교 교사]이고 이름은 [영문 이름]이에요. 나중에 웹 주소에 들어가도 어색하지 않고, 영어 소문자·숫자·하이픈만 쓴 짧은 이름 5개를 추천해 주세요.",
        },
        {
          situation: "인증 퍼즐이 계속 나와요",
          prompt:
            "깃허브에 가입하는데 사람인지 확인하는 퍼즐이 계속 나오거나 넘어가지 않아요. 브라우저 바꾸기, 광고 차단 끄기 등 무엇을 해 보면 되는지 순서대로 알려 주세요.",
        },
        {
          situation: "이메일 코드가 안 와요",
          prompt:
            "깃허브 가입 중에 이메일로 받은 인증 코드를 넣으라고 하는데 메일이 오지 않아요. 스팸함 확인, 다시 보내기, 다른 이메일 쓰기 중 무엇을 먼저 해 보면 되는지 알려 주세요.",
        },
      ],
    },
  },
  {
    id: "folder",
    short: "폴더 만들기",
    title: "프로젝트 폴더를 만들고 {도구}에서 열어요",
    logo: "tool",
    byTool: {
      claude: {
        lead: ["첫 프로젝트 폴더예요. 5~7단계 연결은 이 폴더를 연 대화창에서 이어서 해요. 창을 닫아도 왼쪽 목록에서 다시 열 수 있어요."],
        guide: [
          {
            src: "guides/claude-new-session.png",
            alt: "Claude 앱 왼쪽 위. 새로 생성 버튼을 누르면 새 대화가 열려요.",
            width: 307,
            height: 237,
            highlight: { x: 8, y: 95, w: 275, h: 27 },
            label: "새로 생성",
            markScale: 0.55,
            caption: "① 왼쪽 위 [새로 생성]",
          },
          {
            src: "guides/claude-open-folder.png",
            alt: "입력창 위 폴더 없음 버튼을 누르면 폴더 열기 메뉴가 나와요.",
            width: 450,
            height: 187,
            highlight: { x: 138, y: 36, w: 168, h: 26 },
            label: "폴더 열기",
            markScale: 0.55,
            labelSide: "right",
            caption: "② [폴더 없음] → [폴더 열기…]",
          },
        ],
        flow: [
        {
          text: "C 드라이브에 프로젝트 폴더를 만들어요",
          note: "파일 탐색기 → [내 PC] → [로컬 디스크 (C:)] → 빈 곳 오른쪽 클릭 → [새로 만들기] → [폴더]. 이름은 영어로 my-first-app 처럼 지어요.",
        },
          {
            text: "Code 탭에서 [새로 생성] → [폴더 없음] → [폴더 열기…]로 그 폴더를 골라요",
            note: "입력창 위 [로컬]이 선택돼 있으면 돼요.",
          },
        {
          text: "첫 프롬프트로 폴더를 준비하고 점검해요",
          copy: "이 폴더에 작업 기록을 저장할 수 있게 Git을 설정해 줘(git init). 명령은 네가 직접 실행해 줘. 끝나면 Git을 찾을 수 있는지, 이 폴더에 파일을 만들 수 있는지 확인해서 알려 줘.",
          note: "폴더에 작업 기록장을 붙이는 일이에요. PowerShell은 열지 않아도 되고, 실행해도 되는지 물으면 [허용]을 눌러요.",
        },
        ],
        links: [],
        checks: [
          { id: "folder-make", label: "C 드라이브에 영어 이름 폴더를 만들었어요" },
          { id: "folder-open", label: "Claude Code에서 그 폴더를 열었어요" },
          { id: "folder-first", label: "Git 설정과 폴더 점검이 끝났다고 답이 왔어요" },
        ],
        help: [
          {
            situation: "점검에서 안 된대요",
            prompt:
              "방금 안 된다고 했는데, 무엇이 안 됐는지 하나씩 쉽게 설명해 줘. 내가 직접 해야 할 일과 네가 해 줄 수 있는 일을 나눠서 고치고, 다 고치면 같은 점검을 다시 해 줘.",
          },
          {
            situation: "폴더 이름을 한글로 했어요",
            prompt:
              "Windows에서 바이브코딩 프로젝트 폴더 이름을 한글로 만들었어요. 영어 이름으로 바꾸는 게 좋은지, 바꾼다면 어떻게 하면 되는지 쉽게 알려 주세요.",
          },
          {
            situation: "폴더 고르는 칸이 없어요",
            prompt:
              "Claude 데스크톱 앱 Code 탭에서 프로젝트 폴더를 고르는 [폴더 없음] → [폴더 열기…] 메뉴를 찾을 수 없어요. 새 대화를 열고 폴더를 고르는 방법을 순서대로 알려 주세요.",
          },
        ],
      },
      codex: {
        lead: ["첫 프로젝트 폴더예요. 5~7단계 연결은 이 폴더를 연 대화창에서 이어서 해요. 창을 닫아도 왼쪽 목록에서 다시 열 수 있어요."],
        guide: [
          {
            src: "guides/codex-new-chat.png",
            alt: "ChatGPT 앱 왼쪽 위. 새 채팅을 눌러요.",
            width: 471,
            height: 264,
            highlight: { x: 14, y: 60, w: 78, h: 25 },
            label: "새 채팅",
            markScale: 0.6,
            labelSide: "right",
            caption: "① [새 채팅]",
          },
          {
            src: "guides/codex-project-select.png",
            alt: "입력창 위 프로젝트 선택을 누르면 새 프로젝트 메뉴가 나와요.",
            width: 434,
            height: 320,
            highlight: { x: 80, y: 143, w: 94, h: 24 },
            label: "새 프로젝트",
            markScale: 0.6,
            labelSide: "right",
            caption: "② [새 프로젝트]",
          },
          {
            src: "guides/codex-project-create.png",
            alt: "프로젝트 만들기 창. 소스 폴더의 추가 버튼으로 폴더를 골라요.",
            width: 588,
            height: 398,
            highlight: { x: 259, y: 228, w: 64, h: 28 },
            label: "폴더 고르기",
            markScale: 0.6,
            labelSide: "right",
            caption: "③ [추가] → [만들기]",
          },
        ],
        flow: [
        {
          text: "C 드라이브에 프로젝트 폴더를 만들어요",
          note: "파일 탐색기 → [내 PC] → [로컬 디스크 (C:)] → 빈 곳 오른쪽 클릭 → [새로 만들기] → [폴더]. 이름은 영어로 my-first-app 처럼 지어요.",
        },
          {
            text: "Codex에서 [새 채팅] → [프로젝트 선택] → [새 프로젝트]를 눌러요",
            note: "소스 폴더의 [추가]로 만든 폴더를 고르고 [프로젝트 만들기]를 눌러요.",
          },
        {
          text: "첫 프롬프트로 폴더를 준비하고 점검해요",
          copy: "이 폴더에 작업 기록을 저장할 수 있게 Git을 설정해 줘(git init). 명령은 네가 직접 실행해 줘. 끝나면 Git을 찾을 수 있는지, 이 폴더에 파일을 만들 수 있는지 확인해서 알려 줘.",
          note: "폴더에 작업 기록장을 붙이는 일이에요. PowerShell은 열지 않아도 되고, 실행해도 되는지 물으면 [허용]을 눌러요.",
        },
        ],
        links: [],
        checks: [
          { id: "folder-make", label: "C 드라이브에 영어 이름 폴더를 만들었어요" },
          { id: "folder-open", label: "Codex에서 그 폴더를 프로젝트로 열었어요" },
          { id: "folder-first", label: "Git 설정과 폴더 점검이 끝났다고 답이 왔어요" },
        ],
        help: [
          {
            situation: "점검에서 안 된대요",
            prompt:
              "방금 안 된다고 했는데, 무엇이 안 됐는지 하나씩 쉽게 설명해 줘. 내가 직접 해야 할 일과 네가 해 줄 수 있는 일을 나눠서 고치고, 다 고치면 같은 점검을 다시 해 줘.",
          },
          {
            situation: "폴더 이름을 한글로 했어요",
            prompt:
              "Windows에서 바이브코딩 프로젝트 폴더 이름을 한글로 만들었어요. 영어 이름으로 바꾸는 게 좋은지, 바꾼다면 어떻게 하면 되는지 쉽게 알려 주세요.",
          },
          {
            situation: "폴더를 못 고르겠어요",
            prompt:
              "Windows의 ChatGPT 앱 Codex에서 [새 채팅] → [프로젝트 선택] → [새 프로젝트]로 내 컴퓨터 폴더를 프로젝트로 만들고 싶은데 잘 안 돼요. 순서대로 알려 주세요.",
          },
        ],
      },
    },
  },
  {
    id: "connect",
    short: "깃허브 연결",
    title: "{도구}와 깃허브를 연결해요",
    logo: "github",
    body: {
      lead: ["연결해 두면 {도구}가 내 작업을 깃허브에 대신 올려 줘요. 처음 한 번만 하면 돼요."],
      flow: [
        {
          text: "폴더를 연 대화창에 이 문장을 보내요",
          copy: "깃허브 로그인을 기기 코드 방식으로만 해 줘. 이번 명령에만 환경 변수 GCM_GITHUB_AUTHMODES=device, GCM_GUI_PROMPT=0 을 붙여서 git credential-manager github login 을 네가 직접 실행해 줘. 출력에 나오는 8자리 코드를 바로 나에게 알려 주고, 내가 브라우저에서 승인할 때까지 기다려 줘. 다른 로그인 방법은 안내하지 마.",
          note: "PowerShell은 열지 않아도 돼요. 실행해도 되는지 물으면 [허용]을 눌러요.",
        },
        {
          text: "{도구}가 알려 준 8자리 코드를 복사해요",
          note: "ABCD-1234 처럼 생겼어요.",
        },
        {
          text: "브라우저에서 코드를 넣고 승인해요",
          note: "로그인 화면이 나오면 먼저 로그인하고, 코드를 넣은 뒤 승인(Authorize)해요.",
          link: { label: "github.com/login/device 열기", href: "https://github.com/login/device" },
        },
        {
          text: "확인 문장을 보내서 내 아이디가 나오면 끝이에요",
          copy: "깃허브 로그인이 잘 됐는지 확인하고, 로그인된 내 깃허브 아이디를 알려 줘. 명령은 네가 직접 실행해 줘.",
        },
      ],
      tip: { title: "앞으로는 이렇게 말하면 돼요", phrase: "지금까지 작업한 것 깃허브에 올려줘" },
      links: [],
      checks: [
        { id: "connect-send", label: "{도구}에게서 8자리 코드를 받았어요" },
        { id: "connect-auth", label: "기기 로그인 페이지에 코드를 넣고 승인했어요" },
        { id: "connect-verify", label: "확인 문장을 보냈더니 내 깃허브 아이디가 나왔어요" },
      ],
      help: [
        {
          situation: "코드가 안 나와요",
          prompt:
            "깃허브 로그인 명령을 실행했는데 8자리 코드가 보이지 않아요. 같은 명령(GCM_GITHUB_AUTHMODES=device, GCM_GUI_PROMPT=0, git credential-manager github login)을 다시 실행해서, 출력에 나오는 코드를 기다리지 말고 바로 알려 줘.",
        },
        {
          situation: "다른 방법을 알려 줘요",
          prompt:
            "다른 로그인 방법 말고 기기 코드 방식으로만 해 줘. github.com/login/device 에 넣을 8자리 코드를 받을 수 있게 명령을 다시 실행해 줘.",
        },
        {
          situation: "비밀번호·토큰을 달래요",
          prompt:
            "깃허브 연결 중에 비밀번호나 토큰을 입력하라고 나와요. 채팅에 비밀번호를 쓰지 않고, 브라우저에서 로그인을 승인하는 방법으로 다시 연결해 주세요.",
        },
      ],
    },
  },
  {
    id: "supabase",
    short: "슈파베이스",
    title: "슈파베이스에 가입하고 연결해요",
    logo: "supabase",
    byTool: {
      claude: {
        lead: ["슈파베이스는 앱의 데이터(글, 점수, 로그인 등)를 저장하는 곳이에요. 연결하면 Claude Code가 직접 만들고 관리해 줘요."],
        flow: [
          {
            text: "슈파베이스에 가입해요",
            note: "[Continue with GitHub]를 누르면 3단계에서 만든 깃허브 계정으로 바로 가입돼요.",
            link: { label: "가입 페이지 열기", href: "https://supabase.com/dashboard/sign-up" },
          },
          {
            text: "Claude 커넥터 목록에서 Supabase를 찾아 연결해요",
            note: "왼쪽 메뉴 [Customize] → [Connectors] → [Discover]에서 Supabase를 검색하고 [Connect to Claude]를 눌러요.",
            link: { label: "커넥터 목록 열기", href: "https://claude.ai/customize/connectors" },
          },
          {
            text: "브라우저에서 로그인하고 승인해요",
            note: "연결되면 대화창 [+] → [커넥터]에서 Supabase가 켜져 있는지 확인해요.",
          },
          {
            text: "확인 문장을 보내서 내 정보가 나오면 끝이에요",
            copy: "Supabase에 잘 연결됐는지 확인하고, 내 Supabase 조직 이름을 알려 줘.",
          },
        ],
        links: [],
        checks: [
          { id: "supabase-signup", label: "깃허브 계정으로 슈파베이스에 가입했어요" },
          { id: "supabase-connect", label: "커넥터 목록에서 Supabase를 연결하고 승인했어요" },
          { id: "supabase-verify", label: "확인 문장을 보냈더니 내 조직 이름이 나왔어요" },
        ],
        help: [
          {
            situation: "Supabase가 안 보여요",
            prompt:
              "Claude 데스크톱 앱에서 Supabase 커넥터를 연결하려는데 Customize → Connectors → Discover에서 Supabase를 찾을 수 없어요. 어디에서 추가하는지 순서대로 알려 주세요.",
          },
          {
            situation: "가입 후 뭘 고르죠?",
            prompt:
              "슈파베이스에 처음 가입했더니 조직(organization)이나 프로젝트를 만들라고 해요. 바이브코딩 연습용으로 무료로 쓰려면 이름, 요금제(Free), 지역을 어떻게 고르면 되는지 쉽게 알려 주세요.",
          },
          {
            situation: "허락을 자꾸 물어요",
            prompt:
              "Claude Code가 Supabase 도구를 쓸 때마다 허락할지 물어봐요. 지금 하려는 작업이 무엇인지 쉽게 설명해 주고, 허락해도 되는지 알려 주세요.",
          },
        ],
      },
      codex: {
        lead: ["슈파베이스는 앱의 데이터(글, 점수, 로그인 등)를 저장하는 곳이에요. 연결하면 Codex가 직접 만들고 관리해 줘요."],
        flow: [
          {
            text: "슈파베이스에 가입해요",
            note: "[Continue with GitHub]를 누르면 3단계에서 만든 깃허브 계정으로 바로 가입돼요.",
            link: { label: "가입 페이지 열기", href: "https://supabase.com/dashboard/sign-up" },
          },
          {
            text: "ChatGPT 앱 [설정] → [MCP servers] → [Add server]를 눌러요",
            note: "이름은 supabase, 방식은 Streamable HTTP를 고르고, 아래 주소를 붙여 넣은 뒤 저장하고 [Restart]를 눌러요.",
            copy: "https://mcp.supabase.com/mcp",
          },
          {
            text: "[Authenticate]를 누르고 브라우저에서 승인해요",
            note: "슈파베이스에 로그인하고, 연결할 조직(organization)을 골라 승인해요.",
          },
          {
            text: "확인 문장을 보내서 내 정보가 나오면 끝이에요",
            copy: "Supabase에 잘 연결됐는지 확인하고, 내 Supabase 조직 이름을 알려 줘.",
          },
        ],
        links: [],
        checks: [
          { id: "supabase-signup", label: "깃허브 계정으로 슈파베이스에 가입했어요" },
          { id: "supabase-connect", label: "MCP servers에 Supabase를 추가하고 승인했어요" },
          { id: "supabase-verify", label: "확인 문장을 보냈더니 내 조직 이름이 나왔어요" },
        ],
        help: [
          {
            situation: "MCP 메뉴가 없어요",
            prompt:
              "Windows의 ChatGPT 데스크톱 앱에서 Codex에 Supabase MCP 서버를 추가하려는데 설정에서 MCP servers 메뉴를 찾을 수 없어요. 어디에 있는지, 없으면 다른 방법은 무엇인지 알려 주세요.",
          },
          {
            situation: "가입 후 뭘 고르죠?",
            prompt:
              "슈파베이스에 처음 가입했더니 조직(organization)이나 프로젝트를 만들라고 해요. 바이브코딩 연습용으로 무료로 쓰려면 이름, 요금제(Free), 지역을 어떻게 고르면 되는지 쉽게 알려 주세요.",
          },
          {
            situation: "승인이 안 돼요",
            prompt:
              "Codex에 Supabase MCP 서버(https://mcp.supabase.com/mcp)를 추가했는데 Authenticate를 눌러도 로그인이 끝나지 않아요. 무엇을 확인하고 다시 해 보면 되는지 순서대로 알려 주세요.",
          },
        ],
      },
    },
  },
  {
    id: "vercel",
    short: "버셀",
    title: "버셀에 가입하고 연결해요",
    logo: "vercel",
    byTool: {
      claude: {
        lead: ["버셀은 만든 앱을 인터넷 주소로 공개해 주는 곳이에요. 연결하면 {도구}가 배포하고, 오류 기록도 직접 확인해 줘요."],
        flow: [
          {
            text: "버셀에 가입해요",
            note: "[Continue with GitHub]로 가입하고, 요금제는 무료인 Hobby를 골라요.",
            link: { label: "가입 페이지 열기", href: "https://vercel.com/signup" },
          },
          {
            text: "Claude 커넥터 목록에서 Vercel을 찾아 연결해요",
            note: "왼쪽 메뉴 [Customize] → [Connectors] → [Discover]에서 Vercel을 검색하고 [Connect to Claude]를 눌러요.",
            link: { label: "커넥터 목록 열기", href: "https://claude.ai/customize/connectors" },
          },
          {
            text: "브라우저에서 로그인하고 승인해요",
            note: "연결되면 대화창 [+] → [커넥터]에서 Vercel이 켜져 있는지 확인해요.",
          },
          {
            text: "확인 문장을 보내서 내 정보가 나오면 끝이에요",
            copy: "Vercel에 잘 연결됐는지 확인하고, 내 Vercel 팀 이름을 알려 줘.",
          },
        ],
        links: [],
        checks: [
          { id: "vercel-signup", label: "깃허브 계정으로 버셀에 가입했어요" },
          { id: "vercel-connect", label: "커넥터 목록에서 Vercel을 연결하고 승인했어요" },
          { id: "vercel-verify", label: "확인 문장을 보냈더니 내 팀 이름이 나왔어요" },
        ],
        help: [
          {
            situation: "요금제를 고르래요",
            prompt:
              "버셀에 가입하는데 요금제를 고르라고 해요. 개인이 연습용으로 무료로 쓰려면 무엇을 고르면 되는지, Hobby와 Pro 차이를 쉽게 알려 주세요.",
          },
          {
            situation: "Vercel이 안 보여요",
            prompt:
              "Claude 데스크톱 앱에서 Vercel 커넥터를 연결하려는데 Customize → Connectors → Discover에서 Vercel을 찾을 수 없어요. 어디에서 추가하는지 순서대로 알려 주세요.",
          },
          {
            situation: "승인이 안 돼요",
            prompt:
              "Claude에 Vercel 커넥터를 연결하려는데 버셀 로그인과 승인이 끝나지 않아요. 무엇을 확인하고 다시 해 보면 되는지 알려 주세요.",
          },
        ],
      },
      codex: {
        lead: ["버셀은 만든 앱을 인터넷 주소로 공개해 주는 곳이에요. 연결하면 {도구}가 배포하고, 오류 기록도 직접 확인해 줘요."],
        flow: [
          {
            text: "버셀에 가입해요",
            note: "[Continue with GitHub]로 가입하고, 요금제는 무료인 Hobby를 골라요.",
            link: { label: "가입 페이지 열기", href: "https://vercel.com/signup" },
          },
          {
            text: "ChatGPT 앱 [설정] → [MCP servers] → [Add server]를 눌러요",
            note: "이름은 vercel, 방식은 Streamable HTTP를 고르고, 아래 주소를 붙여 넣은 뒤 저장하고 [Restart]를 눌러요.",
            copy: "https://mcp.vercel.com",
          },
          {
            text: "[Authenticate]를 누르고 브라우저에서 승인해요",
            note: "버셀에 로그인하고, 연결할 팀(Hobby)을 골라 승인해요.",
          },
          {
            text: "확인 문장을 보내서 내 정보가 나오면 끝이에요",
            copy: "Vercel에 잘 연결됐는지 확인하고, 내 Vercel 팀 이름을 알려 줘.",
          },
        ],
        links: [],
        checks: [
          { id: "vercel-signup", label: "깃허브 계정으로 버셀에 가입했어요" },
          { id: "vercel-connect", label: "MCP servers에 Vercel을 추가하고 승인했어요" },
          { id: "vercel-verify", label: "확인 문장을 보냈더니 내 팀 이름이 나왔어요" },
        ],
        help: [
          {
            situation: "요금제를 고르래요",
            prompt:
              "버셀에 가입하는데 요금제를 고르라고 해요. 개인이 연습용으로 무료로 쓰려면 무엇을 고르면 되는지, Hobby와 Pro 차이를 쉽게 알려 주세요.",
          },
          {
            situation: "MCP 메뉴가 없어요",
            prompt:
              "Windows의 ChatGPT 데스크톱 앱에서 Codex에 Vercel MCP 서버(https://mcp.vercel.com)를 추가하려는데 설정에서 MCP servers 메뉴를 찾을 수 없어요. 어디에 있는지 알려 주세요.",
          },
          {
            situation: "승인이 안 돼요",
            prompt:
              "Codex에 Vercel MCP 서버(https://mcp.vercel.com)를 추가했는데 Authenticate를 눌러도 로그인이 끝나지 않아요. 무엇을 확인하고 다시 해 보면 되는지 알려 주세요.",
          },
        ],
      },
    },
  },
  {
    id: "start",
    short: "과제",
    title: "과제: 내 교육자료 아카이브 만들기",
    logo: "tool",
    body: {
      lead: ["앱 하나에 폴더 하나. 문장 하나를 보내면 {도구}가 질문하고(grill me), {규칙파일}에 정리한 뒤 만들어요."],
      flow: [
        {
          text: "새 폴더 C:\\my-archive 를 만들어 새 대화로 열어요",
          note: "4단계와 같은 방법이에요. 연결(깃허브·슈파베이스·버셀)은 다시 하지 않아도 돼요.",
          copy: "이 폴더에 작업 기록을 저장할 수 있게 Git을 설정해 줘(git init). 명령은 네가 직접 실행해 줘. 끝나면 Git을 찾을 수 있는지, 이 폴더에 파일을 만들 수 있는지 확인해서 알려 줘.",
        },
        {
          text: "과제 문장을 보내고 질문에 하나씩 답해요",
          note: "모르면 \"네 추천대로\". {규칙파일} 정리를 보여 주며 \"만들까요?\"라고 물으면 \"만들어\"라고 답해요.",
          copy: "교사용 수업 자료 아카이브 사이트를 만들고 싶어. 선생님들이 자료(제목·설명·링크)를 모아 두고 검색·카테고리·태그로 찾아 쓰는 사이트가 목표야. 바로 만들지 말고 먼저 나를 인터뷰해 줘(grill me). 질문은 한 번에 하나씩, 보기와 네 추천을 함께 주고 7개 이내로 해. 사이트 이름, 혼자 쓰는지 여럿이 쓰는지, 카테고리, 누가 등록·삭제하는지, 학생 개인정보를 넣지 않는 방법은 꼭 물어봐. 끝나면 정한 내용을 이 폴더의 {규칙파일}에 정리해서 보여 주고 \"만들까요?\"라고 물어봐. 첫 버전은 자료 등록·목록·검색·카테고리만 넣고, 태그·파일 올리기는 {규칙파일}에 '나중에 더할 기능'으로 적어 둬. 내가 \"만들어\"라고 하면 Supabase에 무료 프로젝트와 표, 보안 규칙을 만들고 화면을 연결해서 미리 보기로 실행해 줘. 비밀 키(service_role)는 쓰지 마.",
        },
        {
          text: "자료를 등록하고 새로고침해도 남는지 봐요",
          note: "슈파베이스 표(Table Editor)에도 보이면 백엔드가 동작하는 거예요.",
          link: { label: "슈파베이스 열기", href: "https://supabase.com/dashboard/projects" },
        },
        {
          text: "깃허브에 올리고 버셀로 공개해요",
          note: "학생 이름·사진 같은 개인정보는 등록하지 않아요.",
          copy: "지금까지 작업한 것 깃허브에 올려줘. 그다음 버셀에 배포해 줘. Supabase 주소와 공개 키는 버셀 환경 변수로 넣고, 다른 사람이 열 수 있는 주소를 알려 줘.",
        },
      ],
      links: [],
      checks: [
        { id: "start-grill", label: "질문에 답했더니 {규칙파일} 파일이 생겼어요" },
        { id: "start-save", label: "자료를 등록하고 새로고침해도 남아 있어요" },
        { id: "start-deploy", label: "깃허브에 올리고, 버셀 주소에서 내 아카이브가 열려요" },
      ],
      help: [
        {
          situation: "질문이 너무 많아요",
          prompt:
            "질문은 여기까지 해 줘. 지금까지 답한 내용에 네 추천을 더해서 나머지를 채우고, 정한 내용을 {규칙파일}에 정리해서 보여 줘. 아직 코드는 만들지 마.",
        },
        {
          situation: "저장이 안 돼요",
          prompt:
            "자료를 등록했는데 저장이 안 되거나 새로고침하면 사라져요. Supabase 표와 보안 규칙(RLS), 화면 연결을 확인해서 원인을 쉽게 설명하고 고쳐 줘. 비밀 키(service_role)는 쓰지 마.",
        },
        {
          situation: "배포하면 목록이 비어요",
          prompt:
            "버셀 주소에서는 자료 목록이 비어 있거나 오류가 나요. 버셀 환경 변수에 Supabase 주소와 공개 키가 들어갔는지 확인하고, 빠졌으면 넣은 뒤 다시 배포해 줘.",
        },
      ],
    },
  },
];

/** 문구 속 {도구}를 고른 도구 이름(Claude Code·Codex)으로 바꿔요 */
function fillTool<T>(value: T, tool: Tool | null): T {
  const name = tool ? TOOL_NAME[tool] : "Claude Code·Codex";
  // 프로젝트 규칙 파일: Claude Code는 CLAUDE.md, Codex는 AGENTS.md를 대화마다 읽어요.
  const rules = tool === "codex" ? "AGENTS.md" : tool === "claude" ? "CLAUDE.md" : "CLAUDE.md·AGENTS.md";
  return JSON.parse(JSON.stringify(value).replaceAll("{도구}", name).replaceAll("{규칙파일}", rules)) as T;
}

export function bodyFor(step: Step, tool: Tool | null): StepBody | undefined {
  const body = step.body ?? (tool ? step.byTool?.[tool] : undefined);
  return body && fillTool(body, tool);
}

/** 단계 로고 파일 이름. 없으면 undefined */
export function logoFor(step: Step, tool: Tool | null): string | undefined {
  if (step.logo !== "tool") return step.logo;
  return tool === "codex" ? "chatgpt" : tool === "claude" ? "claude" : undefined;
}

export function chapterLead(chapter: Chapter, tool: Tool | null): string {
  return fillTool(chapter.lead, tool);
}

export function titleFor(step: Step, tool: Tool | null): string {
  return fillTool(step.title, tool);
}
