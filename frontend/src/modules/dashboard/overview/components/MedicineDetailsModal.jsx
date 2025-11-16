import React, { useState, useEffect } from 'react';
import { X, Package, AlertTriangle, Clock, Calendar } from 'lucide-react';
import alertService from '../services/alertService.js';

const MedicineDetailsModal = ({ isOpen, onClose, type, title }) => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen && type) {
      fetchMedicines();
    }
  }, [isOpen, type]);

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      setError(null);
      
      let data = [];
      console.log('Fetching medicines for type:', type);
      
      if (type === 'low-stock') {
        console.log('Calling getLowStockMedicines...');
        data = await alertService.getLowStockMedicines();
        console.log('Raw low stock response:', data);
      } else if (type === 'expiring-soon') {
        console.log('Calling getExpiringSoonMedicines...');
        data = await alertService.getExpiringSoonMedicines(30);
        console.log('Raw expiring soon response:', data);
      }
      
      // Handle different response formats
      let medicineList = [];
      if (Array.isArray(data)) {
        medicineList = data;
      } else if (data && Array.isArray(data.medicines)) {
        medicineList = data.medicines;
      } else if (data && Array.isArray(data.items)) {
        medicineList = data.items;
      } else if (data && Array.isArray(data.data)) {
        medicineList = data.data;
      } else if (data && typeof data === 'object') {
        // Try to find any array property
        const keys = Object.keys(data);
        for (const key of keys) {
          if (Array.isArray(data[key])) {
            medicineList = data[key];
            break;
          }
        }
      }
      
      console.log('Processed medicine list:', medicineList);
      console.log('Medicine count:', medicineList.length);
      if (medicineList.length > 0) {
        console.log('First medicine sample:', medicineList[0]);
      }
      
      setMedicines(medicineList);
    } catch (err) {
      console.error('Error fetching medicines:', err);
      console.error('Error details:', err.response || err.message);
      setError(err.message || 'Failed to load medicines');
    } finally {
      setLoading(false);
    }
  };

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
      return 'Invalid Date';
    }
  };

  const getStockStatus = (currentStock, reorderLevel) => {
    const stock = Number(currentStock) || 0;
    const reorder = Number(reorderLevel) || 0;
    
    console.log('Stock status check:', { currentStock: stock, reorderLevel: reorder });
    
    if (stock === 0) return { text: 'Out of Stock', color: '#dc2626' };
    if (stock <= reorder) return { text: 'Low Stock', color: '#f59e0b' };
    return { text: 'In Stock', color: '#10b981' };
  };

  const getDaysUntilExpiry = (expiryDate) => {
    if (!expiryDate) return null;
    try {
      const today = new Date();
      const expiry = new Date(expiryDate);
      const diffTime = expiry - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    } catch (e) {
      return null;
    }
  };

  const getExpiryStatus = (days) => {
    if (days === null) return { text: 'N/A', color: '#6b7280' };
    if (days < 0) return { text: 'Expired', color: '#dc2626' };
    if (days <= 7) return { text: `${days} days left`, color: '#dc2626' };
    if (days <= 30) return { text: `${days} days left`, color: '#f59e0b' };
    return { text: `${days} days left`, color: '#10b981' };
  };

  if (!isOpen) return null;

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            {type === 'low-stock' ? (
              <AlertTriangle size={24} style={{ color: '#f59e0b' }} />
            ) : (
              <Clock size={24} style={{ color: '#dc2626' }} />
            )}
            <h2 style={styles.title}>{title}</h2>
          </div>
          <button style={styles.closeButton} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div style={styles.content}>
          {loading ? (
            <div style={styles.loadingContainer}>
              <div style={styles.spinner}></div>
              <p style={styles.loadingText}>Loading medicines...</p>
            </div>
          ) : error ? (
            <div style={styles.errorContainer}>
              <AlertTriangle size={48} style={{ color: '#dc2626' }} />
              <h3 style={styles.errorTitle}>Error Loading Data</h3>
              <p style={styles.errorText}>{error}</p>
              <button style={styles.retryButton} onClick={fetchMedicines}>
                Retry
              </button>
            </div>
          ) : medicines.length === 0 ? (
            <div style={styles.emptyContainer}>
              <Package size={48} style={{ color: '#9ca3af' }} />
              <p style={styles.emptyText}>No medicines found</p>
            </div>
          ) : (
            <div style={styles.tableContainer}>
              <table style={styles.table}>
                <thead>
                  <tr style={styles.tableHeaderRow}>
                    <th style={styles.tableHeader}>Medicine Name</th>
                    {type === 'low-stock' && (
                      <>
                        <th style={styles.tableHeader}>Current Stock</th>
                        <th style={styles.tableHeader}>Reorder Level</th>
                        <th style={styles.tableHeader}>Status</th>
                      </>
                    )}
                    {type === 'expiring-soon' && (
                      <>
                        <th style={styles.tableHeader}>Expiry Date</th>
                        <th style={styles.tableHeader}>Status</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {medicines.map((medicine, index) => {
                    const stockStatus = type === 'low-stock' 
                      ? getStockStatus(medicine.current_stock || medicine.stock_quantity, medicine.reorder_level)
                      : null;
                    
                    const daysLeft = type === 'expiring-soon' 
                      ? getDaysUntilExpiry(medicine.expiry_date)
                      : null;
                    
                    const expiryStatus = type === 'expiring-soon' 
                      ? getExpiryStatus(daysLeft)
                      : null;

                    return (
                      <tr key={medicine.medicine_id || index} style={styles.tableRow}>
                        <td style={styles.tableCell}>
                          <div style={styles.medicineName}>
                            <Package size={16} style={{ color: '#6b7280' }} />
                            <span style={styles.medicineNameText}>
                              {medicine.name || medicine.medicine_name || 'Unknown'}
                            </span>
                          </div>
                        </td>
                        
                        {type === 'low-stock' && (
                          <>
                            <td style={styles.tableCell}>
                              <span style={styles.stockNumber}>
                                {medicine.current_stock || medicine.stock_quantity || 0}
                              </span>
                            </td>
                            <td style={styles.tableCell}>
                              <span style={styles.stockNumber}>
                                {medicine.reorder_level || 0}
                              </span>
                            </td>
                            <td style={styles.tableCell}>
                              <span style={{
                                ...styles.statusBadge,
                                backgroundColor: `${stockStatus.color}15`,
                                color: stockStatus.color,
                                border: `1px solid ${stockStatus.color}30`
                              }}>
                                {stockStatus.text}
                              </span>
                            </td>
                          </>
                        )}
                        
                        {type === 'expiring-soon' && (
                          <>
                            <td style={styles.tableCell}>
                              <div style={styles.dateContainer}>
                                <Calendar size={14} style={{ color: '#6b7280' }} />
                                {formatDate(medicine.expiry_date)}
                              </div>
                            </td>
                            <td style={styles.tableCell}>
                              <span style={{
                                ...styles.statusBadge,
                                backgroundColor: `${expiryStatus.color}15`,
                                color: expiryStatus.color,
                                border: `1px solid ${expiryStatus.color}30`
                              }}>
                                {expiryStatus.text}
                              </span>
                            </td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        {!loading && !error && medicines.length > 0 && (
          <div style={styles.footer}>
            <p style={styles.footerText}>
              Showing {medicines.length} {medicines.length === 1 ? 'medicine' : 'medicines'}
            </p>
            <button style={styles.closeFooterButton} onClick={onClose}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const styles = {
  overlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '20px',
  },
  modal: {
    backgroundColor: '#ffffff',
    borderRadius: '12px',
    width: '100%',
    maxWidth: '900px',
    maxHeight: '90vh',
    display: 'flex',
    flexDirection: 'column',
    boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '24px',
    borderBottom: '1px solid #e5e7eb',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  },
  closeButton: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    padding: '8px',
    color: '#6b7280',
    borderRadius: '6px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '24px',
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: '16px',
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },
  loadingText: {
    color: '#6b7280',
    fontSize: '14px',
  },
  errorContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: '16px',
  },
  errorTitle: {
    fontSize: '18px',
    fontWeight: '600',
    color: '#111827',
    margin: 0,
  },
  errorText: {
    color: '#6b7280',
    fontSize: '14px',
    textAlign: 'center',
  },
  retryButton: {
    padding: '10px 20px',
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  emptyContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '60px 20px',
    gap: '12px',
  },
  emptyText: {
    color: '#6b7280',
    fontSize: '14px',
  },
  tableContainer: {
    overflowX: 'auto',
  },
  table: {
    width: '100%',
    borderCollapse: 'collapse',
  },
  tableHeaderRow: {
    backgroundColor: '#f9fafb',
  },
  tableHeader: {
    padding: '12px 16px',
    textAlign: 'left',
    fontSize: '12px',
    fontWeight: '600',
    color: '#374151',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    borderBottom: '1px solid #e5e7eb',
  },
  tableRow: {
    borderBottom: '1px solid #e5e7eb',
    transition: 'background-color 0.2s',
  },
  tableCell: {
    padding: '16px',
    fontSize: '14px',
    color: '#374151',
  },
  medicineName: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  medicineNameText: {
    fontWeight: '600',
    color: '#111827',
  },
  stockNumber: {
    fontWeight: '600',
    fontSize: '15px',
    color: '#111827',
  },
  dateContainer: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '6px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    fontWeight: '600',
    textAlign: 'center',
  },
  footer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '16px 24px',
    borderTop: '1px solid #e5e7eb',
    backgroundColor: '#f9fafb',
  },
  footerText: {
    fontSize: '14px',
    color: '#6b7280',
    margin: 0,
  },
  closeFooterButton: {
    padding: '10px 20px',
    backgroundColor: '#ffffff',
    color: '#374151',
    border: '1.5px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
};

export default MedicineDetailsModal;
