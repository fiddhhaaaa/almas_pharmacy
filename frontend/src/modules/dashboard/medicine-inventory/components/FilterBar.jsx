import React, { useState, useEffect } from 'react';

const FilterBar = ({ onSearch, onFilterChange, searchQuery, filterCategory }) => {
  const [localSearch, setLocalSearch] = useState(searchQuery || '');

  // Sync local search with prop changes
  useEffect(() => {
    setLocalSearch(searchQuery || '');
  }, [searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    const trimmedSearch = localSearch.trim();
    console.log('FilterBar - Search submitted:', trimmedSearch);
    if (onSearch) {
      onSearch(trimmedSearch);
    } else {
      console.error('FilterBar - onSearch prop is not defined!');
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setLocalSearch(value);
    
    // If user clears the search, trigger search immediately
    if (value === '' && onSearch) {
      onSearch('');
    }
  };

  const handleKeyDown = (e) => {
    // Trigger search on Enter key
    if (e.key === 'Enter') {
      e.preventDefault();
      console.log('Enter key pressed, searching:', localSearch.trim());
      if (onSearch) {
        onSearch(localSearch.trim());
      }
    }
  };

  return (
    <div className="filter-bar">
      <form className="search-box" onSubmit={handleSearchSubmit}>
        <input
          type="text"
          placeholder="Search medicines..."
          value={localSearch}
          onChange={handleSearchChange}
          onKeyDown={handleKeyDown}
          className="search-input"
        />
        <button type="submit" className="btn-secondary">
          Search
        </button>
      </form>
    </div>
  );
};

export default FilterBar;