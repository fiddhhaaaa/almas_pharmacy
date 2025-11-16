import React from 'react';
import LoginHeader from '../components/LoginHeader';
import LoginForm from '../components/LoginForm';
import '../Login.css';

const LoginPage = () => {
  return (
    <div className="login-container">
      <div className="login-card">
        <LoginHeader />
        <LoginForm />
      </div>
    </div>
  );
};

export default LoginPage;