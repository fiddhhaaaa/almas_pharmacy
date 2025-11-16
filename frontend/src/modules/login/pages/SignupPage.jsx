import React from 'react';
import SignupHeader from '../components/SignupHeader';
import SignupForm from '../components/SignupForm';
import '../Login.css';

const SignupPage = () => {
  return (
    <div className="login-container">
      <div className="login-card signup-card">
        <SignupHeader />
        <SignupForm />
      </div>
    </div>
  );
};

export default SignupPage;