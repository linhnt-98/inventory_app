import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Leaf } from 'lucide-react';

export default function LoginPage() {
  const { login, users } = useApp();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showQuickLogin, setShowQuickLogin] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    const success = login(username, pin);
    if (success) {
      navigate('/dashboard');
    } else {
      setError('Invalid username or PIN');
      setPin('');
    }
  };

  const handleQuickLogin = (user) => {
    const success = login(user.username, user.pin);
    if (success) navigate('/dashboard');
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">
            <Leaf size={32} />
          </div>
          <h1>Jason's Tea Shop</h1>
          <p>Warehouse Inventory</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => { setUsername(e.target.value); setError(''); }}
              placeholder="Enter username"
              autoComplete="username"
            />
          </div>
          <div className="form-group">
            <label htmlFor="pin">PIN</label>
            <input
              id="pin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={pin}
              onChange={(e) => { setPin(e.target.value.replace(/\D/g, '')); setError(''); }}
              placeholder="4-digit PIN"
              autoComplete="current-password"
            />
          </div>
          {error && <p className="form-error">{error}</p>}
          <button type="submit" className="btn btn-primary btn-full">
            Log In
          </button>
        </form>

        {/* Quick login for prototype */}
        <div className="quick-login">
          <button
            className="quick-login-toggle"
            onClick={() => setShowQuickLogin(!showQuickLogin)}
          >
            {showQuickLogin ? 'Hide' : 'Show'} quick login (prototype only)
          </button>
          {showQuickLogin && (
            <div className="quick-login-users">
              {users.map((user) => (
                <button
                  key={user.id}
                  className="quick-login-btn"
                  onClick={() => handleQuickLogin(user)}
                >
                  <span className="quick-login-avatar">{user.displayName[0]}</span>
                  <span className="quick-login-info">
                    <strong>{user.displayName}</strong>
                    <small>{user.role}</small>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
