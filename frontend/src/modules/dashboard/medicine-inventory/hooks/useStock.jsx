import { useState } from 'react';

export const useStock = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const adjustStock = async (medicineId, adjustment, reason) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await stockService.adjust(medicineId, {
        adjustment,
        reason
      });
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const replenishStock = async (medicineId, quantity, reason) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await stockService.replenish(medicineId, {
        quantity,
        reason
      });
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updateStock = async (medicineId, quantity) => {
    setLoading(true);
    setError(null);
    
    try {
      const data = await stockService.update(medicineId, quantity);
      return data;
    } catch (err) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    adjustStock,
    replenishStock,
    updateStock
  };
};
