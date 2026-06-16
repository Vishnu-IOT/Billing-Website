import React, { useState } from 'react';
import useAuthStore from '../../store/authStore';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../../components/ui';
import '../../styles/Auth.css';

/* ─────────────────────────────────────────
   SVG Illustrations
───────────────────────────────────────── */

const LoginIllustration = () => (
  <svg viewBox="0 0 340 260" xmlns="http://www.w3.org/2000/svg">
    {/* Monitor */}
    <rect
      x="80"
      y="30"
      width="190"
      height="130"
      rx="10"
      fill="white"
      opacity="0.95"
    />
    <rect x="80" y="30" width="190" height="14" rx="10" fill="#ddd6fe" />
    <circle cx="93" cy="37" r="3" fill="#f87171" />
    <circle cx="103" cy="37" r="3" fill="#fbbf24" />
    <circle cx="113" cy="37" r="3" fill="#4ade80" />

    {/* Avatar */}
    <circle cx="175" cy="80" r="22" fill="#c4b5fd" opacity="0.5" />
    <circle cx="175" cy="72" r="10" fill="#7c3aed" opacity="0.7" />
    <ellipse cx="175" cy="96" rx="15" ry="8" fill="#7c3aed" opacity="0.5" />

    {/* Password bars */}
    <rect x="120" y="118" width="100" height="8" rx="4" fill="#ddd6fe" />
    <rect
      x="120"
      y="132"
      width="70"
      height="8"
      rx="4"
      fill="#7c3aed"
      opacity="0.6"
    />

    {/* Login button */}
    <rect x="132" y="148" width="60" height="14" rx="7" fill="#7c3aed" />

    {/* Stand */}
    <rect
      x="162"
      y="160"
      width="26"
      height="18"
      rx="3"
      fill="white"
      opacity="0.7"
    />
    <rect
      x="145"
      y="176"
      width="60"
      height="7"
      rx="3"
      fill="white"
      opacity="0.5"
    />

    {/* Woman with key */}
    <circle cx="90" cy="148" r="12" fill="#fca5a5" />
    <ellipse cx="90" cy="143" rx="10" ry="7" fill="#1e1b4b" />
    <rect x="83" y="160" width="14" height="30" rx="6" fill="#ec4899" />
    <rect x="85" y="188" width="6" height="20" rx="3" fill="#1e1b4b" />
    <rect x="93" y="188" width="6" height="20" rx="3" fill="#1e1b4b" />
    <line
      x1="97"
      y1="170"
      x2="118"
      y2="188"
      stroke="#fca5a5"
      strokeWidth="5"
      strokeLinecap="round"
    />
    <circle
      cx="122"
      cy="192"
      r="7"
      fill="#fbbf24"
      stroke="#f59e0b"
      strokeWidth="1.5"
    />
    <rect x="128" y="190" width="22" height="4" rx="2" fill="#fbbf24" />
    <rect x="144" y="190" width="4" height="8" rx="1.5" fill="#fbbf24" />
    <rect x="138" y="190" width="4" height="6" rx="1.5" fill="#fbbf24" />

    {/* Man */}
    <circle cx="265" cy="140" r="12" fill="#fca5a5" />
    <ellipse cx="265" cy="136" rx="9" ry="6" fill="#7c2d12" />
    <rect x="258" y="152" width="14" height="30" rx="6" fill="#3b82f6" />
    <rect x="260" y="180" width="6" height="22" rx="3" fill="#1e40af" />
    <rect x="268" y="180" width="6" height="22" rx="3" fill="#1e40af" />
    <line
      x1="258"
      y1="160"
      x2="240"
      y2="140"
      stroke="#fca5a5"
      strokeWidth="5"
      strokeLinecap="round"
    />

    {/* Padlock */}
    <rect x="225" y="185" width="32" height="28" rx="5" fill="#fbbf24" />
    <path
      d="M232 185 Q232 170 241 170 Q250 170 250 185"
      stroke="#f59e0b"
      strokeWidth="4"
      fill="none"
      strokeLinecap="round"
    />
    <circle cx="241" cy="199" r="5" fill="#f59e0b" />
    <rect x="239" y="199" width="4" height="8" rx="2" fill="#f59e0b" />

    {/* Leaves */}
    <ellipse
      cx="70"
      cy="195"
      rx="18"
      ry="10"
      fill="#34d399"
      opacity="0.7"
      transform="rotate(-30 70 195)"
    />
    <ellipse
      cx="58"
      cy="205"
      rx="14"
      ry="8"
      fill="#10b981"
      opacity="0.6"
      transform="rotate(20 58 205)"
    />
    <ellipse
      cx="295"
      cy="195"
      rx="18"
      ry="10"
      fill="#34d399"
      opacity="0.7"
      transform="rotate(30 295 195)"
    />
    <ellipse
      cx="308"
      cy="207"
      rx="14"
      ry="8"
      fill="#10b981"
      opacity="0.6"
      transform="rotate(-20 308 207)"
    />
  </svg>
);

const RegisterIllustration = () => (
  <svg viewBox="0 0 320 240" xmlns="http://www.w3.org/2000/svg">
    <circle cx="160" cy="120" r="95" fill="white" opacity="0.08" />

    {/* Envelope */}
    <rect
      x="60"
      y="70"
      width="200"
      height="130"
      rx="12"
      fill="white"
      opacity="0.92"
    />
    <polyline
      points="60,70 160,145 260,70"
      stroke="#c4b5fd"
      strokeWidth="2.5"
      fill="none"
    />

    {/* Form lines */}
    <rect x="90" y="100" width="60" height="8" rx="4" fill="#ddd6fe" />
    <rect x="90" y="116" width="80" height="8" rx="4" fill="#ddd6fe" />
    <rect x="90" y="132" width="50" height="8" rx="4" fill="#c4b5fd" />
    <rect x="90" y="150" width="60" height="14" rx="7" fill="#7c3aed" />

    {/* Left person */}
    <circle cx="48" cy="138" r="11" fill="#fda4af" />
    <ellipse cx="48" cy="131" rx="9" ry="6" fill="#312e81" />
    <rect x="41" y="149" width="14" height="28" rx="6" fill="#f472b6" />
    <rect x="43" y="175" width="5" height="18" rx="2.5" fill="#1e1b4b" />
    <rect x="50" y="175" width="5" height="18" rx="2.5" fill="#1e1b4b" />
    <line
      x1="55"
      y1="157"
      x2="72"
      y2="143"
      stroke="#fda4af"
      strokeWidth="4.5"
      strokeLinecap="round"
    />

    {/* Checkmark */}
    <circle cx="80" cy="136" r="10" fill="#4ade80" />
    <polyline
      points="74,136 78,140 87,131"
      stroke="white"
      strokeWidth="2.5"
      fill="none"
      strokeLinecap="round"
      strokeLinejoin="round"
    />

    {/* Right person */}
    <circle cx="278" cy="138" r="11" fill="#fda4af" />
    <ellipse cx="278" cy="131" rx="9" ry="6" fill="#78350f" />
    <rect x="271" y="149" width="14" height="28" rx="6" fill="#60a5fa" />
    <rect x="273" y="175" width="5" height="18" rx="2.5" fill="#1e40af" />
    <rect x="280" y="175" width="5" height="18" rx="2.5" fill="#1e40af" />
    <line
      x1="271"
      y1="158"
      x2="254"
      y2="148"
      stroke="#fda4af"
      strokeWidth="4.5"
      strokeLinecap="round"
    />

    {/* Sparkles */}
    <text x="100" y="55" fontSize="14" fill="white" opacity="0.7">
      ✦
    </text>
    <text x="220" y="50" fontSize="10" fill="white" opacity="0.5">
      ✦
    </text>
    <text x="50" y="100" fontSize="8" fill="white" opacity="0.4">
      ✦
    </text>
    <text x="270" y="105" fontSize="12" fill="white" opacity="0.5">
      ✦
    </text>

    {/* Leaves */}
    <ellipse
      cx="38"
      cy="193"
      rx="16"
      ry="9"
      fill="#34d399"
      opacity="0.7"
      transform="rotate(-25 38 193)"
    />
    <ellipse
      cx="27"
      cy="202"
      rx="12"
      ry="7"
      fill="#10b981"
      opacity="0.55"
      transform="rotate(15 27 202)"
    />
    <ellipse
      cx="288"
      cy="193"
      rx="16"
      ry="9"
      fill="#34d399"
      opacity="0.7"
      transform="rotate(25 288 193)"
    />
    <ellipse
      cx="300"
      cy="203"
      rx="12"
      ry="7"
      fill="#10b981"
      opacity="0.55"
      transform="rotate(-15 300 203)"
    />
  </svg>
);

/* ─────────────────────────────────────────
   Brand Logo (shared)
───────────────────────────────────────── */
const Brand = () => (
  <div className="brand">
    <div className="brand-icon">
      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect
          x="3"
          y="3"
          width="18"
          height="18"
          rx="3"
          fill="white"
          opacity="0.2"
        />
        <path
          d="M7 8h10M7 12h6M7 16h8"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <circle cx="17" cy="16" r="2.5" fill="white" />
      </svg>
    </div>
    <div className="brand-text">
      <span className="brand-name">NithiX</span>
      <span className="brand-sub">POS &amp; Billing</span>
    </div>
  </div>
);

/* ─────────────────────────────────────────
   Login View
 ───────────────────────────────────────── */
const LoginView = ({ onSwitch }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((s) => s.login);
  const toast = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password.trim()) {
      toast.error('Email and password are required');
      return;
    }
    setLoading(true);
    try {
      const data = { email: email, password: password };
      await login(data);
      toast.success('Logged in successfully!');
      window.location.hash = 'dashboard';
    } catch (err) {
      toast.error(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-card login">
      {/* Form — LEFT */}
      <form className="form-panel" onSubmit={handleLogin}>
        <Brand />

        <div className="field-group">
          <label className="field-label">E-mail</label>
          <input
            className="field-input"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            disabled={loading}
            required
          />
        </div>

        <div className="field-group">
          <label className="field-label">Password</label>
          <input
            className="field-input"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            disabled={loading}
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>

        <button type="button" className="forgot-link">
          Forgot Password?
        </button>

        {/* <div className="switch-text">
          Don't have an account?
          <a
            onClick={(e) => {
              e.preventDefault();
              onSwitch('register');
            }}
          >
            Register
          </a>
        </div> */}
      </form>

      {/* Illustration — RIGHT */}
      <div className="visual-panel">
        <div className="visual-tagline">
          <h2>
            It's not about what you make.
            <br />
            It's about what you make possible.
          </h2>
          <p>Welcome to Thrive!</p>
        </div>
        <div className="illustration-wrap">
          <LoginIllustration />
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────
   Register View
 ───────────────────────────────────────── */
const RegisterView = ({ onSwitch }) => {
  const toast = useToast();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirm: '',
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (field) => (e) =>
    setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) {
      toast.error('All fields are required');
      return;
    }
    if (form.password !== form.confirm) {
      toast.error('Passwords do not match');
      return;
    }
    setLoading(true);
    // User registrations are normally done by owners in user management.
    // Displaying a simple guidance toast.
    setTimeout(() => {
      setLoading(false);
      toast.success('Registration request sent! Please contact your owner.');
      onSwitch('login');
    }, 1000);
  };

  return (
    <div className="auth-card register">
      {/* Illustration — LEFT */}
      <div className="visual-panel">
        <div className="visual-tagline">
          <h2>
            Join Thrive Studios
            <br />
            and make it possible.
          </h2>
          <p>Create your account today!</p>
        </div>
        <div className="illustration-wrap">
          <RegisterIllustration />
        </div>
      </div>

      {/* Form — RIGHT */}
      <form className="form-panel" onSubmit={handleRegister}>
        <Brand />

        <div className="form-title">Create an Account</div>

        <div className="field-group">
          <label className="field-label">Full Name</label>
          <input
            className="field-input"
            type="text"
            value={form.name}
            onChange={handleChange('name')}
            placeholder="John Doe"
            disabled={loading}
            required
          />
        </div>

        <div className="field-group">
          <label className="field-label">E-mail</label>
          <input
            className="field-input"
            type="email"
            value={form.email}
            onChange={handleChange('email')}
            placeholder="you@example.com"
            disabled={loading}
            required
          />
        </div>

        <div className="field-group">
          <label className="field-label">Password</label>
          <input
            className="field-input"
            type="password"
            value={form.password}
            onChange={handleChange('password')}
            placeholder="••••••••"
            disabled={loading}
            required
          />
        </div>

        <div className="field-group">
          <label className="field-label">Confirm Password</label>
          <input
            className="field-input"
            type="password"
            value={form.confirm}
            onChange={handleChange('confirm')}
            placeholder="••••••••"
            disabled={loading}
            required
          />
        </div>

        <button type="submit" className="btn-primary" disabled={loading}>
          {loading ? 'Creating...' : 'Register'}
        </button>

        {/* <div className="switch-text">
          Already have an account?
          <a
            onClick={(e) => {
              e.preventDefault();
              onSwitch('login');
            }}
          >
            Login
          </a>
        </div> */}
      </form>
    </div>
  );
};

/* ─────────────────────────────────────────
   Auth — single exported component
 ───────────────────────────────────────── */
const Auth = () => {
  const [page, setPage] = useState('login');
  const toast = useToast();

  return (
    <div className="page-wrapper">
      <ToastContainer toasts={toast.toasts} />
      <div className="blob-tr" />
      {page === 'login' ? (
        <LoginView onSwitch={setPage} />
      ) : (
        <RegisterView onSwitch={setPage} />
      )}
    </div>
  );
};

export default Auth;
