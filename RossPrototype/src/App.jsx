import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import BottomNav from './components/BottomNav';
import LoginPage from './pages/LoginPage';
import SetupPage from './pages/SetupPage';
import DashboardPage from './pages/DashboardPage';
import StockPage from './pages/StockPage';
import HistoryPage from './pages/HistoryPage';
import ManagePage from './pages/ManagePage';
import './App.css';

function ProtectedRoute({ children }) {
  const { currentUser, bootstrapRequired } = useApp();
  if (bootstrapRequired) return <Navigate to="/setup" replace />;
  if (!currentUser) return <Navigate to="/" replace />;
  return children;
}

function SetupRoute({ children }) {
  const { bootstrapRequired, currentUser } = useApp();
  if (!bootstrapRequired) {
    return <Navigate to={currentUser ? '/dashboard' : '/'} replace />;
  }
  return children;
}

function AppRoutes() {
  const { currentUser, bootstrapRequired } = useApp();

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            bootstrapRequired
              ? <Navigate to="/setup" replace />
              : currentUser
                ? <Navigate to="/dashboard" replace />
                : <LoginPage />
          }
        />
        <Route
          path="/setup"
          element={
            <SetupRoute>
              <SetupPage />
            </SetupRoute>
          }
        />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/stock"
          element={
            <ProtectedRoute>
              <StockPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/history"
          element={
            <ProtectedRoute>
              <HistoryPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/manage"
          element={
            <ProtectedRoute>
              <ManagePage />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to={bootstrapRequired ? '/setup' : '/'} replace />} />
      </Routes>
      {currentUser && !bootstrapRequired && <BottomNav />}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRoutes />
      </AppProvider>
    </BrowserRouter>
  );
}
