import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginUser } from '../services/LoginService';

const useLogin = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const login = async (email, password) => {
    setLoading(true);
    setError(null);

    try {
      const response = await loginUser(email, password);
      
      // Store the access token
      localStorage.setItem('access_token', response.access_token);
      
      // Redirect to dashboard
      navigate('/dashboard');
      
      return response;
    } catch (err) {
      setError(err.message || 'Invalid email or password');
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { login, loading, error };
};

export default useLogin;