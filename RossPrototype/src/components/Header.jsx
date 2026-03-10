import { useApp } from '../context/AppContext';
import { ChevronLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Header({ title, subtitle, showBack, backTo }) {
  const { currentUser } = useApp();
  const navigate = useNavigate();

  return (
    <header className="app-header">
      <div className="header-left">
        {showBack && (
          <button className="back-btn" onClick={() => (backTo ? navigate(backTo) : navigate(-1))}>
            <ChevronLeft size={24} />
          </button>
        )}
        <div>
          <h1 className="header-title">{title}</h1>
          {subtitle && <p className="header-subtitle">{subtitle}</p>}
        </div>
      </div>
      {currentUser && (
        <div className="header-user">
          <div className="user-avatar">{currentUser.displayName[0]}</div>
        </div>
      )}
    </header>
  );
}
