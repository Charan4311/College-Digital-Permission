import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LuLock as Lock,
  LuUser as User,
  LuArrowRight as ArrowRight,
  LuSparkles as Sparkles
} from 'react-icons/lu';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';

const ROLE_REDIRECTS = {
  STUDENT: '/student/dashboard',
  CTPO: '/ctpo/dashboard',
  HOD: '/hod/dashboard',
  HOSTEL_INCHARGE: '/hostel/dashboard',
  PLACEMENT_OFFICER: '/placement/dashboard',
  SECURITY: '/security/scanner',
  ADMIN: '/admin/dashboard',
};

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!username || !password) {
      setError('Please provide both username and password.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      const user = await login(username, password);
      navigate(ROLE_REDIRECTS[user.role] || '/student/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page auth-page">
      <div className="login-card auth-card">
        <div className="login-logo auth-card-header">
          <div className="auth-brand-mark">
            <Sparkles size={26} />
          </div>
          <h1 className="auth-title">
            College Digital Permission & Approval Platform
          </h1>
          <p className="auth-subtitle">
            Sign in with your institutional credentials or Roll Number
          </p>
        </div>

        {error && (
          <div className="alert alert-error auth-alert">
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group auth-field">
            <label className="form-label auth-label">
              <User size={14} color="var(--accent)" />
              <span>Username / Roll Number</span>
            </label>
            <Input
              type="text"
              required
              autoFocus
              className="form-input"
              placeholder="e.g. 23B21A4268 or 4ktcsm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="form-group auth-field auth-field-last">
            <label className="form-label auth-label">
              <Lock size={14} color="var(--accent)" />
              <span>Password</span>
            </label>
            <Input
              type="password"
              required
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-full"
          >
            {loading ? (
              <>
                <span className="spinner" style={{ width: 16, height: 16 }} />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <ArrowRight size={16} />
              </>
            )}
          </Button>
        </form>
      </div>
    </div>
  );
}
