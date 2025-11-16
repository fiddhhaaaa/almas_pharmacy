import React, { useState } from 'react';
import { AlertCircle } from 'lucide-react';

const DeleteConfirmModal = ({ isOpen, onClose, onConfirm, medicine }) => {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    setLoading(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      console.error('Delete failed:', err);
      alert('Failed to delete medicine');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>
            <AlertCircle size={24} style={{ color: '#dc2626', marginRight: '8px', verticalAlign: 'middle' }} />
            Delete Medicine
          </h3>
          <button className="modal-close-btn" onClick={onClose}>×</button>
        </div>
        
        <div className="modal-body">
          <p>Are you sure you want to delete <strong>{medicine?.medicine_name}</strong>?</p>
          <p style={{ color: '#6b7280', fontSize: '14px' }}>This action cannot be undone.</p>
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
            type="button" 
            className="btn-primary" 
            onClick={handleConfirm}
            disabled={loading}
            style={{ backgroundColor: '#dc2626' }}
          >
            {loading ? 'Deleting...' : 'Delete'}
          </button>
        </div>
      </div>
    </div>
  );
};
export default DeleteConfirmModal;