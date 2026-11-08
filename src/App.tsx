import { BrowserRouter, Routes, Route, Navigate, useLocation, useParams } from "react-router-dom"
import { AuthProvider } from "@/lib/auth"
import { Layout } from "@/components/layout/Layout"
import { vibecoding } from "@/config/vibecoding"
import { seedling } from "@/config/seedling"
import { Home } from "@/pages/Home"
import { lazyPage } from "@/lib/lazyPage"

// 홈 말고는 그 페이지에 들어갈 때 내려받는다(첫 화면을 가볍게). 받는 동안·실패 시 화면은 Layout 이 맡는다.
const SubjectApps = lazyPage(() => import("@/pages/SubjectApps").then((m) => ({ default: m.SubjectApps })))
const WorkApps = lazyPage(() => import("@/pages/WorkApps").then((m) => ({ default: m.WorkApps })))
const LatestApps = lazyPage(() => import("@/pages/LatestApps").then((m) => ({ default: m.LatestApps })))
const SeedlingRoom = lazyPage(() => import("@/pages/SeedlingRoom").then((m) => ({ default: m.SeedlingRoom })))
const AppDetail = lazyPage(() => import("@/pages/AppDetail").then((m) => ({ default: m.AppDetail })))
const WritePage = lazyPage(() => import("@/pages/WritePage").then((m) => ({ default: m.WritePage })))
const EditPage = lazyPage(() => import("@/pages/EditPage").then((m) => ({ default: m.EditPage })))
const Privacy = lazyPage(() => import("@/pages/Privacy").then((m) => ({ default: m.Privacy })))
const Terms = lazyPage(() => import("@/pages/Terms").then((m) => ({ default: m.Terms })))
const Contact = lazyPage(() => import("@/pages/Contact").then((m) => ({ default: m.Contact })))
const About = lazyPage(() => import("@/pages/About").then((m) => ({ default: m.About })))
const Updates = lazyPage(() => import("@/pages/Updates").then((m) => ({ default: m.Updates })))
const Login = lazyPage(() => import("@/pages/Login").then((m) => ({ default: m.Login })))
const Signup = lazyPage(() => import("@/pages/Signup").then((m) => ({ default: m.Signup })))
const MyPage = lazyPage(() => import("@/pages/MyPage").then((m) => ({ default: m.MyPage })))
const VerifyPage = lazyPage(() => import("@/pages/VerifyPage").then((m) => ({ default: m.VerifyPage })))
const AdminPage = lazyPage(() => import("@/pages/AdminPage").then((m) => ({ default: m.AdminPage })))
const NotFound = lazyPage(() => import("@/pages/NotFound").then((m) => ({ default: m.NotFound })))
const PracticeList = lazyPage(() => import("@/pages/PracticeList").then((m) => ({ default: m.PracticeList })))
const PracticeDetail = lazyPage(() => import("@/pages/PracticeDetail").then((m) => ({ default: m.PracticeDetail })))
const PracticeWritePage = lazyPage(() => import("@/pages/PracticeWritePage").then((m) => ({ default: m.PracticeWritePage })))
const TrainingPage = lazyPage(() => import("@/pages/TrainingPage").then((m) => ({ default: m.TrainingPage })))
const TrainingShareList = lazyPage(() => import("@/components/training/TrainingShareList").then((m) => ({ default: m.TrainingShareList })))
const TrainingGuide = lazyPage(() => import("@/components/training/TrainingGuide").then((m) => ({ default: m.TrainingGuide })))
const VibeSetup = lazyPage(() => import("@/components/vibecoding/setup/VibeSetup").then((m) => ({ default: m.VibeSetup })))
const VibeWhy = lazyPage(() => import("@/components/vibecoding/why/VibeWhy").then((m) => ({ default: m.VibeWhy })))
const VibeSurvey = lazyPage(() => import("@/components/vibecoding/survey/VibeSurvey").then((m) => ({ default: m.VibeSurvey })))

const BoardLayout = lazyPage(() => import("@/pages/BoardLayout").then((m) => ({ default: m.BoardLayout })))
const BoardList = lazyPage(() => import("@/pages/BoardList").then((m) => ({ default: m.BoardList })))
const BoardDetail = lazyPage(() => import("@/pages/BoardDetail").then((m) => ({ default: m.BoardDetail })))
const BoardWritePage = lazyPage(() => import("@/pages/BoardWritePage").then((m) => ({ default: m.BoardWritePage })))

function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            {/* 전체(/apps)는 없앰 — 인기로 리다이렉트(옛 링크·뒤로가기 대비) */}
            <Route path="apps" element={<Navigate to="/apps/subject" replace />} />
            <Route path="apps/latest" element={<LatestApps />} />
            <Route path={seedling.path} element={<SeedlingRoom />} />
            <Route path="write/:categoryId" element={<WritePage />} />
            <Route path="edit/:appId" element={<EditPage />} />
            <Route path="apps/subject" element={<SubjectApps />} />
            <Route path="apps/subject/:categoryId" element={<SubjectApps />} />
            <Route path="apps/work" element={<WorkApps />} />
            <Route path="app/:id" element={<AppDetail />} />

            {/* 로그인 / 회원가입 (이메일+비번) */}
            <Route path="login" element={<Login />} />
            <Route path="signup" element={<Signup />} />
            <Route path="mypage" element={<MyPage />} />
            <Route path="admin" element={<AdminPage />} />

            {/* 수업실천사례 (PRD §13) */}
            <Route path="practices" element={<PracticeList />} />
            <Route path="practices/write" element={<PracticeWritePage />} />
            <Route path="practices/:id" element={<PracticeDetail />} />
            <Route path="practices/:id/edit" element={<PracticeWritePage />} />
            {/* 열린연수방: 단계 패널 + 연수 카드. 소개는 /training/guide, 기존 연수 주소는 유지.
                연수 쪽은 인증 교사만, 공개예정(status soon) 쪽은 라우트가 있어도 누구나 막힘(TrainingPage). 내용이 없는 쪽은 라우트 없음 */}
            <Route path="training" element={<TrainingPage />}>
              <Route index element={<TrainingShareList />} />
              <Route path="guide" element={<TrainingGuide />} />
              {/* 1. 특수교육 바이브코딩 기초 */}
              <Route path="vibecoding">
                <Route index element={<Navigate to="why" replace />} />
                <Route path="why" element={<VibeWhy />} />
              </Route>
              {/* 2. 에이전트 코딩의 환경구축 */}
              <Route path="agent">
                <Route index element={<Navigate to="setup" replace />} />
                <Route path="setup" element={<VibeSetup />} />
                <Route path="survey" element={<VibeSurvey />} />
              </Route>
              {/* 함께 여는 연수 — 회원이 올리는 연수 게시판(누구나 보고 인증 교사가 올림). 글 보기·쓰기는 게시판 화면을 같이 쓴다 */}
              <Route path="share">
                <Route index element={<TrainingShareList />} />
                <Route path="write" element={<BoardWritePage slug="training" />} />
                <Route path=":id" element={<BoardDetail />} />
                <Route path=":id/edit" element={<BoardWritePage slug="training" />} />
                <Route path=":id/slides" element={<VibeWhy />} />
              </Route>
            </Route>
            {/* 옛 주소(바이브코딩 메뉴 때·단독 튜토리얼을 넘겨주던 때) → 열린연수방의 같은 쪽으로 */}
            <Route path="vibecoding/*" element={<OldVibecodingRedirect />} />
            <Route path="vibe-setup/*" element={<Navigate to={vibecoding.setupPath} replace />} />

            {/* 자리만 / 준비 중 */}
            <Route path="board" element={<BoardLayout />}>
              <Route index element={<Navigate to="free" replace />} />
              <Route path="free" element={<BoardList slug="free" />} />
              <Route path="research" element={<BoardList slug="research" />} />
              <Route path="free/write" element={<BoardWritePage slug="free" />} />
              <Route path="research/write" element={<BoardWritePage slug="research" />} />
              <Route path="write" element={<Navigate to="/board/free/write" replace />} />
              <Route path=":id" element={<BoardDetail />} />
              <Route path=":id/edit" element={<BoardWritePage />} />
            </Route>
            <Route path="verify" element={<VerifyPage />} />

            {/* 정적·법적 페이지 (트랙 A) — 소개는 준비 중 */}
            <Route path="about" element={<About />} />
            <Route path="updates" element={<Updates />} />
            <Route path="privacy" element={<Privacy />} />
            <Route path="terms" element={<Terms />} />
            <Route path="contact" element={<Contact />} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}

/** 옛 주소 /vibecoding/<쪽> → 열린연수방의 같은 쪽(왜는 1, 환경구축·돌아보기는 2). ?p= ?step= 도 그대로 */
function OldVibecodingRedirect() {
  const { "*": rest } = useParams()
  const { search, hash } = useLocation()
  const to =
    rest === "setup" ? vibecoding.setupPath : rest === "survey" ? vibecoding.surveyPath : vibecoding.whyPath
  return <Navigate to={`${to}${search}${hash}`} replace />
}

export default App
