import React from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../login/services/LoginService';

const TopBar = () => {
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="top-bar">
      {/* Your existing search bar and notifications */}
      <div className="search-bar">
        {/* ... existing search content ... */}
      </div>
    </div>
  );
};

export default TopBar;