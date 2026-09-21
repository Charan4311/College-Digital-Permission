import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  User,
  ArrowRight,
  Sparkles
} from 'lucide-react';

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
    <div className="login-page" style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', background: '#faf5ff' }}>
      <div className="login-card" style={{ maxWidth: '440px', width: '100%', background: '#ffffff', borderRadius: '16px', border: '1px solid #e9d5ff', boxShadow: '0 4px 20px rgba(124, 58, 237, 0.08)', padding: '36px' }}>
        <div className="login-logo" style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '52px',
            height: '52px',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, #7c3aed, #9333ea)',
            boxShadow: '0 8px 24px rgba(124, 58, 237, 0.25)',
            marginBottom: '16px',
            color: '#fff'
          }}>
            <Sparkles size={26} />
          </div>
          <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 6px 0', color: '#0f172a', letterSpacing: '-0.3px', lineHeight: 1.3, textTransform: 'uppercase' }}>
            College Digital Permission & Approval Platform
          </h1>
          <p style={{ color: '#64748b', fontSize: '13px', margin: 0, fontWeight: 500 }}>
            Sign in with your institutional credentials or Roll Number
          </p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '18px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              <User size={14} color="var(--accent)" />
              <span>Username / Roll Number</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              className="form-input"
              placeholder="e.g. 23B21A4268 or 4ktcsm"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '24px' }}>
            <label className="form-label" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: 600, color: '#334155' }}>
              <Lock size={14} color="var(--accent)" />
              <span>Password</span>
            </label>
            <input
              type="password"
              required
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary btn-full"
            style={{ padding: '12px 16px', fontSize: '15px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
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
          </button>
        </form>
      </div>
    </div>
  );
}
