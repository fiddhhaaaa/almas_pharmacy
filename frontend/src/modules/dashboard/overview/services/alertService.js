import { API_BASE_URL, API_HEADERS } from '../../../../config/api.js';

export const alertService = {
  // Get alert summary for dashboard
  getAlertSummary: async () => {
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(
        `${API_BASE_URL}/api/alerts/summary?_t=${timestamp}`, 
        {
          method: 'GET',
          headers: API_HEADERS,
          cache: 'no-cache'
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch alert summary');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching alert summary:', error);
      throw error;
    }
  },

  // Get all alerts (backend already validates and returns only active alerts)
  getAllAlerts: async () => {
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(
        `${API_BASE_URL}/api/alerts/?_t=${timestamp}`, 
        {
          method: 'GET',
          headers: API_HEADERS,
          cache: 'no-cache'
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch alerts');
      }
      
      const alerts = await response.json();
      return Array.isArray(alerts) ? alerts : [];
    } catch (error) {
      console.error('Error fetching alerts:', error);
      throw error;
    }
  },

  // Get medicines with low stock
  getLowStockMedicines: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/alerts/low-stock`, {
        method: 'GET',
        headers: API_HEADERS
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch low stock medicines');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching low stock medicines:', error);
      throw error;
    }
  },

  // Get medicines expiring soon
  getExpiringSoonMedicines: async (days = 30) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/alerts/expiring-soon?days=${days}`, 
        {
          method: 'GET',
          headers: API_HEADERS
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch expiring medicines');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching expiring medicines:', error);
      throw error;
    }
  },

  // Generate system alerts
  generateAlerts: async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/alerts/generate`, {
        method: 'POST',
        headers: API_HEADERS
      });
      
      if (!response.ok) {
        throw new Error('Failed to generate alerts');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error generating alerts:', error);
      throw error;
    }
  },

  // Create custom alert
  createAlert: async (alertData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/alerts/`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify(alertData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to create alert');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating alert:', error);
      throw error;
    }
  },

  // Get specific alert by ID
  getAlertById: async (alertId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/alerts/${alertId}`, {
        method: 'GET',
        headers: API_HEADERS
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch alert');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching alert:', error);
      throw error;
    }
  },

  // Delete an alert
  deleteAlert: async (alertId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/alerts/${alertId}`, {
        method: 'DELETE',
        headers: API_HEADERS
      });
      
      if (!response.ok) {
        throw new Error('Failed to delete alert');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error deleting alert:', error);
      throw error;
    }
  },

  // Clear all alerts
  clearAllAlerts: async (alertType = null) => {
    try {
      const url = alertType 
        ? `${API_BASE_URL}/api/alerts/clear/all?alert_type=${alertType}`
        : `${API_BASE_URL}/api/alerts/clear/all`;
        
      const response = await fetch(url, {
        method: 'DELETE',
        headers: API_HEADERS
      });
      
      if (!response.ok) {
        throw new Error('Failed to clear all alerts');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error clearing all alerts:', error);
      throw error;
    }
  },

  // Clear old alerts
  clearOldAlerts: async (days = 30) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/alerts/clear/old?days=${days}`, 
        {
          method: 'DELETE',
          headers: API_HEADERS
        }
      );
      
      if (!response.ok) {
        throw new Error('Failed to clear old alerts');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error clearing old alerts:', error);
      throw error;
    }
  }
};

export default alertService;