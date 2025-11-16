// src/components/AuthModeIndicator.jsx
import React from 'react';

const AuthModeIndicator = () => {
  return (
    <div style={{
      position: 'fixed',
      top: '10px',
      right: '10px',
      background: '#e3f2fd',
      border: '1px solid #1976d2',
      borderRadius: '8px',
      padding: '10px',
      fontSize: '12px',
      zIndex: 1000,
      maxWidth: '300px'
    }}>
      <div style={{ fontWeight: 'bold', color: '#1976d2', marginBottom: '5px' }}>
        🔧 Development Mode
      </div>
      <div style={{ marginBottom: '5px' }}>
        <strong>Mock Authentication Active</strong>
      </div>
      <div style={{ fontSize: '11px', color: '#666' }}>
        <div><strong>Test Accounts:</strong></div>
        <div>• admin@pharmacy.com / admin123</div>
        <div>• test@pharmacy.com / test123</div>
        <div style={{ marginTop: '5px' }}>
          <strong>Or create new account</strong>
        </div>
      </div>
    </div>
  );
};

export default AuthModeIndicator;
