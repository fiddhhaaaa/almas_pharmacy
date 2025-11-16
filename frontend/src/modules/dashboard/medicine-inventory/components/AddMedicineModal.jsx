// src/modules/dashboard/medicine-inventory/components/AddMedicineModal.jsx
// FIXED: Now matches backend Medicine model exactly

import React, { useState } from 'react';

const AddMedicineModal = ({ isOpen, onClose, onAdd }) => {
  const [formData, setFormData] = useState({
  medicine_name: '',
  batch_no: '',
  unit_price: '',
  safety_stock: '10',
  lead_time_days: '7',
  expiry_date: '',
  current_stock: '0'  // ✅ Correct field name
});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    
    // Validation
    if (!formData.medicine_name || !formData.batch_no || !formData.expiry_date) {
      setError('Please fill in all required fields');
      return;
    }

    if (!formData.unit_price || isNaN(formData.unit_price) || parseFloat(formData.unit_price) <= 0) {
      setError('Please enter a valid unit price');
      return;
    }

    if (!formData.safety_stock || isNaN(formData.safety_stock) || parseInt(formData.safety_stock) < 0) {
      setError('Please enter a valid safety stock level');
      return;
    }

    if (!formData.lead_time_days || isNaN(formData.lead_time_days) || parseInt(formData.lead_time_days) < 0) {
      setError('Please enter a valid lead time');
      return;
    }

    if (formData.current_stock === '' || isNaN(formData.current_stock) || parseInt(formData.current_stock) < 0) {
  setError('Please enter a valid current stock');
  return;
}

    try {
      setLoading(true);
      
      // Format data exactly as backend expects (MedicineCreate schema)
      const medicineData = {
  medicine_name: formData.medicine_name.trim(),
  batch_no: formData.batch_no.trim(),
  unit_price: parseFloat(formData.unit_price),
  safety_stock: parseInt(formData.safety_stock),
  lead_time_days: parseInt(formData.lead_time_days),
  expiry_date: formData.expiry_date,
  current_stock: parseInt(formData.current_stock)  // ✅ Correct
};

      console.log('Sending medicine data:', medicineData);
      
      await onAdd(medicineData);
      
      // Reset form
      setFormData({
  medicine_name: '',
  batch_no: '',
  unit_price: '',
  safety_stock: '10',
  lead_time_days: '7',
  expiry_date: '',
  current_stock: '0'  // ✅ Correct
});
      onClose();
    } catch (err) {
      console.error('Error adding medicine:', err);
      setError(err.message || 'Failed to add medicine');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={(e) => {
      if (e.target.className === 'modal-overlay') onClose();
    }}>
      <div className="modal-content modal-large">
        <div className="modal-header">
          <h3>Add New Medicine</h3>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && (
              <div className="error-message">{error}</div>
            )}
            
            <div className="form-grid">
              {/* Medicine Name - Required */}
              <div className="form-group">
                <label htmlFor="medicine_name">
                  Medicine Name *
                </label>
                <input
                  type="text"
                  id="medicine_name"
                  name="medicine_name"
                  value={formData.medicine_name}
                  onChange={handleChange}
                  placeholder="Enter medicine name"
                  required
                />
              </div>

              {/* Batch Number - Required */}
              <div className="form-group">
                <label htmlFor="batch_no">
                  Batch Number *
                </label>
                <input
                  type="text"
                  id="batch_no"
                  name="batch_no"
                  value={formData.batch_no}
                  onChange={handleChange}
                  placeholder="e.g., BATCH-2024-001"
                  required
                />
              </div>

              {/* Unit Price - Required */}
              <div className="form-group">
                <label htmlFor="unit_price">
                  Unit Price ($) *
                </label>
                <input
                  type="number"
                  id="unit_price"
                  name="unit_price"
                  value={formData.unit_price}
                  onChange={handleChange}
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  required
                />
              </div>

              {/* Initial Stock - Required */}
              <div className="form-group">
  <label htmlFor="current_stock">
    Current Stock Quantity *
  </label>
  <input
    type="number"
    id="current_stock"
    name="current_stock"
    value={formData.current_stock}
    onChange={handleChange}
    placeholder="0"
    min="0"
    required
  />
  <small className="form-hint">Starting quantity in inventory</small>
</div>

              {/* Safety Stock - Required */}
              <div className="form-group">
                <label htmlFor="safety_stock">
                  Safety Stock Level *
                </label>
                <input
                  type="number"
                  id="safety_stock"
                  name="safety_stock"
                  value={formData.safety_stock}
                  onChange={handleChange}
                  placeholder="10"
                  min="0"
                  required
                />
                <small className="form-hint">Minimum stock to maintain</small>
              </div>

              {/* Lead Time Days - Required */}
              <div className="form-group">
                <label htmlFor="lead_time_days">
                  Lead Time (Days) *
                </label>
                <input
                  type="number"
                  id="lead_time_days"
                  name="lead_time_days"
                  value={formData.lead_time_days}
                  onChange={handleChange}
                  placeholder="7"
                  min="1"
                  required
                />
                <small className="form-hint">Days to restock from supplier</small>
              </div>

              {/* Expiry Date - Required */}
              <div className="form-group">
                <label htmlFor="expiry_date">
                  Expiry Date *
                </label>
                <input
                  type="date"
                  id="expiry_date"
                  name="expiry_date"
                  value={formData.expiry_date}
                  onChange={handleChange}
                  min={new Date().toISOString().split('T')[0]}
                  required
                />
              </div>
            </div>

            {/* Info box explaining fields */}
            <div className="info-box">
              <strong>Field Definitions:</strong>
              <ul>
                <li><strong>Safety Stock:</strong> Minimum quantity to keep in stock (triggers low stock alerts)</li>
                <li><strong>Lead Time:</strong> Number of days to receive new stock from supplier</li>
                <li><strong>Current Stock:</strong> Starting quantity (creates stock record automatically)</li>
              </ul>
            </div>
          </div>

          <div className="modal-footer">
            <button 
              type="button" 
              className="btn-secondary" 
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary"
              disabled={loading}
            >
              {loading ? 'Adding Medicine...' : 'Add Medicine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddMedicineModal;