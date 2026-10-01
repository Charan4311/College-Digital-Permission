import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  Lock,
  User,
  ArrowRight,
  Eye,
  EyeOff,
  ShieldCheck,
  Users,
  Clock
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

/* Change these two lines to swap or reposition the photo */
const BG_IMAGE = '/campus.jpg';
const BG_POSITION = 'center bottom';

/* Card logo: shows only the "KiET" wordmark and hides the small college-name line under it.
   Values are % of the logo image height. If a sliver of the small text still shows, lower
   LOGO_KEEP by 2 to 3. If the top of the wordmark is cut, lower LOGO_TOP. */
const LOGO_ASPECT = 1.35; /* image width / height */
const LOGO_TOP = 4;       /* % skipped from the top */
const LOGO_KEEP = 56;     /* % of the image height that stays visible */

/*
  Every size below is written for a 1600 x 900 screen (the target image) and
  scaled by --s, so the whole page shrinks or grows to always fit the window.
  u(34)      -> 34 units scaled
  uf(34, 26) -> 34 units scaled, but never smaller than 26px
*/
const u = (n) => `calc(var(--s) * ${n})`;
const uf = (n, min) => `max(${min}px, calc(var(--s) * ${n}))`;

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
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
    <div
      className="login-page-container"
      style={{
        minHeight: '100vh',
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        fontFamily: "'Inter', 'Manrope', sans-serif",
        overflowX: 'hidden',
        background: '#d1fae5'
      }}
    >
      {/* Background photo + light sky wash */}
      <div style={{ position: 'fixed', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div
          style={{
            position: 'absolute',
            inset: 0,
            backgroundImage: `url("${BG_IMAGE}")`,
            backgroundSize: 'cover',
            backgroundPosition: BG_POSITION,
            backgroundRepeat: 'no-repeat',
            filter: 'saturate(1.15) brightness(1.04)'
          }}
        />
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background: `
              linear-gradient(180deg, rgba(191,226,255,0.70) 0%, rgba(214,236,255,0.40) 32%, rgba(255,255,255,0) 62%),
              radial-gradient(ellipse 55% 50% at 22% 38%, rgba(255,255,255,0.62) 0%, rgba(255,255,255,0) 100%),
              radial-gradient(circle at 100% 8%, rgba(125,211,252,0.35) 0%, rgba(125,211,252,0) 40%),
              radial-gradient(ellipse 34% 62% at 79% 54%, rgba(150,236,230,0.42) 0%, rgba(150,236,230,0) 100%),
              radial-gradient(circle at 96% 72%, rgba(94,234,212,0.30) 0%, rgba(94,234,212,0) 45%)
            `
          }}
        />
        <div style={{ position: 'absolute', top: '-22vh', left: '-16vw', width: '52vw', height: '66vh', borderRadius: '50%', background: 'rgba(255,255,255,0.14)', border: '1px solid rgba(255,255,255,0.7)' }} />
        <div style={{ position: 'absolute', top: '-8vh', left: '36vw', width: '46vw', height: '120vh', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.55)' }} />
        <div style={{ position: 'absolute', bottom: '-46vh', right: '-14vw', width: '62vw', height: '100vh', borderRadius: '50%', border: '1px solid rgba(255,255,255,0.5)' }} />
        <div style={{ position: 'absolute', top: '9vh', left: '-7vw', width: '17vw', height: '38vh', borderRadius: '50%', background: 'linear-gradient(135deg, rgba(255,255,255,0.38) 0%, rgba(160,225,240,0.20) 100%)', border: '1.5px solid rgba(255,255,255,0.75)' }} />
        <div style={{ position: 'absolute', top: '2vh', left: '30vw', width: '44vw', height: '76vh', borderRadius: '50%', transform: 'rotate(-14deg)', background: 'linear-gradient(120deg, rgba(150,225,240,0.26) 0%, rgba(255,255,255,0) 72%)', borderRight: '1px solid rgba(255,255,255,0.65)' }} />
      </div>

      {/* ───────── Header ─────────
          The glass is a separate layer under the content so the logo can blend
          with it (this is what removes the white box around the logo). */}
      <header
        className="lp-header"
        style={{
          position: 'relative',
          margin: `${u(24)} 3.75vw 0`,
          minHeight: uf(82, 64)
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: uf(26, 18),
            background: 'linear-gradient(90deg, rgba(255,255,255,0.60) 0%, rgba(240,251,253,0.40) 55%, rgba(255,255,255,0.50) 100%)',
            backdropFilter: 'blur(26px) saturate(140%) brightness(1.08)',
            WebkitBackdropFilter: 'blur(26px) saturate(140%) brightness(1.08)',
            border: '1.5px solid rgba(255,255,255,0.85)',
            boxShadow: '0 12px 34px rgba(40,110,140,0.10), 0 0 0 1px rgba(255,255,255,0.30), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 0 26px rgba(255,255,255,0.28)'
          }}
        />
        <div
          className="lp-header-inner"
          style={{
            position: 'relative',
            minHeight: uf(82, 64),
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '16px',
            padding: `0 ${u(36)}`,
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: u(16), minWidth: 0 }}>
            <img
              src="/kiet_logo.jpg"
              alt="KIET Logo"
              style={{ height: uf(56, 40), objectFit: 'contain', mixBlendMode: 'multiply' }}
            />
            <div
              className="hide-on-mobile"
              style={{ display: 'flex', flexDirection: 'column', color: '#1e293b', fontWeight: 500, fontSize: uf(13.5, 11), lineHeight: 1.35, letterSpacing: '0.2px' }}
            >
              <span>KAKINADA INSTITUTE OF</span>
              <span>ENGINEERING &amp; TECHNOLOGY</span>
            </div>
          </div>

          <div
            className="hide-on-mobile"
            style={{ display: 'flex', alignItems: 'center', gap: u(24), color: '#1e293b', fontSize: uf(13.5, 11), fontWeight: 500 }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: u(10) }}>
              <ShieldCheck size={24} strokeWidth={1.4} /> <span>Secure</span>
            </div>
            <div style={{ width: '1px', height: '24px', background: 'rgba(15,23,42,0.22)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: u(10) }}>
              <Users size={24} strokeWidth={1.4} /> <span>Student Friendly</span>
            </div>
            <div style={{ width: '1px', height: '24px', background: 'rgba(15,23,42,0.22)' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: u(10) }}>
              <Clock size={24} strokeWidth={1.4} /> <span>Digital &amp; Transparent</span>
            </div>
          </div>
        </div>
      </header>

      {/* ───────── Main ───────── */}
      <main
        className="lp-main"
        style={{
          position: 'relative',
          flex: 1,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          gap: '3vw',
          padding: `${u(44)} 4.8vw ${u(36)} 12.8vw`,
          boxSizing: 'border-box'
        }}
      >
        {/* Hero */}
        <div
          className="lp-hero"
          style={{
            flex: '1 1 0',
            minWidth: 0,
            maxWidth: u(640),
            marginTop: u(28),
            textShadow: '0 1px 14px rgba(255,255,255,0.85)'
          }}
        >
          <div
            style={{
              fontSize: uf(11, 10),
              fontWeight: 600,
              letterSpacing: '0.28em',
              color: '#1e293b',
              textTransform: 'uppercase',
              lineHeight: 1.5
            }}
          >
            A Smarter Campus for a Brighter Tomorrow
          </div>
          <div className="hero-rule" style={{ width: u(86), height: '3px', borderRadius: '2px', background: 'linear-gradient(90deg, #22b39a, #0f9d8a)', margin: `${u(10)} 0 ${u(20)}` }} />
          <h1
            style={{
              fontSize: uf(47, 28),
              fontWeight: 800,
              lineHeight: 1.1,
              letterSpacing: '-0.02em',
              color: '#0a3d3f',
              margin: `0 0 ${u(16)}`
            }}
          >
            COLLEGE DIGITAL<br />
            PERMISSION &amp;<br />
            APPROVAL PLATFORM
          </h1>
          <p
            style={{
              fontSize: uf(21, 15),
              color: '#3b4a5e',
              lineHeight: 1.48,
              fontWeight: 400,
              margin: 0
            }}
          >
            Simplifying student permission requests.<br />
            Faster approvals. A more connected campus.
          </p>
        </div>

        {/* Login card: glass layer + content layer */}
        <div
          className="lp-card"
          style={{ position: 'relative', flex: '0 0 auto', width: u(586), minWidth: '360px' }}
        >
          <div
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: uf(34, 24),
              background: 'linear-gradient(160deg, rgba(255,255,255,0.64) 0%, rgba(255,255,255,0.36) 38%, rgba(214,246,248,0.34) 70%, rgba(255,255,255,0.48) 100%)',
              backdropFilter: 'blur(36px) saturate(135%) brightness(1.10)',
              WebkitBackdropFilter: 'blur(36px) saturate(135%) brightness(1.10)',
              border: '2px solid rgba(255,255,255,0.85)',
              boxShadow: '0 30px 80px rgba(30,110,130,0.16), 0 0 0 1px rgba(255,255,255,0.35), inset 0 0 0 2px rgba(255,255,255,0.26), inset 0 0 50px rgba(255,255,255,0.35), inset 0 1px 0 rgba(255,255,255,0.95)'
            }}
          />
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              inset: 0,
              borderRadius: uf(34, 24),
              pointerEvents: 'none',
              background: 'radial-gradient(120% 55% at 18% 0%, rgba(255,255,255,0.60) 0%, rgba(255,255,255,0) 60%), linear-gradient(200deg, rgba(255,255,255,0) 55%, rgba(190,245,240,0.28) 100%)'
            }}
          />

          <div
            className="lp-card-inner"
            style={{ position: 'relative', padding: `${uf(34, 24)} ${uf(52, 26)} ${uf(40, 26)}`, boxSizing: 'border-box' }}
          >
            <div style={{ textAlign: 'center', marginBottom: u(28) }}>
              <div
                style={{
                  position: 'relative',
                  width: uf(170, 120),
                  margin: `0 auto ${u(12)}`,
                  aspectRatio: `${LOGO_ASPECT / (LOGO_KEEP / 100)}`,
                  overflow: 'hidden'
                }}
              >
                <img
                  src="/kiet_logo.jpg"
                  alt="KIET Logo"
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: `${-(LOGO_TOP / LOGO_KEEP) * 100}%`,
                    width: '100%',
                    height: 'auto',
                    display: 'block',
                    mixBlendMode: 'multiply'
                  }}
                />
              </div>
              <h2 style={{ fontSize: uf(35, 26), fontWeight: 700, color: '#0b1220', margin: `0 0 ${u(10)}`, letterSpacing: '-0.01em', lineHeight: 1.15 }}>
                Welcome Back
              </h2>
              <p style={{ color: '#4f6076', fontSize: uf(17.5, 14), lineHeight: 1.5, fontWeight: 400, margin: 0 }}>
                Sign in with your institutional credentials<br />or Roll Number
              </p>
            </div>

            {error && (
              <div style={{
                background: 'rgba(254,226,226,0.92)',
                color: '#b91c1c',
                padding: '12px 14px',
                borderRadius: '14px',
                fontSize: '14px',
                marginBottom: '14px',
                border: '1px solid #fca5a5'
              }}>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: u(16) }}>
              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: '50%', left: '22px', transform: 'translateY(-50%)', color: '#1e293b', display: 'flex', zIndex: 2 }}>
                  <User size={22} strokeWidth={1.6} />
                </div>
                <input
                  type="text"
                  required
                  autoFocus
                  placeholder="Username / Roll Number"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="glass-input"
                  style={{ paddingLeft: '62px', paddingRight: '18px' }}
                />
              </div>

              <div style={{ position: 'relative' }}>
                <div style={{ position: 'absolute', top: '50%', left: '22px', transform: 'translateY(-50%)', color: '#1e293b', display: 'flex', zIndex: 2 }}>
                  <Lock size={22} strokeWidth={1.6} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="glass-input"
                  style={{ paddingLeft: '62px', paddingRight: '58px' }}
                />
                <button
                  type="button"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    right: '22px',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#1e293b',
                    padding: 0,
                    display: 'flex',
                    zIndex: 2
                  }}
                >
                  {showPassword ? <EyeOff size={22} strokeWidth={1.6} /> : <Eye size={22} strokeWidth={1.6} />}
                </button>
              </div>

              <button type="submit" disabled={loading} className="signin-btn" style={{ cursor: loading ? 'not-allowed' : 'pointer' }}>
                {loading ? (
                  <span>Signing in...</span>
                ) : (
                  <>
                    <span>Sign In</span>
                    <ArrowRight size={22} strokeWidth={2.2} />
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      <style>
        {`
          .login-page-container {
            --s: min(calc(100vw / 1600), calc(100vh / 900));
          }

          .glass-input {
            width: 100%;
            height: max(50px, calc(var(--s) * 68));
            background: linear-gradient(180deg, rgba(255,255,255,0.58) 0%, rgba(255,255,255,0.28) 100%);
            -webkit-backdrop-filter: blur(12px) saturate(130%);
            backdrop-filter: blur(12px) saturate(130%);
            border: 1px solid rgba(255,255,255,0.9);
            border-radius: 16px;
            font-size: max(15px, calc(var(--s) * 18));
            font-weight: 400;
            font-family: inherit;
            color: #0f172a;
            outline: none;
            box-sizing: border-box;
            box-shadow: 0 6px 18px rgba(30,100,130,0.06), inset 0 1px 0 rgba(255,255,255,0.95), inset 0 -1px 0 rgba(255,255,255,0.35);
            transition: background 0.2s, border-color 0.2s, box-shadow 0.2s;
          }
          .glass-input::placeholder { color: #74879b; font-weight: 400; }
          .glass-input:focus {
            background: linear-gradient(180deg, rgba(255,255,255,0.78) 0%, rgba(255,255,255,0.56) 100%);
            border-color: #14b8a6;
            box-shadow: 0 0 0 4px rgba(20,184,166,0.16);
          }
          .glass-input:-webkit-autofill,
          .glass-input:-webkit-autofill:hover,
          .glass-input:-webkit-autofill:focus,
          .glass-input:-webkit-autofill:active {
            -webkit-box-shadow: 0 0 0 40px rgba(255,255,255,0.8) inset !important;
            -webkit-text-fill-color: #0f172a !important;
            transition: background-color 5000s ease-in-out 0s;
          }

          .kiet-check {
            appearance: none;
            -webkit-appearance: none;
            width: 22px;
            height: 22px;
            margin: 0;
            flex-shrink: 0;
            border-radius: 6px;
            border: 1.5px solid rgba(15,118,110,0.55);
            background: rgba(255,255,255,0.65);
            cursor: pointer;
            transition: all 0.15s;
          }
          .kiet-check:checked {
            background: #0f766e url("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16' fill='none' stroke='white' stroke-width='2.4' stroke-linecap='round' stroke-linejoin='round'><path d='M3.5 8.5l3 3 6-6.5'/></svg>") center / 14px no-repeat;
            border-color: #0f766e;
          }
          .kiet-check:focus-visible { outline: 2px solid #14b8a6; outline-offset: 2px; }

          .signin-btn {
            width: 100%;
            height: max(52px, calc(var(--s) * 70));
            margin-top: calc(var(--s) * 8);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            border: none;
            border-radius: 999px;
            color: #ffffff;
            font-family: inherit;
            font-size: max(17px, calc(var(--s) * 22));
            font-weight: 600;
            background: linear-gradient(180deg, #14a89a 0%, #0c7a72 55%, #0a6b66 100%);
            box-shadow: 0 0 0 3px rgba(255,255,255,0.60), 0 0 26px rgba(110,231,215,0.45), 0 14px 28px rgba(13,110,105,0.30), inset 0 1px 0 rgba(255,255,255,0.35);
            transition: transform 0.2s, box-shadow 0.2s, filter 0.2s;
          }
          .signin-btn:hover:not(:disabled) {
            transform: translateY(-2px);
            filter: brightness(1.05);
            box-shadow: 0 0 0 3px rgba(255,255,255,0.70), 0 0 32px rgba(110,231,215,0.55), 0 18px 32px rgba(13,110,105,0.36), inset 0 1px 0 rgba(255,255,255,0.4);
          }
          .signin-btn:disabled { opacity: 0.75; }

          @media (max-width: 1100px) {
            .lp-main { padding-left: 5vw !important; padding-right: 4vw !important; }
          }

          @media (max-width: 992px) {
            .login-page-container { --s: 0.72px; }
            .lp-header { margin: 12px 12px 0 !important; }
            .hide-on-mobile { display: none !important; }
            .lp-main {
              flex-direction: column !important;
              align-items: center !important;
              justify-content: flex-start !important;
              gap: 26px !important;
              padding: 28px 16px 40px !important;
            }
            .lp-hero {
              align-self: stretch !important;
              max-width: 100% !important;
              margin-top: 0 !important;
              text-align: center !important;
            }
            .lp-hero .hero-rule { margin-left: auto !important; margin-right: auto !important; }
            .lp-card { width: 100% !important; max-width: 480px !important; min-width: 0 !important; }
          }

          @media (max-width: 576px) {
            .login-page-container { --s: 0.62px; }
            .lp-card-inner { padding: 26px 20px 28px !important; }
          }
        `}
      </style>
    </div>
  );
}