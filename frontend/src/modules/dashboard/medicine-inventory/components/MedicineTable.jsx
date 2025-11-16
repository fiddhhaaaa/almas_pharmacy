import React from 'react';
import MedicineRow from './MedicineRow.jsx';

const MedicineTable = ({ medicines, onEdit, onDelete, onStockAdjust }) => {
  return (
    <div className="table-container">
      <table className="medicine-table">
        <thead>
          <tr>
          <th>Medicine Name</th>
          <th>Batch No</th>
          <th>Stock Quantity</th>
          <th>Unit Price</th>
          <th>Expiry Date</th>
          <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {medicines && medicines.length > 0 ? (
            medicines.map((medicine) => (
              <MedicineRow
                key={medicine.medicine_id}
                medicine={medicine}
                onEdit={onEdit}
                onDelete={onDelete}
                onStockAdjust={onStockAdjust}
              />
            ))
          ) : (
            <tr>
              <td colSpan="6" className="empty-table-message">
                No medicines found
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
};

export default MedicineTable;