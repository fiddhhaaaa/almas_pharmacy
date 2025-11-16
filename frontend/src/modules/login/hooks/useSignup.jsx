import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signupUser, loginUser } from '../services/LoginService';

const useSignup = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const signup = async (name, email, password) => {
    setLoading(true);
    setError(null);

    try {
      // First, signup the user
      await signupUser(email, password, name);
      
      // Then automatically login
      const loginResponse = await loginUser(email, password);
      
      // Store the access token
      localStorage.setItem('access_token', loginResponse.access_token);
      
      // Redirect to dashboard
      navigate('/dashboard');
      
      return loginResponse;
    } catch (err) {
      setError(err.message || 'Signup failed. Please try again.');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { signup, loading, error };
};

export default useSignup;