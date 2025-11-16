import React, { useState, useEffect, useCallback } from 'react';
import MedicineTable from '../components/MedicineTable.jsx';
import { CheckCircle, XCircle } from 'lucide-react';
import AddMedicineModal from '../components/AddMedicineModal.jsx';
import FilterBar from '../components/FilterBar.jsx';
import Pagination from '../components/Pagination.jsx';
import { medicineService } from '../services/medicineService.js';
import EditMedicineModal from '../components/EditMedicineModal.jsx';
import StockAdjustModal from '../components/StockAdjustModal.jsx';
import DeleteConfirmModal from '../components/DeleteConfirmModal.jsx';

const MedicineInventoryPage = () => {
  const [medicines, setMedicines] = useState([]);
  const [allMedicines, setAllMedicines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showStockAdjustModal, setShowStockAdjustModal] = useState(false);
  const [selectedMedicine, setSelectedMedicine] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  const ITEMS_PER_PAGE = 10;

  const showNotification = useCallback((message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification(prev => ({ ...prev, show: false }));
    }, 3000);
  }, []);

  // Function to filter medicines based on search query
  const filterMedicines = useCallback((data, query) => {
    if (!query || query.trim() === '') {
      console.log('No search query, returning all data:', data.length, 'items');
      return data;
    }
    
    const searchLower = query.toLowerCase().trim();
    console.log('Filtering with query:', searchLower);
    console.log('Sample medicine object:', data[0]);
    
    const filtered = data.filter(medicine => {
      // Try different possible field names
      const name = (medicine.name || medicine.medicine_name || medicine.medicineName || '').toLowerCase();
      const category = (medicine.category || medicine.medicine_category || '').toLowerCase();
      const manufacturer = (medicine.manufacturer || medicine.medicine_manufacturer || '').toLowerCase();
      const description = (medicine.description || '').toLowerCase();
      
      const matches = name.includes(searchLower) || 
                     category.includes(searchLower) || 
                     manufacturer.includes(searchLower) ||
                     description.includes(searchLower);
      
      if (matches) {
        console.log('Match found:', medicine);
      }
      
      return matches;
    });
    
    console.log('Filtered results:', filtered.length, 'out of', data.length, 'items');
    return filtered;
  }, []);

  // Function to paginate data client-side
  const paginateData = useCallback((data, page) => {
    const startIndex = (page - 1) * ITEMS_PER_PAGE;
    const endIndex = startIndex + ITEMS_PER_PAGE;
    const paginatedItems = data.slice(startIndex, endIndex);
    const calculatedTotalPages = Math.ceil(data.length / ITEMS_PER_PAGE) || 1;
    
    return {
      items: paginatedItems,
      totalPages: calculatedTotalPages,
      totalItems: data.length
    };
  }, []);

  const fetchMedicines = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await medicineService.getAllMedicines();
      
      console.log('API Response:', response);
      
      let allData = [];
      
      // Handle both array and paginated response
      if (Array.isArray(response)) {
        allData = response;
      } else if (response && (response.items || response.data)) {
        allData = response.items || response.data;
      } else {
        console.warn('Unexpected response format:', response);
        allData = [];
      }
      
      // Store all medicines
      setAllMedicines(allData);
      
    } catch (err) {
      console.error('Error fetching medicines:', err);
      setError(err.message || 'Failed to load medicines');
      setMedicines([]);
      setAllMedicines([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Effect to fetch data on mount
  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  // Effect to handle search, filter, and pagination
  useEffect(() => {
    if (allMedicines.length > 0) {
      console.log('Processing medicines with search:', searchQuery);
      
      // Apply search filter
      let filteredData = filterMedicines(allMedicines, searchQuery);
      
      console.log('Filtered results:', filteredData.length, 'items');
      
      // Paginate the filtered data
      const { items, totalPages: pages, totalItems: total } = paginateData(filteredData, currentPage);
      
      setMedicines(items);
      setTotalPages(pages);
      setTotalItems(total);
    } else {
      setMedicines([]);
      setTotalPages(1);
      setTotalItems(0);
    }
  }, [allMedicines, searchQuery, currentPage, filterMedicines, paginateData]);

  const handleAddMedicine = async (medicineData) => {
    try {
      const result = await medicineService.createMedicine(medicineData);
      console.log('Medicine created:', result);
      setShowAddModal(false);
      
      setCurrentPage(1);
      setSearchQuery('');
      setFilterCategory('');
      
      showNotification('Medicine added successfully!', 'success');
      
      setTimeout(() => {
        fetchMedicines();
      }, 500);
    } catch (err) {
      console.error('Error adding medicine:', err);
      showNotification(`Error: ${err.message}`, 'error');
      throw err;
    }
  };

  const handleEditMedicine = (medicine) => {
    setSelectedMedicine(medicine);
    setShowEditModal(true);
  };

  const handleUpdateMedicine = async (medicineId, updateData) => {
    try {
      await medicineService.updateMedicine(medicineId, updateData);
      setShowEditModal(false);
      setSelectedMedicine(null);
      await fetchMedicines();
      showNotification('Medicine updated successfully!', 'success');
    } catch (err) {
      console.error('Error updating medicine:', err);
      showNotification(`Error: ${err.message}`, 'error');
      throw err;
    }
  };

  const handleDeleteMedicine = (medicine) => {
    setSelectedMedicine(medicine);
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    try {
      await medicineService.deleteMedicine(selectedMedicine.medicine_id || selectedMedicine.id);
      setShowDeleteModal(false);
      setSelectedMedicine(null);
      
      // If deleting the last item on a page, go to previous page
      if (medicines.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
      
      await fetchMedicines();
      showNotification('Medicine deleted successfully!', 'success');
    } catch (err) {
      console.error('Error deleting medicine:', err);
      showNotification(`Error: ${err.message}`, 'error');
    }
  };

  const handleStockAdjust = (medicine) => {
    setSelectedMedicine(medicine);
    setShowStockAdjustModal(true);
  };

  const handleStockAdjustment = async (medicineId, adjustmentData) => {
    try {
      await medicineService.adjustStock(medicineId, adjustmentData);
      setShowStockAdjustModal(false);
      setSelectedMedicine(null);
      await fetchMedicines();
      showNotification('Stock adjusted successfully!', 'success');
    } catch (err) {
      console.error('Error adjusting stock:', err);
      showNotification(`Error: ${err.message}`, 'error');
      throw err;
    }
  };

  const handleSearch = (query) => {
    console.log('Search triggered with query:', query);
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleFilterChange = (category) => {
    setFilterCategory(category);
    setCurrentPage(1);
  };

  const handlePageChange = (newPage) => {
    console.log('Changing to page:', newPage);
    setCurrentPage(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const notificationBannerStyle = {
    position: 'fixed',
    top: '80px',
    right: '20px',
    zIndex: 1050,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 18px',
    borderRadius: '8px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
    minWidth: '320px',
    maxWidth: '420px',
    color: '#fff',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'transform 0.3s ease-out, opacity 0.3s ease-out',
    transform: notification.show ? 'translateX(0)' : 'translateX(120%)',
    opacity: notification.show ? 1 : 0,
    visibility: notification.show ? 'visible' : 'hidden',
  };

  const successStyle = {
    backgroundColor: '#10b981',
    border: '1px solid #059669',
  };

  const errorStyle = {
    backgroundColor: '#ef4444',
    border: '1px solid #dc2626',
  };

  const closeButtonStyle = {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '20px',
    lineHeight: 1,
    cursor: 'pointer',
    opacity: 0.9,
    padding: '0 4px',
    marginLeft: 'auto',
    transition: 'opacity 0.2s',
  };

  return (
    <div className="inventory-page">
      {/* Notification Banner */}
      <div
        style={{
          ...notificationBannerStyle,
          ...(notification.type === 'success' ? successStyle : errorStyle),
        }}
      >
        {notification.type === 'success' ? (
          <CheckCircle size={22} strokeWidth={2.5} />
        ) : (
          <XCircle size={22} strokeWidth={2.5} />
        )}
        <span style={{ flexGrow: 1 }}>{notification.message}</span>
        <button 
          style={closeButtonStyle} 
          onClick={() => setNotification(prev => ({ ...prev, show: false }))}
          onMouseEnter={(e) => e.target.style.opacity = '1'}
          onMouseLeave={(e) => e.target.style.opacity = '0.9'}
        >
          ×
        </button>
      </div>

      <div className="page-header">
        <div>
          <h1>Medicine Inventory</h1>
          <p>Manage your medicine stock and inventory</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={() => setShowAddModal(true)}
        >
          + Add Medicine
        </button>
      </div>

      <FilterBar 
        onSearch={handleSearch}
        onFilterChange={handleFilterChange}
        searchQuery={searchQuery}
        filterCategory={filterCategory}
      />

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading medicines...</p>
        </div>
      ) : error ? (
        <div className="error-container">
          <h3>Error Loading Medicines</h3>
          <p>{error}</p>
          <button className="btn-primary" onClick={fetchMedicines}>
            Retry
          </button>
        </div>
      ) : (
        <>
          <MedicineTable 
            medicines={medicines}
            onEdit={handleEditMedicine}
            onDelete={handleDeleteMedicine}
            onStockAdjust={handleStockAdjust}
          />
          
          {/* Show pagination info and controls */}
          {totalItems > 0 ? (
            <div style={{ marginTop: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '10px', color: '#666' }}>
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1} to {Math.min(currentPage * ITEMS_PER_PAGE, totalItems)} of {totalItems} medicines
              </div>
              <Pagination 
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePageChange}
              />
            </div>
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
              {searchQuery ? 'No medicines found matching your search.' : 'No medicines available.'}
            </div>
          )}
        </>
      )}

      <AddMedicineModal 
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAdd={handleAddMedicine}
      />

      <EditMedicineModal 
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedMedicine(null);
        }}
        medicine={selectedMedicine}
        onUpdate={handleUpdateMedicine}
      />

      <StockAdjustModal 
        isOpen={showStockAdjustModal}
        onClose={() => {
          setShowStockAdjustModal(false);
          setSelectedMedicine(null);
        }}
        medicine={selectedMedicine}
        onAdjust={handleStockAdjustment}
      />

      <DeleteConfirmModal 
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedMedicine(null);
        }}
        medicine={selectedMedicine}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};

export default MedicineInventoryPage;