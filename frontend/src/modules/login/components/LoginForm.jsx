import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PasswordInput from './PasswordInput';
import useLogin from '../hooks/useLogin';

const LoginForm = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login, loading, error } = useLogin();

  const handleSubmit = async (e) => {
    e.preventDefault();
    await login(email, password);
  };

  return (
    <form className="login-form" onSubmit={handleSubmit}>
      {error && (
        <div className="error-message">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1C4.13401 1 1 4.13401 1 8C1 11.866 4.13401 15 8 15C11.866 15 15 11.866 15 8C15 4.13401 11.866 1 8 1Z" fill="#dc2626"/>
            <path d="M8 4.5V8.5M8 11H8.005" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span>{error}</span>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="email" className="form-label">Email Address</label>
        <input
          type="email"
          id="email"
          className="form-input"
          placeholder="Enter your email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="password" className="form-label">Password</label>
        <PasswordInput
          id="password"
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter your password"
          disabled={loading}
        />
      </div>

      <div className="form-options">
        <label className="checkbox-label">
          <input type="checkbox" className="checkbox-input" />
          <span>Remember me</span>
        </label>
        <Link to="#" className="forgot-link">Forgot password?</Link>
      </div>

      <button type="submit" className="login-button" disabled={loading}>
        {loading ? (
          <>
            <div className="spinner"></div>
            <span>Signing in...</span>
          </>
        ) : (
          'Sign In'
        )}
      </button>

      <div className="signup-prompt">
        Don't have an account? <Link to="/signup" className="signup-link">Sign up</Link>
      </div>
    </form>
  );
};

export default LoginForm;