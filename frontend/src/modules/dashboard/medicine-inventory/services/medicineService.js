import { API_BASE_URL, API_HEADERS } from '../../../../config/api.js';

export const medicineService = {
  // Get all medicines with pagination and filters
  // FIXED: Added cache busting to ensure fresh data after adding medicines
  getAllMedicines: async (params = {}) => {
    try {
      const queryParams = new URLSearchParams();
      
      if (params.page) queryParams.append('page', params.page);
      if (params.limit) queryParams.append('limit', params.limit);
      if (params.search) queryParams.append('search', params.search);
      if (params.sort) queryParams.append('sort', params.sort);
      
      // ✅ ADD CACHE BUSTER - Forces browser to fetch fresh data
      queryParams.append('_t', Date.now());
      
      const url = `${API_BASE_URL}/medicines/${queryParams.toString() ? '?' + queryParams.toString() : ''}`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          ...API_HEADERS,
          'Cache-Control': 'no-cache', // ✅ Also prevent caching at header level
          'Pragma': 'no-cache'
        }
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch medicines');
      }
      
      // Backend already returns medicines with stock data merged
      const medicines = await response.json();
      return medicines;
      
    } catch (error) {
      console.error('Error fetching medicines:', error);
      throw error;
    }
  },

  // Create new medicine
  createMedicine: async (medicineData) => {
    try {
      console.log('Creating medicine with data:', medicineData);
      
      const response = await fetch(`${API_BASE_URL}/medicines/`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify(medicineData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error Response:', errorData);

        // Handle array of error objects (FastAPI validation errors)
        if (Array.isArray(errorData.detail)) {
          const errors = errorData.detail.map(err => `${err.loc?.join(' -> ')}: ${err.msg}`).join(', ');
          throw new Error(errors);
        } else if (typeof errorData.detail === 'string') {
          throw new Error(errorData.detail);
        } else {
          throw new Error(JSON.stringify(errorData) || 'Failed to create medicine');
        }
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error creating medicine:', error);
      throw error;
    }
  },

  // Get medicine by ID
  getMedicineById: async (medicineId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/medicines/${medicineId}`, {
        method: 'GET',
        headers: API_HEADERS
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to fetch medicine details');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching medicine details:', error);
      throw error;
    }
  },

  // Update medicine
  updateMedicine: async (medicineId, medicineData) => {
    try {
      const response = await fetch(`${API_BASE_URL}/medicines/${medicineId}`, {
        method: 'PUT',
        headers: API_HEADERS,
        body: JSON.stringify(medicineData)
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to update medicine');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error updating medicine:', error);
      throw error;
    }
  },

  // Delete medicine
  deleteMedicine: async (medicineId) => {
    try {
      const response = await fetch(`${API_BASE_URL}/medicines/${medicineId}`, {
        method: 'DELETE',
        headers: API_HEADERS
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Failed to delete medicine');
      }
      
      // Try to parse JSON, but handle empty responses
      try {
        const text = await response.text();
        return text ? JSON.parse(text) : { success: true, message: 'Deleted successfully' };
      } catch (parseError) {
        // If parsing fails, it's likely an empty response (which is fine for DELETE)
        return { success: true, message: 'Medicine deleted successfully' };
      }
    } catch (error) {
      console.error('Error deleting medicine:', error);
      throw error;
    }
  },

  // Adjust stock for a medicine
  adjustStock: async (medicineId, adjustmentData) => {
    try {
      console.log('Adjusting stock for medicine:', medicineId, adjustmentData);
      
      // First, get current medicine data
      const currentMedicine = await medicineService.getMedicineById(medicineId);
      
      // Calculate new stock quantity
      const newQuantity = (currentMedicine.current_stock || 0) + adjustmentData.adjustment;
      
      if (newQuantity < 0) {
        throw new Error('Stock quantity cannot be negative');
      }
      
      // Update medicine with new stock quantity
      const response = await fetch(`${API_BASE_URL}/medicines/${medicineId}`, {
        method: 'PUT',
        headers: API_HEADERS,
        body: JSON.stringify({
          ...currentMedicine,
          current_stock: newQuantity,
          stock_quantity: newQuantity
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Stock adjustment error:', errorData);
        
        if (Array.isArray(errorData.detail)) {
          const errors = errorData.detail.map(err => 
            `${err.loc?.join(' -> ')}: ${err.msg}`
          ).join(', ');
          throw new Error(errors);
        } else if (typeof errorData.detail === 'string') {
          throw new Error(errorData.detail);
        } else {
          throw new Error('Failed to adjust stock');
        }
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error adjusting stock:', error);
      throw error;
    }
  }
};

export default medicineService;