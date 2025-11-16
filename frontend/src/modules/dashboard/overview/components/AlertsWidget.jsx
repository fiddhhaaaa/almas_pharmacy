import React, { useMemo } from 'react';
import { AlertCircle, AlertTriangle, Info } from 'lucide-react';

const AlertsWidget = ({ alerts, onGenerateAlerts }) => {
  // Deduplicate alerts - keep only latest alert per medicine
  const deduplicatedAlerts = useMemo(() => {
    if (!alerts || !Array.isArray(alerts)) return [];
    
    console.log('Raw alerts received:', alerts);
    
    const alertMap = new Map();
    
    alerts.forEach(alert => {
      const key = `${alert.medicine_id}-${alert.alert_type}`;  
      const existing = alertMap.get(key);
      
      // Keep the latest alert OR if dates are invalid
      const alertDate = new Date(alert.alert_date);
      const existingDate = existing ? new Date(existing.alert_date) : null;
      
      if (!existing || !existingDate || isNaN(existingDate.getTime()) || alertDate > existingDate) {
        alertMap.set(key, alert);
      }
    });
    
    const result = Array.from(alertMap.values())
      .sort((a, b) => new Date(b.alert_date) - new Date(a.alert_date));
    
    console.log('Deduplicated alerts:', result);
    console.log('Low stock alerts:', result.filter(a => a.alert_type === 'low_stock'));
    console.log('Expiry alerts:', result.filter(a => a.alert_type === 'expiry'));
    
    return result;
  }, [alerts]);

  const getAlertIcon = (alertType) => {
    if (alertType === 'low_stock') {
      return <AlertCircle size={18} className="alert-icon-critical" />;
    } else if (alertType === 'expiry') {
      return <AlertTriangle size={18} className="alert-icon-warning" />;
    }
    return <Info size={18} className="alert-icon-info" />;
  };

  const getAlertClass = (alertType) => {
    if (alertType === 'low_stock') {
      return 'alert-item-critical';
    } else if (alertType === 'expiry') {
      return 'alert-item-warning';
    }
    return 'alert-item-info';
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleString('en-US', { 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'N/A';
    }
  };

  // Extract medicine name from alert_message
  const extractMedicineName = (message) => {
    if (!message) return 'Unknown Medicine';
    
    // Pattern: "Low stock alert: NAME (Current:..."
    const lowStockPattern = /Low stock alert:\s*(.+?)\s*\(/i;
    const lowStockMatch = message.match(lowStockPattern);
    if (lowStockMatch) return lowStockMatch[1].trim();
    
    // Pattern: "Expiry alert: NAME expires..."
    const expiryPattern = /Expiry alert:\s*(.+?)\s+expires/i;
    const expiryMatch = message.match(expiryPattern);
    if (expiryMatch) return expiryMatch[1].trim();
    
    return 'Unknown Medicine';
  };

  // Extract stock info from alert_message
  const extractStockInfo = (message, alertType) => {
    if (!message) return null;
    
    if (alertType === 'low_stock') {
      // Pattern: "Current: X, Reorder Level: Y"
      const stockPattern = /Current:\s*(\d+),\s*Reorder Level:\s*(\d+)/i;
      const match = message.match(stockPattern);
      if (match) {
        return `Stock: ${match[1]} / ${match[2]}`;
      }
    }
    
    if (alertType === 'expiry') {
      // Pattern: "expires in X days"
      const daysPattern = /expires in (\d+) days/i;
      const match = message.match(daysPattern);
      if (match) {
        return `${match[1]} days left`;
      }
    }
    
    return null;
  };

  return (
    <div className="widget-card">
      <div className="widget-header">
        <h3>Recent Alerts</h3>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button 
            className="widget-action-btn"
            onClick={onGenerateAlerts}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#2563eb';
              e.target.style.transform = 'translateY(-1px)';
              e.target.style.boxShadow = '0 4px 6px rgba(59, 130, 246, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#3b82f6';
              e.target.style.transform = 'translateY(0)';
              e.target.style.boxShadow = '0 2px 4px rgba(59, 130, 246, 0.2)';
            }}
          >
            Generate Alerts
          </button>
          <button 
            className="widget-action-btn"
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: '600',
              backgroundColor: '#ffffff',
              color: '#374151',
              border: '1.5px solid #d1d5db',
              borderRadius: '8px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
              e.target.style.backgroundColor = '#f9fafb';
              e.target.style.borderColor = '#9ca3af';
              e.target.style.transform = 'translateY(-1px)';
            }}
            onMouseLeave={(e) => {
              e.target.style.backgroundColor = '#ffffff';
              e.target.style.borderColor = '#d1d5db';
              e.target.style.transform = 'translateY(0)';
            }}
          >
            View All
          </button>
        </div>
      </div>
      
      <div className="alerts-list">
        {deduplicatedAlerts && deduplicatedAlerts.length > 0 ? (
          deduplicatedAlerts.map((alert) => {
            const medicineName = extractMedicineName(alert.alert_message);
            const stockInfo = extractStockInfo(alert.alert_message, alert.alert_type);
            
            return (
              <div 
                key={alert.alert_id} 
                className={`alert-item ${getAlertClass(alert.alert_type)}`}
              >
                <div className="alert-icon-container">
                  {getAlertIcon(alert.alert_type)}
                </div>
                <div className="alert-content">
                  <div className="alert-title">
                    {alert.alert_message}
                  </div>
                  <div className="alert-meta">
                    <span className="alert-medicine">{medicineName}</span>
                    {stockInfo && (
                      <span className="alert-stock"> • {stockInfo}</span>
                    )}
                    <span className="alert-time">{formatDate(alert.alert_date)}</span>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="empty-state">
            <Info size={32} />
            <p>No alerts at the moment</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsWidget;