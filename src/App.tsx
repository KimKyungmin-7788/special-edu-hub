import { useEffect } from "react"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { site } from "@/config/site"
import { Layout } from "@/components/layout/Layout"
import { Home } from "@/pages/Home"
import { AllApps } from "@/pages/AllApps"
import { SubjectApps } from "@/pages/SubjectApps"
import { WorkApps } from "@/pages/WorkApps"
import { AppDetail } from "@/pages/AppDetail"
import { ComingSoon } from "@/pages/ComingSoon"
import { NotFound } from "@/pages/NotFound"

function App() {
  useEffect(() => {
    document.title = site.name
  }, [])

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="apps" element={<AllApps />} />
          <Route path="apps/subject" element={<SubjectApps />} />
          <Route path="apps/subject/:categoryId" element={<SubjectApps />} />
          <Route path="apps/work" element={<WorkApps />} />
          <Route path="app/:id" element={<AppDetail />} />

          {/* 자리만 / 준비 중 */}
          <Route
            path="practices"
            element={<ComingSoon title="수업실천사례" />}
          />
          <Route path="board" element={<ComingSoon title="자유게시판" />} />
          <Route path="verify" element={<ComingSoon title="교사인증센터" />} />

          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
