// src/modules/dashboard/overview/services/predictionService.js
// UPDATED: Added cache-busting and proper headers

import { API_BASE_URL, API_HEADERS } from '../../../../config/api.js';

const predictionService = {
  // Get prediction summary for dashboard
  getPredictionSummary: async () => {
    try {
      // Add timestamp to prevent caching
      const timestamp = new Date().getTime();
      const response = await fetch(
        `${API_BASE_URL}/api/predictions/summary?_t=${timestamp}`, 
        {
          method: 'GET',
          headers: API_HEADERS,
          cache: 'no-cache' // Prevent browser caching
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch prediction summary');
      }
      
      const data = await response.json();
      return data.data || data; // Handle both {data: {...}} and direct response
    } catch (error) {
      console.error('Error fetching prediction summary:', error);
      throw error;
    }
  },

  // Get predicted demand
  getPredictedDemand: async () => {
    try {
      const timestamp = new Date().getTime();
      const response = await fetch(
        `${API_BASE_URL}/api/predictions/upload?_t=${timestamp}`, 
        {
          method: 'GET',
          headers: API_HEADERS,
          cache: 'no-cache'
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch predicted demand');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching predicted demand:', error);
      throw error;
    }
  },

  // Upload CSV for predictions
  uploadPredictionData: async (file) => {
    try {
      const formData = new FormData();
      formData.append('file', file);

      // Get auth token from localStorage
      const token = localStorage.getItem('authToken');
      
      const response = await fetch(`${API_BASE_URL}/api/sales/upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'ngrok-skip-browser-warning': 'true'
          // Don't set Content-Type - browser will set it with boundary for FormData
        },
        body: formData
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || errorData.message || 'Failed to upload prediction data');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error uploading prediction data:', error);
      throw error;
    }
  },

  // Get predictions for specific medicine
  getMedicinePredictions: async (medicineId) => {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/predictions/${medicineId}`, 
        {
          method: 'GET',
          headers: API_HEADERS
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch medicine predictions');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching medicine predictions:', error);
      throw error;
    }
  }
};

export default predictionService;