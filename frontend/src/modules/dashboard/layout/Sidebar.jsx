import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Package, 
  Settings,
  LogOut
} from 'lucide-react';
import { logout } from '../../login/services/LoginService'; // Correct path based on your structure

const Sidebar = () => {
  const navigate = useNavigate();
  
  const menuItems = [
    { path: '/dashboard/overview', icon: LayoutDashboard, label: 'Overview' },
    { path: '/dashboard/inventory', icon: Package, label: 'Medicine Inventory' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-logo">
          <Package size={32} />
          <h2>MediTrack</h2>
        </div>
      </div>

      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `sidebar-nav-item ${isActive ? 'active' : ''}`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="sidebar-footer">
        <button className="sidebar-nav-item" onClick={handleLogout}>
          <LogOut size={20} />
          <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default Sidebar;