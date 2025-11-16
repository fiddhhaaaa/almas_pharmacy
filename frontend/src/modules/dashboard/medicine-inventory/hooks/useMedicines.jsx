import { useState, useEffect, useCallback } from 'react';
import { medicineService } from '../services/medicineService';

export const useMedicines = () => {
  const [medicines, setMedicines] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const itemsPerPage = 10;

  const fetchMedicines = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const skip = (currentPage - 1) * itemsPerPage;
      const data = await medicineService.getAll({
        skip,
        limit: itemsPerPage,
        search: searchQuery,
        sort_by: sortBy,
        order: sortOrder
      });
      
      setMedicines(data.medicines || data);
      setTotalCount(data.total || data.length);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    fetchMedicines();
  }, [fetchMedicines]);

  const createMedicine = async (medicineData) => {
    await medicineService.create(medicineData);
    await fetchMedicines();
  };

  const updateMedicine = async (id, medicineData) => {
    await medicineService.update(id, medicineData);
    await fetchMedicines();
  };

  const deleteMedicine = async (id) => {
    await medicineService.delete(id);
    await fetchMedicines();
  };

  const handleSearch = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  return {
    medicines,
    loading,
    error,
    totalCount,
    currentPage,
    setCurrentPage,
    searchQuery,
    handleSearch,
    sortBy,
    sortOrder,
    handleSort,
    itemsPerPage,
    createMedicine,
    updateMedicine,
    deleteMedicine,
    refresh: fetchMedicines
  };
};