import { lazy } from "react"
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { AuthProvider } from "@/lib/auth"
import { Layout } from "@/components/layout/Layout"
import { vibecoding, vibecodingPath } from "@/config/vibecoding"
import { Home } from "@/pages/Home"

// 홈 말고는 그 페이지에 들어갈 때 내려받는다(첫 화면을 가볍게). 받는 동안·실패 시 화면은 Layout 이 맡는다.
const SubjectApps = lazy(() => import("@/pages/SubjectApps").then((m) => ({ default: m.SubjectApps })))
const WorkApps = lazy(() => import("@/pages/WorkApps").then((m) => ({ default: m.WorkApps })))
const LatestApps = lazy(() => import("@/pages/LatestApps").then((m) => ({ default: m.LatestApps })))
const AppDetail = lazy(() => import("@/pages/AppDetail").then((m) => ({ default: m.AppDetail })))
const WritePage = lazy(() => import("@/pages/WritePage").then((m) => ({ default: m.WritePage })))
const EditPage = lazy(() => import("@/pages/EditPage").then((m) => ({ default: m.EditPage })))
const Privacy = lazy(() => import("@/pages/Privacy").then((m) => ({ default: m.Privacy })))
const Terms = lazy(() => import("@/pages/Terms").then((m) => ({ default: m.Terms })))
const Contact = lazy(() => import("@/pages/Contact").then((m) => ({ default: m.Contact })))
const ComingSoon = lazy(() => import("@/pages/ComingSoon").then((m) => ({ default: m.ComingSoon })))
const Login = lazy(() => import("@/pages/Login").then((m) => ({ default: m.Login })))
const Signup = lazy(() => import("@/pages/Signup").then((m) => ({ default: m.Signup })))
const MyPage = lazy(() => import("@/pages/MyPage").then((m) => ({ default: m.MyPage })))
const VerifyPage = lazy(() => import("@/pages/VerifyPage").then((m) => ({ default: m.VerifyPage })))
const AdminPage = lazy(() => import("@/pages/AdminPage").then((m) => ({ default: m.AdminPage })))
const NotFound = lazy(() => import("@/pages/NotFound").then((m) => ({ default: m.NotFound })))
const PracticeList = lazy(() => import("@/pages/PracticeList").then((m) => ({ default: m.PracticeList })))
const PracticeDetail = lazy(() => import("@/pages/PracticeDetail").then((m) => ({ default: m.PracticeDetail })))
const PracticeWritePage = lazy(() => import("@/pages/PracticeWritePage").then((m) => ({ default: m.PracticeWritePage })))
const VibecodingPage = lazy(() => import("@/pages/VibecodingPage").then((m) => ({ default: m.VibecodingPage })))
const VibeSetup = lazy(() => import("@/components/vibecoding/setup/VibeSetup").then((m) => ({ default: m.VibeSetup })))
const VibeWhy = lazy(() => import("@/components/vibecoding/why/VibeWhy").then((m) => ({ default: m.VibeWhy })))
const VibeSurvey = lazy(() => import("@/components/vibecoding/survey/VibeSurvey").then((m) => ({ default: m.VibeSurvey })))

const BoardLayout = lazy(() => import("@/pages/BoardLayout").then((m) => ({ default: m.BoardLayout })))
const BoardList = lazy(() => import("@/pages/BoardList").then((m) => ({ default: m.BoardList })))
const BoardDetail = lazy(() => import("@/pages/BoardDetail").then((m) => ({ default: m.BoardDetail })))
const BoardWritePage = lazy(() => import("@/pages/BoardWritePage").then((m) => ({ default: m.BoardWritePage })))

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
            {/* 바이브코딩: 오른쪽 사이드바 + 하위 페이지. /vibecoding 은 첫 하위 페이지로 */}
            <Route path="vibecoding" element={<VibecodingPage />}>
              <Route
                index
                element={<Navigate to={vibecodingPath(vibecoding.pages[0].slug)} replace />}
              />
              <Route path="why" element={<VibeWhy />} />
              <Route path="setup" element={<VibeSetup />} />
              <Route path="survey" element={<VibeSurvey />} />
            </Route>
            {/* 옛 주소(단독 튜토리얼을 넘겨주던 때) → 허브 하위 페이지로 */}
            <Route path="vibe-setup/*" element={<Navigate to={vibecodingPath("setup")} replace />} />

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
            <Route path="about" element={<ComingSoon title="소개" />} />
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

export default App
