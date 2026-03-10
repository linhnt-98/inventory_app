import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider, useApp } from './context/AppContext';
import BottomNav from './components/BottomNav';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import StockPage from './pages/StockPage';
import HistoryPage from './pages/HistoryPage';
import ManagePage from './pages/ManagePage';
import './App.css';

function ProtectedRoute({ children }) {
  const { currentUser } = useApp();
  if (!currentUser) return <Navigate to="/" replace />;
  return children;
}

function AppRoutes() {
  const { currentUser } = useApp();

  return (
    <>
      <Routes>
        <Route path="/" element={currentUser ? <Navigate to="/dashboard" replace /> : <LoginPage />} />
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
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {currentUser && <BottomNav />}
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
