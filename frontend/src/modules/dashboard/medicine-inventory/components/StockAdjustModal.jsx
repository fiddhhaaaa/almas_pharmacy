import React, { useState } from 'react';
import { Package } from 'lucide-react';

const StockAdjustModal = ({ isOpen, onClose, onAdjust, medicine }) => {
  const [adjustment, setAdjustment] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await onAdjust(medicine.medicine_id, {
      adjustment: parseInt(adjustment),
      reason: reason
      });
      onClose();
      setAdjustment('');
      setReason('');
    } catch (err) {
      setError(err.message || 'Failed to adjust stock');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const newQuantity = (medicine?.current_stock || 0) + parseInt(adjustment || 0);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <Package size={24} style={{ color: '#2563eb', marginRight: '8px', verticalAlign: 'middle' }} />
            Adjust Stock
          </h3>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="error-message">{error}</div>}
            
            <div style={{ 
              padding: '12px', 
              backgroundColor: '#f3f4f6', 
              borderRadius: '8px', 
              marginBottom: '16px' 
            }}>
              <p style={{ margin: '4px 0' }}>
                <strong>Medicine:</strong> {medicine?.medicine_name}
              </p>
              <p style={{ margin: '4px 0' }}>
                <strong>Current Stock:</strong> {medicine?.current_stock || 0} units
              </p>
            </div>
            
            <div className="form-group">
              <label>Adjustment Amount *</label>
              <input
                type="number"
                value={adjustment}
                onChange={(e) => setAdjustment(e.target.value)}
                required
                placeholder="Enter positive or negative value"
              />
              <small>Use negative values to reduce stock (e.g., -10)</small>
            </div>
            
            {adjustment && (
              <div style={{ 
                padding: '12px', 
                backgroundColor: newQuantity < 0 ? '#fef2f2' : '#f0fdf4', 
                borderRadius: '8px', 
                marginBottom: '16px',
                color: newQuantity < 0 ? '#dc2626' : '#059669',
                fontWeight: '600'
              }}>
                <strong>New Stock:</strong> {newQuantity} units
                {newQuantity < 0 && <span style={{ color: '#dc2626' }}> (Invalid: Cannot be negative)</span>}
              </div>
            )}
            
            <div className="form-group">
              <label>Reason *</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                rows="3"
                placeholder="Reason for adjustment (e.g., Damaged goods, Stock correction)"
              />
            </div>
          </div>
          
          <div className="modal-footer">
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loading || newQuantity < 0}
            >
              {loading ? 'Adjusting...' : 'Adjust Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
export default StockAdjustModal;