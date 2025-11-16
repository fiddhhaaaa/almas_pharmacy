import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './modules/dashboard/layout/DashboardLayout.jsx';
import OverviewPage from './modules/dashboard/overview/pages/OverviewPage.jsx';
import MedicineInventoryPage from './modules/dashboard/medicine-inventory/pages/MedicineInventoryPage.jsx';
import LoginPage from './modules/login/pages/LoginPage.jsx';
import SignupPage from './modules/login/pages/SignupPage.jsx';
import { isAuthenticated } from './modules/login/services/LoginService.js';
import './App.css';
import './modules/dashboard/dashboard.css';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  return isAuthenticated() ? children : <Navigate to="/login" replace />;
};

// Public Route Component (redirect to dashboard if already logged in)
const PublicRoute = ({ children }) => {
  return !isAuthenticated() ? children : <Navigate to="/dashboard/overview" replace />;
};

function App() {
  return (
    <Router>
      <Routes>
        {/* Public Routes - Login & Signup */}
        <Route 
          path="/login" 
          element={
            <PublicRoute>
              <LoginPage />
            </PublicRoute>
          } 
        />
        
        <Route 
          path="/signup" 
          element={
            <PublicRoute>
              <SignupPage />
            </PublicRoute>
          } 
        />
        
        {/* Redirect root based on authentication */}
        <Route 
          path="/" 
          element={
            isAuthenticated() 
              ? <Navigate to="/dashboard/overview" replace /> 
              : <Navigate to="/login" replace />
          } 
        />
        
        {/* Protected Dashboard routes */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/dashboard/overview" replace />} />
          <Route path="overview" element={<OverviewPage />} />
          <Route path="inventory" element={<MedicineInventoryPage />} />
          {/* <Route path="sales" element={<SalesPage />} /> */}
          {/* <Route path="alerts" element={<AlertsPage />} /> */}
          {/* <Route path="predictions" element={<PredictionsPage />} /> */}
        </Route>
        
        {/* Catch all - redirect based on authentication */}
        <Route 
          path="*" 
          element={
            isAuthenticated() 
              ? <Navigate to="/dashboard/overview" replace /> 
              : <Navigate to="/login" replace />
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;