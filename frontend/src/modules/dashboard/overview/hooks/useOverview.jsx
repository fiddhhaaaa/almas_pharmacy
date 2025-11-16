// src/modules/dashboard/overview/hooks/useOverview.jsx
// FIXED: Properly fetches alerts from backend

import { useState, useEffect, useCallback } from 'react';
import alertService from '../services/alertService.js';
import predictionService from '../services/predictionService.js';

export const useOverview = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [dashboardData, setDashboardData] = useState({
    stats: {
      totalMedicines: 0,
      lowStockItems: 0,
      expiringItems: 0,
      totalAlerts: 0
    },
    alerts: [],
    predictions: []
  });

  const fetchDashboardData = useCallback(async () => {
  try {
    setLoading(true);
    setError(null);

    const [summaryResponse, allAlertsResponse, predictionsResponse] = await Promise.all([
      alertService.getAlertSummary(),
      alertService.getAllAlerts(),
      predictionService.getPredictionSummary()
    ]);

    console.log('Summary response:', summaryResponse);
    console.log('All alerts response:', allAlertsResponse);
    console.log('Predictions response:', predictionsResponse);

    // Extract summary stats correctly
    const summary = summaryResponse.summary || {};
    
    // Get total medicines from predictions response
    const totalMedicines = predictionsResponse.total_medicines || 0;
    
    setDashboardData({
      stats: {
        totalMedicines: totalMedicines,
        lowStockItems: summary.low_stock_alerts || 0,
        expiringItems: summary.expiry_alerts || 0,
        totalAlerts: summary.total_alerts || 0
      },
      alerts: allAlertsResponse || [],
      predictions: predictionsResponse.predictions || []
    });

  } catch (err) {
    console.error('Error fetching dashboard data:', err);
    setError(err.message || 'Failed to load dashboard data');
  } finally {
    setLoading(false);
  }
}, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const refreshData = useCallback(async () => {
    setDashboardData(prev => ({
      ...prev,
      predictions: []
    }));
    
    await fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    loading,
    error,
    dashboardData,
    refreshData
  };
};