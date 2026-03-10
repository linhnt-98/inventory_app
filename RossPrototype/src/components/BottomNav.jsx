import { useApp } from '../context/AppContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { Warehouse, Package, ClipboardList, Settings, LogOut } from 'lucide-react';

export default function BottomNav() {
  const { currentUser, logout } = useApp();
  const location = useLocation();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const tabs = [
    { path: '/dashboard', icon: Warehouse, label: 'Warehouses' },
    { path: '/stock', icon: Package, label: 'Stock' },
    { path: '/history', icon: ClipboardList, label: 'History' },
  ];

  if (currentUser.role === 'manager') {
    tabs.push({ path: '/manage', icon: Settings, label: 'Manage' });
  }

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const isActive =
          location.pathname === tab.path ||
          (tab.path === '/stock' && location.pathname.startsWith('/stock'));
        return (
          <button
            key={tab.path}
            className={`bottom-nav-item ${isActive ? 'active' : ''}`}
            onClick={() => navigate(tab.path)}
          >
            <tab.icon size={22} />
            <span>{tab.label}</span>
          </button>
        );
      })}
      <button className="bottom-nav-item logout-btn" onClick={handleLogout}>
        <LogOut size={22} />
        <span>Logout</span>
      </button>
    </nav>
  );
}
