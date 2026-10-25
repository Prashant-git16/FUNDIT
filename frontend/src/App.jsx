import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import ProtectedRoute from './components/ProtectedRoute';

// Pages
import HomePage from './pages/HomePage';
import ExplorePage from './pages/ExplorePage';
import CampaignDetailPage from './pages/CampaignDetailPage';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import CompleteProfilePage from './pages/CompleteProfilePage';
import DashboardPage from './pages/DashboardPage';
import CreateCampaignPage from './pages/CreateCampaignPage';
import AdminPage from './pages/AdminPage';
import AboutPage from './pages/AboutPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import NotFoundPage from './pages/NotFoundPage';

// Pages that use their own full-screen layout (no shared navbar/footer)
const FULL_SCREEN_PATHS = ['/login', '/signup'];

function Layout({ children }) {
  return (
    <>
      <Navbar />
      <main style={{ minHeight: 'calc(100vh - var(--nav-height))' }}>
        {children}
      </main>
      <Footer />
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Auth pages — now with shared navbar and footer */}
          <Route path="/login"  element={<Layout><LoginPage /></Layout>} />
          <Route path="/signup" element={<Layout><SignupPage /></Layout>} />
          <Route path="/complete-profile" element={
            <Layout>
              <ProtectedRoute>
                <CompleteProfilePage />
              </ProtectedRoute>
            </Layout>
          } />

          {/* All other pages — with shared navbar and footer */}
          <Route path="/" element={
            <Layout>
              <HomePage />
            </Layout>
          } />
          <Route path="/explore" element={
            <Layout>
              <ExplorePage />
            </Layout>
          } />
          <Route path="/campaign/:id" element={
            <Layout>
              <CampaignDetailPage />
            </Layout>
          } />
          <Route path="/campaign/:id/edit" element={
            <Layout>
              <ProtectedRoute>
                <CreateCampaignPage />
              </ProtectedRoute>
            </Layout>
          } />
          <Route path="/create-campaign" element={
            <Layout>
              <ProtectedRoute>
                <CreateCampaignPage />
              </ProtectedRoute>
            </Layout>
          } />
          <Route path="/dashboard" element={
            <Layout>
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            </Layout>
          } />
          <Route path="/admin" element={
            <Layout>
              <ProtectedRoute role="admin">
                <AdminPage />
              </ProtectedRoute>
            </Layout>
          } />
          <Route path="/about"   element={<Layout><AboutPage /></Layout>} />
          <Route path="/privacy" element={<Layout><PrivacyPage /></Layout>} />
          <Route path="/terms"   element={<Layout><TermsPage /></Layout>} />
          <Route path="/contact" element={<Layout><AboutPage /></Layout>} />
          <Route path="*"        element={<Layout><NotFoundPage /></Layout>} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
