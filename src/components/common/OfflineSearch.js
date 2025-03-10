import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  TextField,
  InputAdornment,
  Chip,
  CircularProgress,
  Typography,
  Paper,
  List,
  ListItem,
  ListItemText,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  FormControl,
  FormControlLabel,
  Checkbox,
  Button,
  Tooltip,
  Badge
} from '@mui/material';
import {
  Search as SearchIcon,
  FilterList as FilterIcon,
  CloudOff as OfflineIcon,
  Close as ClearIcon,
  TravelExplore as AdvancedSearchIcon,
  History as HistoryIcon,
  Star as FavoriteIcon,
  StarBorder as StarBorderIcon
} from '@mui/icons-material';
import * as idb from '@/lib/indexedDBService';
import { useNetwork } from '@/context/NetworkContext';
import Fuse from 'fuse.js'; // Import the fuzzy search library

// Default search settings
const DEFAULT_SEARCH_CONFIG = {
  keys: ['categoryName', 'subCategoryName', 'description'],
  threshold: 0.4,
  minMatchCharLength: 2,
  includeMatches: true,
  ignoreLocation: true,
  findAllMatches: true,
  useExtendedSearch: true
};

const OfflineSearch = ({ 
  onResultClick, 
  placeholder = 'Search categories and subcategories...',
  includeCategories = true,
  includeSubcategories = true,
  maxResults = 10,
  customKeys = null
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [filterMenuAnchor, setFilterMenuAnchor] = useState(null);
  const [selectedFilters, setSelectedFilters] = useState({
    categories: includeCategories,
    subcategories: includeSubcategories,
    food: true,
    beverage: true
  });
  const [searchHistory, setSearchHistory] = useState([]);
  const [favoriteSearches, setFavoriteSearches] = useState([]);
  const [showingHistory, setShowingHistory] = useState(false);
  const [historyMenuAnchor, setHistoryMenuAnchor] = useState(null);
  const { isOnline } = useNetwork();
  
  // Internal search index
  const [searchIndex, setSearchIndex] = useState({
    categories: null,
    subcategories: null
  });
  
  // Modified keys for search based on customKeys
  const searchConfig = useMemo(() => {
    const config = { ...DEFAULT_SEARCH_CONFIG };
    if (customKeys) {
      config.keys = customKeys;
    }
    return config;
  }, [customKeys]);
  
  // Load data and initialize search indexes
  useEffect(() => {
    initializeSearch();
    loadSearchHistoryAndFavorites();
  }, []);
  
  // Initialize search indexes
  const initializeSearch = async () => {
    try {
      // Load categories and subcategories from IndexedDB
      const categories = await idb.getCategories();
      const subcategories = await idb.getSubcategoriesWithCategories();
      
      // Create Fuse instances for fuzzy searching
      const categoryIndex = new Fuse(categories, {
        ...searchConfig,
        keys: customKeys || ['categoryName', 'parentCategory', 'stockStatus.outOfStockReason']
      });
      
      const subcategoryIndex = new Fuse(subcategories, {
        ...searchConfig,
        keys: customKeys || ['subCategoryName', 'category.categoryName', 'stockStatus.outOfStockReason']
      });
      
      setSearchIndex({
        categories: categoryIndex,
        subcategories: subcategoryIndex
      });
      
    } catch (error) {
      console.error('Error initializing search:', error);
    }
  };
  
  // Load search history and favorites from IndexedDB
  const loadSearchHistoryAndFavorites = async () => {
    try {
      const history = await idb.getMetadata('searchHistory') || [];
      const favorites = await idb.getMetadata('favoriteSearches') || [];
      
      setSearchHistory(history);
      setFavoriteSearches(favorites);
    } catch (error) {
      console.error('Error loading search history:', error);
    }
  };
  
  // Save search to history
  const saveToHistory = async (term) => {
    if (!term.trim()) return;
    
    try {
      // Create new history item
      const newHistoryItem = {
        term,
        timestamp: new Date().toISOString(),
        filters: { ...selectedFilters }
      };
      
      // Add to beginning and limit to 20 items
      const updatedHistory = [
        newHistoryItem,
        ...searchHistory.filter(item => item.term !== term).slice(0, 19)
      ];
      
      setSearchHistory(updatedHistory);
      
      // Save to IndexedDB
      await idb.setMetadata('searchHistory', updatedHistory);
    } catch (error) {
      console.error('Error saving search history:', error);
    }
  };
  
  // Toggle favorite status of a search
  const toggleFavorite = async (term) => {
    try {
      let updatedFavorites;
      
      // Check if already a favorite
      const existingIndex = favoriteSearches.findIndex(fav => fav.term === term);
      
      if (existingIndex >= 0) {
        // Remove from favorites
        updatedFavorites = [...favoriteSearches];
        updatedFavorites.splice(existingIndex, 1);
      } else {
        // Add to favorites
        const historyItem = searchHistory.find(h => h.term === term) || {
          term,
          filters: { ...selectedFilters }
        };
        
        updatedFavorites = [
          {
            ...historyItem,
            addedAt: new Date().toISOString()
          },
          ...favoriteSearches
        ];
      }
      
      setFavoriteSearches(updatedFavorites);
      
      // Save to IndexedDB
      await idb.setMetadata('favoriteSearches', updatedFavorites);
    } catch (error) {
      console.error('Error updating favorites:', error);
    }
  };
  
  // Clear search history
  const clearSearchHistory = async () => {
    try {
      setSearchHistory([]);
      await idb.setMetadata('searchHistory', []);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  };
  
  // Perform the actual search
  const performSearch = async (term, filters = selectedFilters) => {
    if (!term.trim() || !searchIndex.categories || !searchIndex.subcategories) {
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    
    try {
      const results = [];
      
      // Search categories if enabled
      if (filters.categories) {
        // Create filtered index based on category type (food/beverage)
        const categoryResults = searchIndex.categories.search(term)
          .filter(result => {
            const category = result.item;
            
            // Apply food/beverage filter
            if (category.parentCategory === 'food' && !filters.food) return false;
            if (category.parentCategory === 'beverage' && !filters.beverage) return false;
            
            return true;
          })
          .map(result => ({
            ...result,
            type: 'category',
            displayName: result.item.categoryName,
            parentName: result.item.parentCategory === 'food' ? 'Food' : 'Beverage'
          }));
          
        results.push(...categoryResults);
      }
      
      // Search subcategories if enabled
      if (filters.subcategories) {
        const subcategoryResults = searchIndex.subcategories.search(term)
          .filter(result => {
            const subcategory = result.item;
            const categoryType = 
              subcategory.category?.parentCategory || 
              (subcategory.category && typeof subcategory.category === 'object' 
                ? subcategory.category.parentCategory 
                : null);
                
            // Skip if we can't determine the parent category type
            if (!categoryType) return true;
            
            // Apply food/beverage filter
            if (categoryType === 'food' && !filters.food) return false;
            if (categoryType === 'beverage' && !filters.beverage) return false;
            
            return true;
          })
          .map(result => ({
            ...result,
            type: 'subcategory',
            displayName: result.item.subCategoryName,
            parentName: result.item.category?.categoryName || 'Unknown Category'
          }));
          
        results.push(...subcategoryResults);
      }
      
      // Sort results by score and limit to max results
      const sortedResults = results
        .sort((a, b) => a.score - b.score)
        .slice(0, maxResults);
      
      setSearchResults(sortedResults);
      
      // Save to history if we have results and this is not from history navigation
      if (sortedResults.length > 0 && !showingHistory) {
        saveToHistory(term);
      }
      
    } catch (error) {
      console.error('Error performing search:', error);
    } finally {
      setIsSearching(false);
    }
  };
  
  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchTerm(value);
    setShowingHistory(false);
    
    // Perform search after a small delay for typing
    const delayDebounceFn = setTimeout(() => {
      performSearch(value);
    }, 300);
    
    return () => clearTimeout(delayDebounceFn);
  };
  
  // Handle filter menu open
  const handleFilterMenuOpen = (event) => {
    setFilterMenuAnchor(event.currentTarget);
  };
  
  // Handle filter menu close
  const handleFilterMenuClose = () => {
    setFilterMenuAnchor(null);
  };
  
  // Handle filter change
  const handleFilterChange = (filter) => {
    const updatedFilters = {
      ...selectedFilters,
      [filter]: !selectedFilters[filter]
    };
    
    setSelectedFilters(updatedFilters);
    
    // Re-run search with new filters
    performSearch(searchTerm, updatedFilters);
  };
  
  // Handle history item click
  const handleHistoryItemClick = (historyItem) => {
    setSearchTerm(historyItem.term);
    
    // Apply saved filters if available
    if (historyItem.filters) {
      setSelectedFilters(historyItem.filters);
    }
    
    // Perform search with these parameters
    performSearch(historyItem.term, historyItem.filters || selectedFilters);
    
    // Close history menu
    setHistoryMenuAnchor(null);
    setShowingHistory(true);
  };
  
  // Handle history menu open
  const handleHistoryMenuOpen = (event) => {
    setHistoryMenuAnchor(event.currentTarget);
  };
  
  // Handle history menu close
  const handleHistoryMenuClose = () => {
    setHistoryMenuAnchor(null);
  };
  
  // Handle clear search
  const handleClearSearch = () => {
    setSearchTerm('');
    setSearchResults([]);
    setShowingHistory(false);
  };
  
  // Handle result click
  const handleResultClick = (result) => {
    if (onResultClick) {
      onResultClick(result);
    }
  };
  
  // Check if a search is a favorite
  const isSearchFavorite = (term) => {
    return favoriteSearches.some(fav => fav.term === term);
  };
  
  // Format the timestamp for display
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return '';
    
    const date = new Date(timestamp);
    return date.toLocaleString();
  };
  
  // Get active filter count for badge
  const getActiveFilterCount = () => {
    // Count non-default filters
    let count = 0;
    
    if (!selectedFilters.categories && includeCategories) count++;
    if (!selectedFilters.subcategories && includeSubcategories) count++;
    if (!selectedFilters.food) count++;
    if (!selectedFilters.beverage) count++;
    
    return count;
  };
  
  return (
    <Box>
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <TextField
            fullWidth
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder={placeholder}
            variant="outlined"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon color="action" />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  {isSearching ? (
                    <CircularProgress size={20} />
                  ) : searchTerm ? (
                    <IconButton 
                      size="small" 
                      onClick={handleClearSearch}
                      edge="end"
                    >
                      <ClearIcon />
                    </IconButton>
                  ) : null}
                </InputAdornment>
              )
            }}
            disabled={!searchIndex.categories}
          />
          
          <Box sx={{ display: 'flex', ml: 1 }}>
            <Badge 
              badgeContent={getActiveFilterCount()} 
              color="primary"
              overlap="circular"
            >
              <IconButton 
                onClick={handleFilterMenuOpen}
                color={filterMenuAnchor ? 'primary' : 'default'}
              >
                <FilterIcon />
              </IconButton>
            </Badge>
            
            <IconButton 
              onClick={handleHistoryMenuOpen}
              color={historyMenuAnchor ? 'primary' : 'default'}
              sx={{ ml: 1 }}
            >
              <HistoryIcon />
            </IconButton>
          </Box>
        </Box>
        
        {/* Offline indicator */}
        {!isOnline && (
          <Box 
            sx={{ 
              display: 'flex', 
              alignItems: 'center', 
              mt: 1,
              color: 'text.secondary',
              fontSize: '0.75rem'
            }}
          >
            <OfflineIcon fontSize="small" sx={{ mr: 0.5 }} />
            <Typography variant="caption">
              Searching offline data only
            </Typography>
          </Box>
        )}
        
        {/* Filter chips */}
        {getActiveFilterCount() > 0 && (
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
            {!selectedFilters.categories && includeCategories && (
              <Chip 
                label="Categories excluded" 
                size="small" 
                onDelete={() => handleFilterChange('categories')} 
              />
            )}
            
            {!selectedFilters.subcategories && includeSubcategories && (
              <Chip 
                label="Subcategories excluded" 
                size="small" 
                onDelete={() => handleFilterChange('subcategories')} 
              />
            )}
            
            {!selectedFilters.food && (
              <Chip 
                label="Food excluded" 
                size="small" 
                onDelete={() => handleFilterChange('food')} 
              />
            )}
            
            {!selectedFilters.beverage && (
              <Chip 
                label="Beverages excluded" 
                size="small" 
                onDelete={() => handleFilterChange('beverage')} 
              />
            )}
          </Box>
        )}
      </Paper>
      
      {/* Filter Menu */}
      <Menu
        anchorEl={filterMenuAnchor}
        open={Boolean(filterMenuAnchor)}
        onClose={handleFilterMenuClose}
        sx={{ '& .MuiPaper-root': { width: 250 } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Search Filters
          </Typography>
        </Box>
        <Divider />
        <MenuItem dense>
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedFilters.categories}
                onChange={() => handleFilterChange('categories')}
                disabled={!includeCategories}
              />
            }
            label="Include Categories"
            sx={{ width: '100%' }}
          />
        </MenuItem>
        <MenuItem dense>
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedFilters.subcategories}
                onChange={() => handleFilterChange('subcategories')}
                disabled={!includeSubcategories}
              />
            }
            label="Include Subcategories"
            sx={{ width: '100%' }}
          />
        </MenuItem>
        <Divider />
        <MenuItem dense>
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedFilters.food}
                onChange={() => handleFilterChange('food')}
              />
            }
            label="Include Food Categories"
            sx={{ width: '100%' }}
          />
        </MenuItem>
        <MenuItem dense>
          <FormControlLabel
            control={
              <Checkbox
                checked={selectedFilters.beverage}
                onChange={() => handleFilterChange('beverage')}
              />
            }
            label="Include Beverage Categories"
            sx={{ width: '100%' }}
          />
        </MenuItem>
      </Menu>
      
      {/* History Menu */}
      <Menu
        anchorEl={historyMenuAnchor}
        open={Boolean(historyMenuAnchor)}
        onClose={handleHistoryMenuClose}
        sx={{ '& .MuiPaper-root': { width: 300 } }}
      >
        <Box sx={{ px: 2, py: 1 }}>
          <Typography variant="subtitle2" gutterBottom>
            Search History & Favorites
          </Typography>
        </Box>
        <Divider />
        
        {/* Favorites section */}
        {favoriteSearches.length > 0 && (
          <>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Favorites
              </Typography>
            </Box>
            
            {favoriteSearches.map((item, index) => (
              <MenuItem 
                key={`favorite-${index}`} 
                onClick={() => handleHistoryItemClick(item)}
                dense
              >
                <ListItemText 
                  primary={item.term} 
                  secondary={formatTimestamp(item.addedAt)}
                  primaryTypographyProps={{ noWrap: true }}
                />
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(item.term);
                  }}
                >
                  <FavoriteIcon color="error" fontSize="small" />
                </IconButton>
              </MenuItem>
            ))}
            
            <Divider />
          </>
        )}
        
        {/* History section */}
        {searchHistory.length > 0 ? (
          <>
            <Box sx={{ px: 2, py: 1 }}>
              <Typography variant="caption" color="text.secondary">
                Recent Searches
              </Typography>
            </Box>
            
            {searchHistory.map((item, index) => (
              <MenuItem 
                key={`history-${index}`} 
                onClick={() => handleHistoryItemClick(item)}
                dense
              >
                <ListItemText 
                  primary={item.term} 
                  secondary={formatTimestamp(item.timestamp)}
                  primaryTypographyProps={{ noWrap: true }}
                />
                <IconButton 
                  size="small" 
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(item.term);
                  }}
                >
                  {isSearchFavorite(item.term) ? (
                    <FavoriteIcon color="error" fontSize="small" />
                  ) : (
                    <StarBorderIcon fontSize="small" />
                  )}
                </IconButton>
              </MenuItem>
            ))}
            
            <Divider />
            <MenuItem onClick={clearSearchHistory}>
              <ListItemText primary="Clear Search History" />
            </MenuItem>
          </>
        ) : (
          <MenuItem disabled>
            <ListItemText primary="No search history" />
          </MenuItem>
        )}
      </Menu>
      
      {/* Search Results */}
      {searchResults.length > 0 && (
        <Paper elevation={2}>
          <List>
            {searchResults.map((result, index) => (
              <React.Fragment key={`${result.type}-${index}`}>
                <ListItem 
                  button 
                  onClick={() => handleResultClick(result)}
                  sx={{
                    '&:hover': {
                      backgroundColor: 'rgba(0, 0, 0, 0.04)'
                    }
                  }}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Typography 
                          variant="body1" 
                          component="span" 
                          fontWeight="medium"
                        >
                          {result.displayName}
                        </Typography>
                        <Chip
                          label={result.type === 'category' ? 'Category' : 'Subcategory'}
                          size="small"
                          color={result.type === 'category' ? 'primary' : 'secondary'}
                          sx={{ ml: 1, height: 20 }}
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        {result.parentName}
                      </Typography>
                    }
                  />
                </ListItem>
                {index < searchResults.length - 1 && <Divider />}
              </React.Fragment>
            ))}
          </List>
          
          {/* More Indicator */}
          {searchResults.length === maxResults && (
            <Box sx={{ p: 1, bgcolor: 'background.default', textAlign: 'center' }}>
              <Typography variant="caption" color="text.secondary">
                Refine your search to see more results
              </Typography>
            </Box>
          )}
        </Paper>
      )}
      
      {/* No Results Message */}
      {searchTerm && !isSearching && searchResults.length === 0 && (
        <Paper elevation={0} sx={{ p: 3, textAlign: 'center', bgcolor: 'background.default' }}>
          <Typography variant="body1" color="text.secondary">
            No results found for &quot;{searchTerm}&quot;
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Try different keywords or adjust your filters
          </Typography>
        </Paper>
      )}
    </Box>
  );
};

export default OfflineSearch;