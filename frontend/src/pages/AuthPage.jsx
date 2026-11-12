// ==============================================================================
// FILE: frontend/src/pages/AuthPage.jsx
// MÔ TẢ: Trang Đăng nhập / Đăng ký
//         - 2 Role tabs (chỉ hiện khi Đăng nhập): Ứng tuyển / Nhà tuyển dụng
//         - Đăng ký chỉ dành cho ứng viên
// ==============================================================================

import { useState, useEffect } from 'react';
import { loginUser, registerUser, loginWithGoogle, getAssetUrl } from '../services/api';
import { signInWithGoogle } from '../services/firebase';

const ROLES = [
  { key: 'ung_tuyen', label: 'Ứng tuyển', icon: '👤' },
  { key: 'nha_tuyen_dung', label: 'Nhà tuyển dụng', icon: '🏢' },
];

export default function AuthPage({ onNavigate, onLogin }) {
  const [mode, setMode] = useState('login');         // 'login' | 'register'
  const [selectedRole, setSelectedRole] = useState('ung_tuyen');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState(null);

  // Form fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);

  // Khi chuyển sang đăng ký, tự động set role là ung_tuyen
  useEffect(() => {
    if (mode === 'register') {
      setSelectedRole('ung_tuyen');
    }
  }, [mode]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'login') {
        const user = await loginUser(email, password, selectedRole);
        if (onLogin) onLogin(user);
      } else {
        // Register (Always ung_tuyen)
        if (password !== confirmPassword) {
          setError('Mật khẩu xác nhận không khớp.');
          setLoading(false);
          return;
        }
        if (password.length < 6) {
          setError('Mật khẩu phải có ít nhất 6 ký tự.');
          setLoading(false);
          return;
        }
        const user = await registerUser({
          full_name: fullName,
          email,
          password,
          role: 'ung_tuyen', // Cố định
          phone: phone || null,
        });
        if (onLogin) onLogin(user);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    setGoogleLoading(true);

    try {
      const googleUser = await signInWithGoogle();
      // Gửi thông tin sang backend FastAPI -> lưu/lấy từ PostgreSQL
      const user = await loginWithGoogle({
        email: googleUser.email,
        full_name: googleUser.full_name,
        avatar_url: googleUser.avatar_url,
        role: selectedRole,
        firebase_uid: googleUser.firebase_uid,
      });
      if (onLogin) onLogin(user);
    } catch (err) {
      console.error("Google sign in error:", err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Bạn đã đóng cửa sổ đăng nhập Google.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        // Ignored
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('Nhà cung cấp Google chưa được BẬT trong Firebase Console (Vào mục Authentication > Sign-in method > bật Google).');
      } else if (err.code === 'auth/unauthorized-domain') {
        const curDomain = window.location.hostname || 'tên miền hiện tại';
        setError(`Tên miền "${curDomain}" chưa được cấp phép trong Firebase Console (Vào Authentication > Settings > Authorized domains > Thêm "${curDomain}").`);
      } else if (err.code === 'auth/api-key-not-valid') {
        setError('API Key Firebase không hợp lệ.');
      } else {
        setError(err.message || 'Đăng nhập Google thất bại. Vui lòng thử lại.');
      }
    } finally {
      setGoogleLoading(false);
    }
  }

  function switchMode(newMode) {
    setMode(newMode);
    setError(null);
  }

  return (
    <div className="auth-page">
      {/* ========== CỘT TRÁI: BRANDING ========== */}
      <div className="auth-branding" style={{ backgroundImage: `url(${getAssetUrl('/images/background.png')})` }}>
        <div className="auth-branding__overlay" />
        <div className="auth-branding__content">
          <div className="auth-glass-card">
            <h1 className="auth-glass-card__title">AI MATCHER</h1>
            <h2 className="auth-glass-card__subtitle">
              Nền tảng Tuyển dụng<br />Thông minh hơn.
            </h2>
            <p className="auth-glass-card__desc">
              Kết nối CV và JD chính xác hơn<br />với Trí tuệ Nhân tạo.
            </p>
            <div className="auth-glass-card__icon">
              <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#00F0FF" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 1.98-3A2.5 2.5 0 0 1 9.5 2Z"/>
                <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-1.98-3A2.5 2.5 0 0 0 14.5 2Z"/>
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* ========== CỘT PHẢI: FORM ========== */}
      <div className="auth-form-area">
        <div className="auth-form-card">
          {/* Header */}
          <div className="auth-form-card__header">
            <h2 className="auth-form-card__title">
              {mode === 'login' ? 'Chào mừng trở lại!' : 'Tạo tài khoản mới'}
            </h2>
            <p className="auth-form-card__subtitle">
              {mode === 'login' ? 'Đăng nhập để tiếp tục.' : 'Đăng ký ứng tuyển để bắt đầu sử dụng.'}
            </p>
          </div>

          {/* ★ Role Selector Toggle (Login Only) ★ */}
          {mode === 'login' && (
            <div className="auth-role-toggle">
              {ROLES.map(r => (
                <button
                  key={r.key}
                  type="button"
                  className={`auth-role-toggle__btn ${selectedRole === r.key ? 'active' : ''}`}
                  onClick={() => setSelectedRole(r.key)}
                >
                  <span className="auth-role-toggle__icon">{r.icon}</span>
                  {r.label}
                </button>
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="auth-error">
              <span>⚠️ {error}</span>
              <button onClick={() => setError(null)}>✕</button>
            </div>
          )}

          {/* Form */}
          <form className="auth-form" onSubmit={handleSubmit}>
            {/* Full Name (register only) */}
            {mode === 'register' && (
              <div className="auth-input-group">
                <span className="auth-input-group__icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </span>
                <input
                  type="text"
                  required
                  placeholder="Họ và tên"
                  className="auth-input"
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                />
              </div>
            )}

            {/* Email */}
            <div className="auth-input-group">
              <span className="auth-input-group__icon">@</span>
              <input
                type="email"
                required
                placeholder="Địa chỉ Email"
                className="auth-input"
                value={email}
                onChange={e => setEmail(e.target.value)}
              />
            </div>

            {/* Phone (register only) */}
            {mode === 'register' && (
              <div className="auth-input-group">
                <span className="auth-input-group__icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </span>
                <input
                  type="tel"
                  placeholder="Số điện thoại (tùy chọn)"
                  className="auth-input"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
              </div>
            )}

            {/* Password */}
            <div className="auth-input-group">
              <span className="auth-input-group__icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </span>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                placeholder="Mật khẩu"
                className="auth-input"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
              <button
                type="button"
                className="auth-input-group__toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
                    <line x1="1" y1="1" x2="23" y2="23"/>
                  </svg>
                )}
              </button>
            </div>

            {/* Confirm Password (register only) */}
            {mode === 'register' && (
              <div className="auth-input-group">
                <span className="auth-input-group__icon">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                  </svg>
                </span>
                <input
                  type="password"
                  required
                  placeholder="Xác nhận mật khẩu"
                  className="auth-input"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                />
              </div>
            )}

            {/* Remember / Forgot (login only) */}
            {mode === 'login' && (
              <div className="auth-form__row">
                <label className="auth-checkbox">
                  <input 
                    type="checkbox" 
                    checked={rememberMe} 
                    onChange={e => setRememberMe(e.target.checked)} 
                  />
                  <span>Ghi nhớ tôi</span>
                </label>
                <a href="#" className="auth-link">Quên mật khẩu?</a>
              </div>
            )}

            {/* Submit */}
            <button type="submit" className="auth-btn-submit" disabled={loading}>
              {loading ? (
                <span className="auth-btn-submit__loading">
                  <span className="spinner spinner--sm" />
                  Đang xử lý...
                </span>
              ) : (
                mode === 'login' ? 'ĐĂNG NHẬP' : 'ĐĂNG KÝ'
              )}
            </button>
          </form>

          {/* Divider */}
          <div className="auth-divider">
            <div className="auth-divider__line" />
            <span className="auth-divider__text">{mode === 'login' ? 'Hoặc đăng nhập bằng' : 'Hoặc đăng ký nhanh bằng'}</span>
            <div className="auth-divider__line" />
          </div>

          <div className="auth-social">
            <button 
              type="button" 
              className="auth-social__btn auth-social__btn--google"
              onClick={handleGoogleSignIn}
              disabled={googleLoading || loading}
              style={{ flex: 1, justifyContent: 'center', cursor: 'pointer' }}
            >
              {googleLoading ? (
                <span className="spinner spinner--sm" style={{ marginRight: '6px' }} />
              ) : (
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z"/>
                  <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z"/>
                  <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z"/>
                  <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z"/>
                </svg>
              )}
              {googleLoading ? 'Đang kết nối Google...' : 'Đăng nhập với Google'}
            </button>
          </div>

          {/* Toggle Mode */}
          <p className="auth-register">
            {mode === 'login' ? (
              <>Chưa có tài khoản? <button type="button" className="auth-register__link" onClick={() => switchMode('register')}>Đăng ký</button></>
            ) : (
              <>Đã có tài khoản? <button type="button" className="auth-register__link" onClick={() => switchMode('login')}>Đăng nhập</button></>
            )}
          </p>
        </div>
      </div>
    </div>
  );
}

