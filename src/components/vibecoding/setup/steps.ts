export type Tool = "claude" | "codex"

export const TOOL_NAME: Record<Tool, string> = {
  claude: "Claude Code",
  codex: "Codex",
}

export interface StepLink {
  label: string
  /** 새 탭으로 여는 주소. dialog가 있으면 없어도 돼요 */
  href?: string
  note?: string
  /** 정하면 [열기]를 눌렀을 때 새 탭 대신 이 안내 창이 떠요 */
  dialog?: StepDialog
}

/** [열기]로 띄우는 안내 창 */
export interface StepDialog {
  title: string
  steps: string[]
  command?: StepCommand
  /** 창 아래에 붙는 참고 링크(새 탭) */
  more?: { label: string; href: string }
}

export interface StepCheck {
  id: string
  label: string
  /** Claude Code·Codex에 그대로 붙여 넣을 문장. 있으면 항목 옆에 [문장 복사]가 생겨요 */
  ask?: string
}

export interface StepHelp {
  /** 막힌 상황 (칩에 보이는 짧은 문장) */
  situation: string
  /** Claude Code·Codex에 붙여 넣을 프롬프트 */
  prompt: string
}

/** 왼쪽 칸에 넣는 안내 그림. 좌표는 원본 이미지 픽셀 기준 */
export interface StepGuide {
  src: string
  alt: string
  width: number
  height: number
  /** 주황 점선을 두를 곳. 그림에 이미 표시가 있으면 비워 둬요 */
  highlight?: { x: number; y: number; w: number; h: number }
  label?: string
  /** 누르지 않아도 되는 곳을 흐리게 덮고 안내 문구를 얹어요 */
  dim?: { x: number; y: number; w: number; h: number; text: string }
  /** 그림 위에 붙는 짧은 설명 (예: "① [+] → 커넥터") */
  caption?: string
  /** 작은 그림에서 점선·이름표 크기를 줄여요. 기본 1 */
  markScale?: number
  /** 이름표 자리를 직접 정해요. 비우면 아래 → 오른쪽 → 위 순서로 자동 */
  labelSide?: "below" | "right" | "above"
}

export interface StepFlowItem {
  text: string
  note?: string
  /** 복사해서 보낼 문장 */
  copy?: string
  /** 새 탭으로 여는 링크 */
  link?: { label: string; href: string }
}

/** 복사해서 붙여 넣는 명령어 한 줄 */
export interface StepCommand {
  label: string
  code: string
}

export interface StepBody {
  /** 화면 왼쪽 설명. 2~3문장 */
  lead: string[]
  /** 여러 장이면 왼쪽부터 순서대로 나란히 보여요 */
  guide?: StepGuide | StepGuide[]
  /** 번호를 붙여 차례대로 보여 주는 할 일. 링크·그림 대신 써요 */
  flow?: StepFlowItem[]
  /** 왼쪽 칸 맨 아래 "앞으로는 이렇게 말해요" 상자 */
  tip?: { title: string; phrase: string }
  links: StepLink[]
  checks: StepCheck[]
  help: StepHelp[]
}

export interface Step {
  id: string
  /** 진행 막대에 보이는 짧은 이름 */
  short: string
  title: string
  /** 단계 제목 옆 브랜드 로고(public/logos). "tool"이면 고른 도구 로고. 없으면 단계 표시만 */
  logo?: string
  /** 도구와 상관없이 같은 내용 */
  body?: StepBody
  /** 클코·코덱스에 따라 내용이 갈라지는 단계 */
  byTool?: Partial<Record<Tool, StepBody>>
}

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
          {
            label: "Claude 앱 다운로드",
            href: "https://claude.com/download",
            note: "Windows용 다운로드 버튼을 눌러요",
          },
        ],
        checks: [
          { id: "install-claude-app", label: "Claude 앱을 설치했어요" },
          {
            id: "install-claude-login",
            label: "유료 구독한 계정으로 로그인했어요",
          },
          {
            id: "install-claude-code",
            label: "왼쪽 위 </> 버튼을 눌러 Code 탭을 열었어요",
          },
        ],
        help: [
          {
            situation: "설치 파일이 안 열려요",
            prompt:
              'Claude 데스크톱 앱 설치 파일을 받았는데 실행이 안 돼요. 제 컴퓨터는 Windows예요. 화면에 뜬 메시지는 "[메시지를 그대로 적어 주세요]"예요. 코딩을 모르는 사람도 따라 할 수 있게 해결 방법을 순서대로 알려 주세요.',
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
          {
            id: "install-codex-login",
            label: "유료 구독한 계정으로 로그인했어요",
          },
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
              'ChatGPT 데스크톱 앱을 설치하려는데 잘 안 돼요. 제 컴퓨터는 Windows예요. 화면에 뜬 메시지는 "[메시지를 그대로 적어 주세요]"예요. 코딩을 모르는 사람도 따라 할 수 있게 해결 방법을 순서대로 알려 주세요.',
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
      lead: [
        "Git은 작업한 기록을 차곡차곡 저장해 두는 프로그램이에요. 잘못돼도 예전 상태로 되돌릴 수 있어요.",
        "아래 그림의 링크 하나만 눌러 설치 파일을 받아요.",
        "설치 파일을 실행하고, 설정은 바꾸지 말고 [Next]만 눌러 끝까지 설치해요.",
      ],
      guide: {
        src: "guides/git-windows.png",
        alt: "Git 설치 페이지. 맨 위 Click here to download 링크 하나만 누르면 돼요.",
        width: 711,
        height: 397,
        highlight: { x: 36, y: 135, w: 168, h: 22 },
        label: "이것만 누르기",
        dim: {
          x: 22,
          y: 191,
          w: 689,
          h: 206,
          text: "아래 링크들은 누르지 않아도 돼요",
        },
      },
      links: [
        {
          label: "Git 다운로드",
          href: "https://git-scm.com/install/windows",
          note: "맨 위 [Click here to download]만 눌러요",
        },
      ],
      checks: [
        { id: "git-install", label: "내 컴퓨터에 Git을 설치했어요" },
        { id: "git-restart", label: "{도구}를 껐다가 다시 켰어요" },
        {
          id: "git-verify",
          label: "{도구}에 확인 문장을 보냈더니 Git 버전이 나왔어요",
          ask: "내 컴퓨터에 Git이 설치되어 있는지 확인하고 버전을 알려 줘.",
        },
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
        dim: {
          x: 0,
          y: 180,
          w: 800,
          h: 360,
          text: "이메일로 가입해도 되지만, Google이 더 쉬워요",
        },
      },
      links: [
        {
          label: "깃허브 가입하기",
          href: "https://github.com/signup",
          note: "무료(Free) 요금제면 충분해요",
        },
      ],
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
        lead: [
          "앞으로 만들 앱이 이 폴더에 저장돼요. 다음 단계부터는 폴더를 연 이 대화창에서 이어서 해요. 창을 닫아도 왼쪽 목록에서 다시 열 수 있어요.",
        ],
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
            text: "첫 프롬프트를 보내 폴더를 점검해요",
            copy: "이 폴더를 Git 저장소로 만들어 주고, 잘 됐는지 알려 줘.",
          },
        ],
        links: [],
        checks: [
          {
            id: "folder-make",
            label: "C 드라이브에 영어 이름 폴더를 만들었어요",
          },
          { id: "folder-open", label: "Claude Code에서 그 폴더를 열었어요" },
          {
            id: "folder-first",
            label: "Git 저장소가 만들어졌다고 답이 왔어요",
          },
        ],
        help: [
          {
            situation: "폴더 이름을 한글로 했어요",
            prompt:
              "Windows에서 바이브코딩 프로젝트 폴더 이름을 한글로 만들었어요. 영어 이름으로 바꾸는 게 좋은지, 바꾼다면 어떻게 하면 되는지 쉽게 알려 주세요.",
          },
          {
            situation: "바탕 화면에 만들었어요",
            prompt:
              "Windows 바탕 화면(또는 문서 폴더)에 프로젝트 폴더를 만들었어요. OneDrive와 동기화되면 문제가 생길 수 있다고 들었는데, C 드라이브로 옮겨야 하는지와 옮기는 방법을 알려 주세요.",
          },
          {
            situation: "폴더 고르는 칸이 없어요",
            prompt:
              "Claude 데스크톱 앱 Code 탭에서 프로젝트 폴더를 고르는 [폴더 없음] → [폴더 열기…] 메뉴를 찾을 수 없어요. 새 대화를 열고 폴더를 고르는 방법을 순서대로 알려 주세요.",
          },
        ],
      },
      codex: {
        lead: [
          "앞으로 만들 앱이 이 폴더에 저장돼요. 다음 단계부터는 폴더를 연 이 대화창에서 이어서 해요. 창을 닫아도 왼쪽 목록에서 다시 열 수 있어요.",
        ],
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
            text: "첫 프롬프트를 보내 폴더를 점검해요",
            copy: "이 폴더를 Git 저장소로 만들어 주고, 잘 됐는지 알려 줘.",
          },
        ],
        links: [],
        checks: [
          {
            id: "folder-make",
            label: "C 드라이브에 영어 이름 폴더를 만들었어요",
          },
          {
            id: "folder-open",
            label: "Codex에서 그 폴더를 프로젝트로 열었어요",
          },
          {
            id: "folder-first",
            label: "Git 저장소가 만들어졌다고 답이 왔어요",
          },
        ],
        help: [
          {
            situation: "폴더 이름을 한글로 했어요",
            prompt:
              "Windows에서 바이브코딩 프로젝트 폴더 이름을 한글로 만들었어요. 영어 이름으로 바꾸는 게 좋은지, 바꾼다면 어떻게 하면 되는지 쉽게 알려 주세요.",
          },
          {
            situation: "바탕 화면에 만들었어요",
            prompt:
              "Windows 바탕 화면(또는 문서 폴더)에 프로젝트 폴더를 만들었어요. OneDrive와 동기화되면 문제가 생길 수 있다고 들었는데, C 드라이브로 옮겨야 하는지와 옮기는 방법을 알려 주세요.",
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
      lead: [
        "연결해 두면 {도구}가 내 작업을 깃허브에 대신 올려 줘요. 처음 한 번만 하면 돼요.",
      ],
      flow: [
        {
          text: "폴더를 연 대화창에 이 문장을 보내요",
          copy: "Windows에 Git과 함께 설치된 Git Credential Manager로 깃허브에 로그인해 줘. git credential-manager github login 명령을 쓰고, 로그인 창이 뜨면 내가 따라 할 수 있게 알려 줘.",
          note: "명령 실행을 허락해 달라고 하면 허용해요.",
        },
        {
          text: "깃허브 로그인 창이 뜨면 브라우저로 로그인을 골라요",
          note: "2단계에서 설치한 Git에 들어 있는 로그인 창이에요.",
        },
        {
          text: "브라우저에서 깃허브에 로그인하고 승인해요",
          note: "처음이면 앱 승인(Authorize) 화면이 나와요. 승인하면 끝이에요.",
        },
        {
          text: "확인 문장을 보내서 내 아이디가 나오면 끝이에요",
          copy: "깃허브 로그인이 잘 됐는지 확인하고, 로그인된 내 깃허브 아이디를 알려 줘.",
        },
      ],
      tip: {
        title: "앞으로는 이렇게 말하면 돼요",
        phrase: "지금까지 작업한 것 깃허브에 올려줘",
      },
      links: [],
      checks: [
        { id: "connect-send", label: "로그인 문장을 {도구}에 보냈어요" },
        {
          id: "connect-auth",
          label: "브라우저에서 깃허브에 로그인하고 승인했어요",
        },
        {
          id: "connect-verify",
          label: "확인 문장을 보냈더니 내 깃허브 아이디가 나왔어요",
        },
      ],
      help: [
        {
          situation: "로그인 창이 안 떠요",
          prompt:
            "Windows에서 Git Credential Manager로 깃허브에 로그인하려는데 로그인 창이 뜨지 않아요. Git이 최신 버전인지, Git Credential Manager가 설정되어 있는지 확인하고 다시 로그인하게 도와주세요.",
        },
        {
          situation: "명령을 못 찾는대요",
          prompt:
            "git credential-manager 명령을 찾을 수 없다고 나와요. Windows용 Git을 설치할 때 기본 설정 그대로 설치했어요. 무엇을 확인하고 어떻게 다시 설치하면 되는지 순서대로 알려 주세요.",
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
        lead: [
          "슈파베이스는 앱의 데이터(글, 점수, 로그인 등)를 저장하는 곳이에요. 연결하면 Claude Code가 직접 만들고 관리해 줘요.",
        ],
        flow: [
          {
            text: "슈파베이스에 가입해요",
            note: "[Continue with GitHub]를 누르면 3단계에서 만든 깃허브 계정으로 바로 가입돼요.",
            link: {
              label: "가입 페이지 열기",
              href: "https://supabase.com/dashboard/sign-up",
            },
          },
          {
            text: "Claude 커넥터 목록에서 Supabase를 찾아 연결해요",
            note: "왼쪽 메뉴 [Customize] → [Connectors] → [Discover]에서 Supabase를 검색하고 [Connect to Claude]를 눌러요.",
            link: {
              label: "커넥터 목록 열기",
              href: "https://claude.ai/customize/connectors",
            },
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
          {
            id: "supabase-signup",
            label: "깃허브 계정으로 슈파베이스에 가입했어요",
          },
          {
            id: "supabase-connect",
            label: "커넥터 목록에서 Supabase를 연결하고 승인했어요",
          },
          {
            id: "supabase-verify",
            label: "확인 문장을 보냈더니 내 조직 이름이 나왔어요",
          },
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
        lead: [
          "슈파베이스는 앱의 데이터(글, 점수, 로그인 등)를 저장하는 곳이에요. 연결하면 Codex가 직접 만들고 관리해 줘요.",
        ],
        flow: [
          {
            text: "슈파베이스에 가입해요",
            note: "[Continue with GitHub]를 누르면 3단계에서 만든 깃허브 계정으로 바로 가입돼요.",
            link: {
              label: "가입 페이지 열기",
              href: "https://supabase.com/dashboard/sign-up",
            },
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
          {
            id: "supabase-signup",
            label: "깃허브 계정으로 슈파베이스에 가입했어요",
          },
          {
            id: "supabase-connect",
            label: "MCP servers에 Supabase를 추가하고 승인했어요",
          },
          {
            id: "supabase-verify",
            label: "확인 문장을 보냈더니 내 조직 이름이 나왔어요",
          },
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
        lead: [
          "버셀은 만든 앱을 인터넷 주소로 공개해 주는 곳이에요. 연결하면 {도구}가 배포하고, 오류 기록도 직접 확인해 줘요.",
        ],
        flow: [
          {
            text: "버셀에 가입해요",
            note: "[Continue with GitHub]로 가입하고, 요금제는 무료인 Hobby를 골라요.",
            link: {
              label: "가입 페이지 열기",
              href: "https://vercel.com/signup",
            },
          },
          {
            text: "Claude 커넥터 목록에서 Vercel을 찾아 연결해요",
            note: "왼쪽 메뉴 [Customize] → [Connectors] → [Discover]에서 Vercel을 검색하고 [Connect to Claude]를 눌러요.",
            link: {
              label: "커넥터 목록 열기",
              href: "https://claude.ai/customize/connectors",
            },
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
          {
            id: "vercel-connect",
            label: "커넥터 목록에서 Vercel을 연결하고 승인했어요",
          },
          {
            id: "vercel-verify",
            label: "확인 문장을 보냈더니 내 팀 이름이 나왔어요",
          },
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
        lead: [
          "버셀은 만든 앱을 인터넷 주소로 공개해 주는 곳이에요. 연결하면 {도구}가 배포하고, 오류 기록도 직접 확인해 줘요.",
        ],
        flow: [
          {
            text: "버셀에 가입해요",
            note: "[Continue with GitHub]로 가입하고, 요금제는 무료인 Hobby를 골라요.",
            link: {
              label: "가입 페이지 열기",
              href: "https://vercel.com/signup",
            },
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
          {
            id: "vercel-connect",
            label: "MCP servers에 Vercel을 추가하고 승인했어요",
          },
          {
            id: "vercel-verify",
            label: "확인 문장을 보냈더니 내 팀 이름이 나왔어요",
          },
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
    short: "첫 앱 만들기",
    title: "첫 앱을 만들어 봐요",
    logo: "tool",
    body: {
      lead: [
        "준비가 끝났어요. 같은 대화창에서 말로 앱을 만들고, 미리 보고, 인터넷에 공개해 봐요.",
      ],
      flow: [
        {
          text: "만들고 싶은 앱을 한 문장으로 말해요",
          note: "[ ] 안을 바꿔서 보내요. 예: 우리 반 자리 바꾸기 뽑기, 오늘의 칭찬 스티커판",
          copy: "[만들고 싶은 앱]을 간단한 웹앱으로 만들어 줘. 처음 해 보는 거라 무엇을 하는지 쉽게 설명해 주고, 다 만들면 미리 볼 수 있게 실행해 줘.",
        },
        {
          text: "{도구} 안의 브라우저에서 미리 봐요",
          note: '고치고 싶은 곳이 있으면 "버튼을 더 크게 해 줘"처럼 말로 부탁해요.',
        },
        {
          text: "깃허브에 올려요",
          copy: "지금까지 작업한 것 깃허브에 올려줘",
        },
        {
          text: "버셀로 공개하고 주소를 받아요",
          note: "학생 이름 같은 개인정보는 넣지 않은 앱만 공개해요.",
          copy: "이 프로젝트를 버셀에 배포하고, 다른 사람이 열 수 있는 주소를 알려 줘.",
        },
      ],
      links: [],
      checks: [
        { id: "start-ask", label: "만들고 싶은 앱을 {도구}에 말했어요" },
        { id: "start-preview", label: "미리 보기에서 내 앱이 보여요" },
        { id: "start-push", label: "깃허브에 올렸어요" },
        { id: "start-deploy", label: "버셀 주소로 내 앱이 열려요" },
      ],
      help: [
        {
          situation: "오류가 났어요",
          prompt:
            "방금 오류가 났어요. 오류 내용을 확인해서 원인을 쉽게 설명해 주고, 고쳐 줘. 고친 뒤에는 다시 미리 볼 수 있게 실행해 줘.",
        },
        {
          situation: "미리 보기가 안 보여요",
          prompt:
            "만든 앱을 미리 보고 싶은데 화면이 보이지 않아요. 앱을 실행해서 {도구} 안의 브라우저로 열어 주고, 안 되면 내가 어떤 주소를 열면 되는지 알려 줘.",
        },
        {
          situation: "배포 주소가 안 열려요",
          prompt:
            "버셀에 배포했는데 주소를 열면 오류가 나거나 빈 화면이 보여요. 버셀 배포 기록과 오류 내용을 확인해서 원인을 쉽게 설명하고 고쳐 줘.",
        },
      ],
    },
  },
]

/** 문구 속 {도구}를 고른 도구 이름(Claude Code·Codex)으로 바꿔요 */
function fillTool<T>(value: T, tool: Tool | null): T {
  const name = tool ? TOOL_NAME[tool] : "Claude Code·Codex"
  return JSON.parse(JSON.stringify(value).replaceAll("{도구}", name)) as T
}

export function bodyFor(step: Step, tool: Tool | null): StepBody | undefined {
  const body = step.body ?? (tool ? step.byTool?.[tool] : undefined)
  return body && fillTool(body, tool)
}

/** 단계 로고 파일 이름. 없으면 undefined */
export function logoFor(step: Step, tool: Tool | null): string | undefined {
  if (step.logo !== "tool") return step.logo
  return tool === "codex" ? "chatgpt" : tool === "claude" ? "claude" : undefined
}

export function titleFor(step: Step, tool: Tool | null): string {
  return fillTool(step.title, tool)
}
