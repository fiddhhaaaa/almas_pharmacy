import React, { useState } from 'react';
import { Package, AlertTriangle, Clock, Bell, RefreshCw } from 'lucide-react';
import { useOverview } from '../hooks/useOverview.jsx';
import StatsCard from '../components/StatsCard.jsx';
import AlertsWidget from '../components/AlertsWidget.jsx';
import PredictionsWidget from '../components/PredictionsWidget.jsx';
import MedicineDetailsModal from '../components/MedicineDetailsModal.jsx';
import api from '../services/alertService.js';

const OverviewPage = () => {
  const { loading, error, dashboardData, refreshData } = useOverview();
  const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null, title: '' });

  const handleUploadSuccess = () => {
    refreshData();
  };

  const handleGenerateAlerts = async () => {
    try {
      await api.generateAlerts();
      // Refresh dashboard data to get new alerts
      await refreshData();
    } catch (error) {
      console.error('Error generating alerts:', error);
    }
  };

  const handleLowStockClick = () => {
    if (dashboardData.stats.lowStockItems > 0) {
      setModalConfig({
        isOpen: true,
        type: 'low-stock',
        title: 'Low Stock Medicines'
      });
    }
  };

  const handleExpiringClick = () => {
    if (dashboardData.stats.expiringItems > 0) {
      setModalConfig({
        isOpen: true,
        type: 'expiring-soon',
        title: 'Medicines Expiring Soon'
      });
    }
  };

  const handleCloseModal = () => {
    setModalConfig({ isOpen: false, type: null, title: '' });
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading dashboard data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="error-container">
        <AlertTriangle size={48} />
        <h3>Error Loading Dashboard</h3>
        <p>{error}</p>
        <button className="btn-primary" onClick={refreshData}>
          <RefreshCw size={16} />
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="overview-page">
      <div className="page-header">
        <div>
          <h1>Dashboard Overview</h1>
          <p>Welcome back! Here's what's happening with your inventory.</p>
        </div>
        <button className="btn-refresh" onClick={refreshData}>
          <RefreshCw size={18} />
          Refresh
        </button>
      </div>

      <div className="stats-grid">
        <StatsCard
          title="Total Medicines"
          value={dashboardData.stats.totalMedicines}
          icon={Package}
          color="blue"
          clickable={false}
        />
        <StatsCard
          title="Low Stock Items"
          value={dashboardData.stats.lowStockItems}
          icon={AlertTriangle}
          color="orange"
          clickable={true}
          onClick={handleLowStockClick}
        />
        <StatsCard
          title="Expiring Soon"
          value={dashboardData.stats.expiringItems}
          icon={Clock}
          color="red"
          clickable={true}
          onClick={handleExpiringClick}
        />
        <StatsCard
          title="Total Alerts"
          value={dashboardData.stats.totalAlerts}
          icon={Bell}
          color="purple"
          clickable={false}
        />
      </div>

      <div className="widgets-stack">
        <PredictionsWidget 
          predictions={dashboardData.predictions}
          onUploadSuccess={handleUploadSuccess}
        />
        <AlertsWidget 
          alerts={dashboardData.alerts}
          onGenerateAlerts={handleGenerateAlerts}
        />
      </div>

      {/* Medicine Details Modal */}
      <MedicineDetailsModal
        isOpen={modalConfig.isOpen}
        onClose={handleCloseModal}
        type={modalConfig.type}
        title={modalConfig.title}
      />
    </div>
  );
};

export default OverviewPage;