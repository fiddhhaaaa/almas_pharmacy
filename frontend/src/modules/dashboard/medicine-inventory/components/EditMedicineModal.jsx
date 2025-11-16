import React, { useState, useEffect } from 'react';

const EditMedicineModal = ({ isOpen, onClose, onUpdate, medicine }) => {
  const [formData, setFormData] = useState({
    medicine_name: '',
    batch_no: '',
    unit_price: '',
    safety_stock: '',
    lead_time_days: '',
    expiry_date: '',
    current_stock: ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (medicine) {
      setFormData({
        medicine_name: medicine.medicine_name || '',
        batch_no: medicine.batch_no || '',
        unit_price: medicine.unit_price || '',
        safety_stock: medicine.safety_stock || '',
        lead_time_days: medicine.lead_time_days || '',
        expiry_date: medicine.expiry_date ? medicine.expiry_date.split('T')[0] : '',
        current_stock: medicine.current_stock || ''
      });
    }
  }, [medicine]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await onUpdate(medicine.medicine_id, {
        medicine_name: formData.medicine_name,
        batch_no: formData.batch_no,
        unit_price: parseFloat(formData.unit_price),
        safety_stock: parseInt(formData.safety_stock),
        lead_time_days: parseInt(formData.lead_time_days),
        expiry_date: formData.expiry_date
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to update medicine');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>Edit Medicine</h3>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-message">{error}</div>}
            
            <div className="form-grid">
              <div className="form-group">
                <label>Medicine Name *</label>
                <input
                  type="text"
                  name="medicine_name"
                  value={formData.medicine_name}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Batch Number *</label>
                <input
                  type="text"
                  name="batch_no"
                  value={formData.batch_no}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Unit Price ($) *</label>
                <input
                  type="number"
                  name="unit_price"
                  step="0.01"
                  value={formData.unit_price}
                  onChange={handleChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Current Stock *</label>
                <input
                  type="number"
                  name="current_stock"
                  value={formData.current_stock}
                  onChange={handleChange}
                  required
                  disabled
                  title="Use 'Adjust Stock' button to change stock quantity"
                />
                <small>Use "Adjust Stock" to modify quantity</small>
              </div>
              
              <div className="form-group">
                <label>Safety Stock Level *</label>
                <input
                  type="number"
                  name="safety_stock"
                  value={formData.safety_stock}
                  onChange={handleChange}
                  required
                />
                <small>Alert when stock falls below this level</small>
              </div>
              
              <div className="form-group">
                <label>Lead Time (Days) *</label>
                <input
                  type="number"
                  name="lead_time_days"
                  value={formData.lead_time_days}
                  onChange={handleChange}
                  required
                />
                <small>Days needed to restock</small>
              </div>
              
              <div className="form-group">
                <label>Expiry Date *</label>
                <input
                  type="date"
                  name="expiry_date"
                  value={formData.expiry_date}
                  onChange={handleChange}
                  required
                />
              </div>
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Updating...' : 'Update Medicine'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default EditMedicineModal;