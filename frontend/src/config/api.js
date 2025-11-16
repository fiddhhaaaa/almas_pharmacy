export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://unappropriated-clarisa-unnigh.ngrok-free.dev';

export const API_HEADERS = {
  'Content-Type': 'application/json',
  'ngrok-skip-browser-warning': 'true'
};

export const getAuthHeaders = () => {
  const token = localStorage.getItem('access_token');
  return {
    ...API_HEADERS,
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};