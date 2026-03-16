import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Leaf } from 'lucide-react';
import { useApp } from '../context/AppContext';

export default function SetupPage() {
  const { createInitialManager, users } = useApp();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (event) => {
    event.preventDefault();

    if (pin !== confirmPin) {
      setError('PIN confirmation does not match.');
      return;
    }

    const result = createInitialManager({
      displayName,
      username,
      pin,
    });

    if (!result.ok) {
      setError(result.error || 'Unable to create manager account.');
      return;
    }

    navigate('/dashboard', { replace: true });
  };

  const employeeCount = users.filter((user) => user.role === 'employee').length;

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
            />
          </div>

          {error && <p className="form-error">{error}</p>}

          <button type="submit" className="btn btn-primary btn-full">
            Create Manager & Continue
          </button>
        </form>

        <div className="quick-login" style={{ marginTop: 20 }}>
          <div className="quick-login-info" style={{ alignItems: 'center' }}>
            <strong style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Leaf size={14} /> Demo bootstrapping enabled
            </strong>
            <small>{employeeCount} employee account(s) are pre-seeded in this prototype.</small>
          </div>
        </div>
      </div>
    </div>
  );
}
