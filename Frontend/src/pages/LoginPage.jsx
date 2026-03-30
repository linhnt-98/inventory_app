import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Leaf } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function LoginPage() {
  const { login, apiError, isInitializing } = useApp();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting || isInitializing) return;

    setError('');
    setIsSubmitting(true);
    try {
      const success = await login(username.trim(), pin.trim());
      if (success) {
        navigate('/dashboard');
        return;
      }
      setError('Invalid username or PIN');
      setPin('');
    } finally {
      setIsSubmitting(false);
    }
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
              onChange={(e) => {
                setUsername(e.target.value);
                setError('');
              }}
              placeholder="Enter username"
              autoComplete="username"
              disabled={isSubmitting || isInitializing}
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
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ''));
                setError('');
              }}
              placeholder="4-digit PIN"
              autoComplete="current-password"
              disabled={isSubmitting || isInitializing}
            />
          </div>

          {(error || apiError) && <p className="form-error">{error || apiError}</p>}

          <button
            type="submit"
            className="btn btn-primary btn-full"
            disabled={isSubmitting || isInitializing || !username.trim() || pin.length !== 4}
          >
            {isSubmitting ? 'Logging in...' : 'Log In'}
          </button>
        </form>
      </div>
    </div>
  );
}
