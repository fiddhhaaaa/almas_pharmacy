import React from 'react';

const StatsCard = ({ title, value, icon: Icon, trend, trendValue, color = 'blue', onClick, clickable = false }) => {
  const cardStyle = {
    cursor: clickable ? 'pointer' : 'default',
    transition: 'all 0.2s ease',
    transform: 'translateY(0)',
  };

  const handleMouseEnter = (e) => {
    if (clickable) {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 10px 20px rgba(0, 0, 0, 0.1)';
    }
  };

  const handleMouseLeave = (e) => {
    if (clickable) {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '';
    }
  };

  return (
    <div 
      className={`stats-card stats-card-${color}`}
      style={cardStyle}
      onClick={clickable ? onClick : undefined}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="stats-card-header">
        <div className="stats-card-title">{title}</div>
        <div className={`stats-card-icon icon-${color}`}>
          <Icon size={24} />
        </div>
      </div>
      
      <div className="stats-card-value">{value}</div>
      
      {trend && (
        <div className={`stats-card-trend trend-${trend}`}>
          <span className="trend-indicator">{trend === 'up' ? '↑' : '↓'}</span>
          <span className="trend-value">{trendValue}</span>
          <span className="trend-text">vs last month</span>
        </div>
      )}
      
      {clickable && value > 0 && (
        <div style={{
          marginTop: '8px',
          fontSize: '12px',
          color: '#6b7280',
          fontWeight: '500'
        }}>
          view details →
        </div>
      )}
    </div>
  );
};

export default StatsCard;