import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { RequireIdCardAccess } from './components/auth/RequireIdCardAccess';
import LoginPage from './pages/LoginPage';
import AuthCallbackPage from './pages/AuthCallbackPage';
import IdCardProjectsPage from './pages/admin/idcard/IdCardProjectsPage';
import IdCardProjectPage from './pages/admin/idcard/IdCardProjectPage';
import IdCardOverviewPage from './pages/admin/idcard/IdCardOverviewPage';
import IdCardPersonsPage from './pages/admin/idcard/IdCardPersonsPage';
import IdCardTemplatePage from './pages/admin/idcard/IdCardTemplatePage';
import IdCardPreviewPage from './pages/admin/idcard/IdCardPreviewPage';
import IdCardGeneratePage from './pages/admin/idcard/IdCardGeneratePage';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />

          <Route
            path="/admin/id-cards"
            element={
              <RequireIdCardAccess>
                <IdCardProjectsPage />
              </RequireIdCardAccess>
            }
          />

          <Route
            path="/admin/id-cards/:projectId"
            element={
              <RequireIdCardAccess>
                <IdCardProjectPage />
              </RequireIdCardAccess>
            }
          >
            <Route index element={<IdCardOverviewPage />} />
            <Route path="persons" element={<IdCardPersonsPage />} />
            <Route path="template" element={<IdCardTemplatePage />} />
            <Route path="preview" element={<IdCardPreviewPage />} />
            <Route path="generate" element={<IdCardGeneratePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
