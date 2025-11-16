import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import PasswordInput from './PasswordInput';
import useSignup from '../hooks/useSignup';

const SignupForm = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [passwordError, setPasswordError] = useState('');
  const { signup, loading, error } = useSignup();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    // Clear password error when user types
    if (name === 'password' || name === 'confirmPassword') {
      setPasswordError('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (formData.password !== formData.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    // Validate password strength (minimum 6 characters)
    if (formData.password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return;
    }

    await signup(formData.name, formData.email, formData.password);
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

      {passwordError && (
        <div className="error-message">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 1C4.13401 1 1 4.13401 1 8C1 11.866 4.13401 15 8 15C11.866 15 15 11.866 15 8C15 4.13401 11.866 1 8 1Z" fill="#dc2626"/>
            <path d="M8 4.5V8.5M8 11H8.005" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          <span>{passwordError}</span>
        </div>
      )}

      <div className="form-group">
        <label htmlFor="name" className="form-label">Full Name</label>
        <input
          type="text"
          id="name"
          name="name"
          className="form-input"
          placeholder="Enter your full name"
          value={formData.name}
          onChange={handleChange}
          required
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="email" className="form-label">Email Address</label>
        <input
          type="email"
          id="email"
          name="email"
          className="form-input"
          placeholder="Enter your email"
          value={formData.email}
          onChange={handleChange}
          required
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="password" className="form-label">Password</label>
        <PasswordInput
          id="password"
          name="password"
          value={formData.password}
          onChange={handleChange}
          placeholder="Create a password"
          disabled={loading}
        />
      </div>

      <div className="form-group">
        <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
        <PasswordInput
          id="confirmPassword"
          name="confirmPassword"
          value={formData.confirmPassword}
          onChange={handleChange}
          placeholder="Re-enter your password"
          disabled={loading}
        />
      </div>

      <button type="submit" className="login-button" disabled={loading}>
        {loading ? (
          <>
            <div className="spinner"></div>
            <span>Creating account...</span>
          </>
        ) : (
          'Sign Up'
        )}
      </button>

      <div className="signup-prompt">
        Already have an account? <Link to="/login" className="signup-link">Sign in</Link>
      </div>
    </form>
  );
};

export default SignupForm;