import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function SetupPage() {
  const { createInitialManager, apiError } = useApp();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (isSubmitting) return;

    if (pin !== confirmPin) {
      setError('PIN confirmation does not match.');
      return;
    }

    setIsSubmitting(true);
    const result = await createInitialManager({ displayName, username, pin });
    setIsSubmitting(false);

    if (!result.ok) {
      setError(result.error || 'Unable to create manager account.');
      return;
    }

    navigate('/dashboard', { replace: true });
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <div className="login-brand">
          <div className="login-logo">
            <ShieldCheck size={30} />
          </div>
          <h1>First-time Setup</h1>
          <p>Create the first manager account to unlock the system</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="displayName">Manager Name</label>
            <input
              id="displayName"
              type="text"
              value={displayName}
              onChange={(event) => {
                setDisplayName(event.target.value);
                setError('');
              }}
              placeholder="e.g. Jason"
              autoComplete="name"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(event) => {
                setUsername(event.target.value);
                setError('');
              }}
              placeholder="e.g. jason"
              autoComplete="username"
              disabled={isSubmitting}
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
              onChange={(event) => {
                setPin(event.target.value.replace(/\D/g, ''));
                setError('');
              }}
              placeholder="4-digit PIN"
              autoComplete="new-password"
              disabled={isSubmitting}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPin">Confirm PIN</label>
            <input
              id="confirmPin"
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={confirmPin}
              onChange={(event) => {
                setConfirmPin(event.target.value.replace(/\D/g, ''));
                setError('');
              }}
              placeholder="Re-enter PIN"
              autoComplete="new-password"
              disabled={isSubmitting}
            />
          </div>

          {(error || apiError) && <p className="form-error">{error || apiError}</p>}

          <button type="submit" className="btn btn-primary btn-full" disabled={isSubmitting}>
            {isSubmitting ? 'Creating Manager...' : 'Create Manager & Continue'}
          </button>
        </form>
      </div>
    </div>
  );
}
