import { lazy, Suspense, useEffect } from 'react';
import { Route, Routes, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Loading, NotFound } from './components/States';
import { AboutPage } from './pages/AboutPage';
import { AccountPage } from './pages/AccountPage';
import { ChapterPage } from './pages/ChapterPage';
import { CoveragePage } from './pages/CoveragePage';
import { ExamPage } from './pages/ExamPage';
import { HomePage } from './pages/HomePage';
import { LoginPage, RegisterPage } from './pages/AuthPages';
import { PaperListPage } from './pages/PaperListPage';
import { PaperPage } from './pages/PaperPage';
import { PracticePage } from './pages/PracticePage';
import { PrintChapterPage, PrintPaperPage } from './pages/PrintPages';
import { QuestionPage } from './pages/QuestionPage';
import { SearchPage } from './pages/SearchPage';
import { SubjectPage } from './pages/SubjectPage';
import { TestPage } from './pages/TestPage';

const AdminApp = lazy(() => import('./pages/admin/AdminApp'));

function ScrollToTop() {
  const { pathname, search } = useLocation();
  useEffect(() => {
    if (!window.location.hash) window.scrollTo(0, 0);
  }, [pathname, search]);
  return null;
}

export function App() {
  const loc = useLocation();
  if (loc.pathname.startsWith('/print/')) {
    return (
      <Routes>
        <Route path="/print/chapter/:exam/:subject/:chapter" element={<PrintChapterPage />} />
        <Route path="/print/paper/:paperId" element={<PrintPaperPage />} />
        <Route path="*" element={<div data-print-state="notfound">Not found</div>} />
      </Routes>
    );
  }
  return (
    <Layout>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/past-years/year-wise/:category/:exam" element={<PaperListPage />} />
        <Route path="/past-years/year-wise/:category/:exam/:paperSlug/:paperId" element={<PaperPage />} />
        <Route path="/past-years/:category/:exam" element={<ExamPage />} />
        <Route path="/past-years/:category/:exam/:subject" element={<SubjectPage />} />
        <Route path="/past-years/:category/:exam/:subject/:chapter" element={<ChapterPage />} />
        <Route path="/question/:publicId" element={<QuestionPage />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/practice" element={<PracticePage />} />
        <Route path="/test/paper/:paperId" element={<TestPage mode="paper" />} />
        <Route path="/test/custom" element={<TestPage mode="custom" />} />
        <Route path="/test/attempt/:attemptId" element={<TestPage mode="review" />} />
        <Route path="/coverage" element={<CoveragePage />} />
        <Route path="/about" element={<AboutPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/account" element={<AccountPage />} />
        <Route path="/account/:tab" element={<AccountPage />} />
        <Route path="/admin/*" element={<Suspense fallback={<Loading />}><AdminApp /></Suspense>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Layout>
  );
}
