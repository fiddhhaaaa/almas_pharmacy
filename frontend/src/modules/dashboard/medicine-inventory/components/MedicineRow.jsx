import React from 'react';
import { Edit2, Package, Trash2 } from 'lucide-react';

const MedicineRow = ({ medicine, onEdit, onDelete, onStockAdjust }) => {
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (e) {
      return 'N/A';
    }
  };

  const getStockStatus = (quantity, reorderLevel) => {
    if (quantity === 0) return 'out-of-stock';
    if (quantity <= reorderLevel) return 'low-stock';
    return 'in-stock';
  };

  const stockStatus = getStockStatus(
    medicine.current_stock || 0, 
    medicine.safety_stock || 10
  );

  return (
    <tr>
      <td>{medicine.medicine_name || 'N/A'}</td>
      <td>{medicine.batch_no || 'N/A'}</td>
      <td>
        <span className={`stock-badge ${stockStatus}`}>
          {medicine.current_stock || 0}
        </span>
      </td>
      <td>${(parseFloat(medicine.unit_price) || 0).toFixed(2)}</td>
      <td>{formatDate(medicine.expiry_date)}</td>
      <td>
        <div className="action-buttons">
          <button
            onClick={() => onEdit(medicine)}
            className="btn-icon btn-edit"
            title="Edit"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onStockAdjust(medicine)}
            className="btn-icon btn-stock"
            title="Adjust Stock"
          >
            <Package size={16} />
          </button>
          <button
            onClick={() => onDelete(medicine)}
            className="btn-icon btn-delete"
            title="Delete"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </td>
    </tr>
  );
};

export default MedicineRow;