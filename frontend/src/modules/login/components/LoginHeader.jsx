import React from 'react';

const LoginHeader = () => {
  return (
    <div className="login-header">
      <div className="logo-container">
        <div className="logo-icon">
          <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
            <rect width="40" height="40" rx="8" fill="#2563eb"/>
            <path d="M12 20L18 26L28 14" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      <h1 className="login-title">Welcome Back</h1>
      <p className="login-subtitle">Enter your credentials to access your account</p>
    </div>
  );
};

export default LoginHeader;