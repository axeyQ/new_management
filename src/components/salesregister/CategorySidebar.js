import { ExpandLess, ExpandMore } from "@mui/icons-material";
import { Box, CircularProgress, Collapse, List, ListItem, ListItemText, Paper, TextField, Typography } from "@mui/material";
import React from "react";

export default function CategorySidebar ({ 
    categories, 
    subCategories,
    selectedCategory, 
    selectedSubCategory,
    setSelectedCategory,
    setSelectedSubCategory,
    categorySearch,
    setCategorySearch,
    fetchSubCategories,
    loadingSubcategories,
    fetchDishesBySubcategory
  }) {
    // Track open/closed state of each category
    const [expandedCategories, setExpandedCategories] = useState({});
  
    // Toggle category expansion
    const toggleCategory = async (categoryId) => {
      // Set the selected category
      setSelectedCategory(categoryId);
      
      // If we're collapsing the category, clear the subcategory selection
      if (expandedCategories[categoryId]) {
        setSelectedSubCategory('');
      }
  
      // Toggle expansion state
      setExpandedCategories(prev => ({
        ...prev,
        [categoryId]: !prev[categoryId]
      }));
  
      // If it's not already expanded, fetch subcategories
      if (!expandedCategories[categoryId]) {
        await fetchSubCategories(categoryId);
      }
    };
  
    // Handle subcategory selection
    const handleSubcategorySelect = (subcategoryId) => {
      setSelectedSubCategory(subcategoryId);
      // Fetch dishes for this subcategory
      fetchDishesBySubcategory(subcategoryId);
    };
  
    // Filter categories based on search term
    const filteredCategories = categories.filter(
      category => category.categoryName.toLowerCase().includes(categorySearch.toLowerCase())
    );
  
    return (
      <Paper sx={{ height: 'calc(100vh - 170px)', overflow: 'auto' }}>
        <TextField
          fullWidth
          placeholder="Search Categories"
          variant="outlined"
          size="small"
          value={categorySearch}
          onChange={(e) => setCategorySearch(e.target.value)}
          sx={{ p: 1 }}
        />
        
        <List component="nav" dense>
          {filteredCategories.map((category) => (
            <React.Fragment key={category._id}>
              {/* Category Item */}
              <ListItem
                button
                onClick={() => toggleCategory(category._id)}
                sx={{
                  py: 1.5,
                  backgroundColor: selectedCategory === category._id ? 'grey.200' : 'inherit',
                  borderBottom: '1px solid',
                  borderColor: 'divider'
                }}
              >
                <ListItemText
                  primary={
                    <Typography variant="subtitle1" fontWeight={selectedCategory === category._id ? "bold" : "normal"}>
                      {category.categoryName}
                    </Typography>
                  }
                />
                {/* Expand/Collapse Icon */}
                {expandedCategories[category._id] ? <ExpandLess /> : <ExpandMore />}
              </ListItem>
              
              {/* Subcategories Collapse Section */}
              <Collapse in={expandedCategories[category._id]} timeout="auto" unmountOnExit>
                {loadingSubcategories && selectedCategory === category._id ? (
                  <Box sx={{ p: 2, display: 'flex', justifyContent: 'center' }}>
                    <CircularProgress size={24} />
                  </Box>
                ) : (
                  <List component="div" disablePadding>
                    {subCategories
                      .filter(subcat => subcat.category === category._id || 
                               (subcat.category && subcat.category._id === category._id))
                      .map((subcategory) => (
                        <ListItem
                          button
                          key={subcategory._id}
                          sx={{
                            pl: 4,
                            py: 1,
                            backgroundColor: selectedSubCategory === subcategory._id ? 'primary.light' : 'grey.100'
                          }}
                          onClick={() => handleSubcategorySelect(subcategory._id)}
                        >
                          <ListItemText
                            primary={
                              <Typography variant="body2">
                                {subcategory.subCategoryName}
                              </Typography>
                            }
                          />
                        </ListItem>
                      ))}
                    {subCategories.filter(subcat => 
                      subcat.category === category._id || 
                      (subcat.category && subcat.category._id === category._id)
                    ).length === 0 && (
                      <ListItem sx={{ pl: 4, py: 1 }}>
                        <ListItemText
                          primary={
                            <Typography variant="body2" color="text.secondary">
                              No subcategories
                            </Typography>
                          }
                        />
                      </ListItem>
                    )}
                  </List>
                )}
              </Collapse>
            </React.Fragment>
          ))}
          
          {filteredCategories.length === 0 && (
            <ListItem>
              <ListItemText
                primary={
                  <Typography variant="body2" color="text.secondary" align="center">
                    No categories found
                  </Typography>
                }
              />
            </ListItem>
          )}
        </List>
      </Paper>
    );
  };
