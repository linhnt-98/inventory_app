import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { Leaf, X } from 'lucide-react';

export default function LoginPage() {
  const { login, register, resetPin, users } = useApp();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [showQuickLogin, setShowQuickLogin] = useState(true);

  // Modal state: null | 'signup' | 'forgot'
  const [modal, setModal] = useState(null);

  // Sign Up form state
  const [signupData, setSignupData] = useState({ displayName: '', username: '', role: 'staff', pin: '', confirmPin: '' });
  const [signupError, setSignupError] = useState('');
  const [signupSuccess, setSignupSuccess] = useState(false);

  // Forgot PIN form state
  const [forgotData, setForgotData] = useState({ username: '', pin: '', confirmPin: '' });
  const [forgotError, setForgotError] = useState('');
  const [forgotSuccess, setForgotSuccess] = useState(false);

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

  const openModal = (type) => {
    setModal(type);
    setSignupData({ displayName: '', username: '', role: 'staff', pin: '', confirmPin: '' });
    setSignupError('');
    setSignupSuccess(false);
    setForgotData({ username: '', pin: '', confirmPin: '' });
    setForgotError('');
    setForgotSuccess(false);
  };

  const closeModal = () => setModal(null);

  const handleSignup = (e) => {
    e.preventDefault();
    const { displayName, username: su, role, pin: sp, confirmPin } = signupData;
    if (!displayName.trim()) return setSignupError('Display name is required.');
    if (!su.trim()) return setSignupError('Username is required.');
    if (users.find((u) => u.username === su.trim())) return setSignupError('Username already taken.');
    if (sp.length !== 4) return setSignupError('PIN must be 4 digits.');
    if (sp !== confirmPin) return setSignupError('PINs do not match.');
    register({ displayName: displayName.trim(), username: su.trim(), role, pin: sp });
    setSignupSuccess(true);
    setSignupError('');
  };

  const handleForgotPin = (e) => {
    e.preventDefault();
    const { username: fu, pin: fp, confirmPin } = forgotData;
    if (!fu.trim()) return setForgotError('Username is required.');
    if (!users.find((u) => u.username === fu.trim())) return setForgotError('Username not found.');
    if (fp.length !== 4) return setForgotError('New PIN must be 4 digits.');
    if (fp !== confirmPin) return setForgotError('PINs do not match.');
    resetPin(fu.trim(), fp);
    setForgotSuccess(true);
    setForgotError('');
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

        <div className="login-links">
          <button className="login-link-btn" onClick={() => openModal('forgot')}>
            Forgot PIN?
          </button>
          <button className="login-link-btn" onClick={() => openModal('signup')}>
            Sign Up
          </button>
        </div>

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

      {/* Sign Up Modal */}
      {modal === 'signup' && (
        <div className="auth-modal-overlay" onClick={closeModal}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <div className="auth-modal-header">
              <h2>Create Account</h2>
              <button className="auth-modal-close" onClick={closeModal}><X size={20} /></button>
            </div>
            {signupSuccess ? (
              <div className="auth-modal-success">
                <p>Account created successfully!</p>
                <p className="auth-modal-success-sub">You can now log in with your credentials.</p>
                <button className="btn btn-primary btn-full" onClick={closeModal}>Back to Login</button>
              </div>
            ) : (
              <form onSubmit={handleSignup} className="login-form">
                <div className="form-group">
                  <label>Display Name</label>
                  <input
                    type="text"
                    value={signupData.displayName}
                    onChange={(e) => { setSignupData({ ...signupData, displayName: e.target.value }); setSignupError(''); }}
                    placeholder="Your full name"
                  />
                </div>
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={signupData.username}
                    onChange={(e) => { setSignupData({ ...signupData, username: e.target.value }); setSignupError(''); }}
                    placeholder="Choose a username"
                  />
                </div>
                <div className="form-group">
                  <label>Role</label>
                  <select
                    value={signupData.role}
                    onChange={(e) => setSignupData({ ...signupData, role: e.target.value })}
                    className="form-select"
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={signupData.pin}
                    onChange={(e) => { setSignupData({ ...signupData, pin: e.target.value.replace(/\D/g, '') }); setSignupError(''); }}
                    placeholder="4-digit PIN"
                  />
                </div>
                <div className="form-group">
                  <label>Confirm PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={signupData.confirmPin}
                    onChange={(e) => { setSignupData({ ...signupData, confirmPin: e.target.value.replace(/\D/g, '') }); setSignupError(''); }}
                    placeholder="Re-enter PIN"
                  />
                </div>
                {signupError && <p className="form-error">{signupError}</p>}
                <button type="submit" className="btn btn-primary btn-full">Create Account</button>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Forgot PIN Modal */}
      {modal === 'forgot' && (
        <div className="auth-modal-overlay" onClick={closeModal}>
          <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
            <div className="auth-modal-header">
              <h2>Reset PIN</h2>
              <button className="auth-modal-close" onClick={closeModal}><X size={20} /></button>
            </div>
            {forgotSuccess ? (
              <div className="auth-modal-success">
                <p>PIN reset successfully!</p>
                <p className="auth-modal-success-sub">You can now log in with your new PIN.</p>
                <button className="btn btn-primary btn-full" onClick={closeModal}>Back to Login</button>
              </div>
            ) : (
              <form onSubmit={handleForgotPin} className="login-form">
                <div className="form-group">
                  <label>Username</label>
                  <input
                    type="text"
                    value={forgotData.username}
                    onChange={(e) => { setForgotData({ ...forgotData, username: e.target.value }); setForgotError(''); }}
                    placeholder="Enter your username"
                  />
                </div>
                <div className="form-group">
                  <label>New PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={forgotData.pin}
                    onChange={(e) => { setForgotData({ ...forgotData, pin: e.target.value.replace(/\D/g, '') }); setForgotError(''); }}
                    placeholder="4-digit PIN"
                  />
                </div>
                <div className="form-group">
                  <label>Confirm New PIN</label>
                  <input
                    type="password"
                    inputMode="numeric"
                    maxLength={4}
                    value={forgotData.confirmPin}
                    onChange={(e) => { setForgotData({ ...forgotData, confirmPin: e.target.value.replace(/\D/g, '') }); setForgotError(''); }}
                    placeholder="Re-enter new PIN"
                  />
                </div>
                {forgotError && <p className="form-error">{forgotError}</p>}
                <button type="submit" className="btn btn-primary btn-full">Reset PIN</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
