'use client';
import { Box, Chip, ToggleButton, ToggleButtonGroup, Typography } from '@mui/material';
import {
  Restaurant as RestaurantIcon,
  LocalFireDepartment as GrillIcon,
  FoodBank as FryIcon,
  EcoOutlined as SaladIcon,
  Cake as DessertIcon,
  LocalBar as BarIcon
} from '@mui/icons-material';

// Station definitions with icons
const STATIONS = [
  { id: 'all', label: 'All Stations', icon: <RestaurantIcon /> },
  { id: 'grill', label: 'Grill', icon: <GrillIcon /> },
  { id: 'fry', label: 'Fry', icon: <FryIcon /> },
  { id: 'salad', label: 'Salad', icon: <SaladIcon /> },
  { id: 'dessert', label: 'Dessert', icon: <DessertIcon /> },
  { id: 'bar', label: 'Bar', icon: <BarIcon /> }
];

// Count orders by station
const countOrdersByStation = (orders) => {
  return STATIONS.map(station => {
    const count = station.id === 'all'
      ? orders.length
      : orders.filter(order => 
          order.items.some(item => item.station === station.id)
        ).length;
        
    return {
      ...station,
      count
    };
  });
};

const StationFilter = ({ orders, selectedStation, onChange }) => {
  const stationsWithCount = countOrdersByStation(orders);
  
  const handleStationChange = (event, newStation) => {
    if (newStation !== null) {
      onChange(newStation);
    }
  };
  
  return (
    <Box sx={{ mb: 3 }}>
      <Typography variant="subtitle1" gutterBottom>
        Filter by Kitchen Station
      </Typography>
      
      <ToggleButtonGroup
        value={selectedStation}
        exclusive
        onChange={handleStationChange}
        aria-label="kitchen station filter"
        sx={{ flexWrap: 'wrap' }}
      >
        {stationsWithCount.map(station => (
          <ToggleButton 
            key={station.id} 
            value={station.id}
            aria-label={station.label}
            sx={{ display: 'flex', alignItems: 'center', m: 0.5 }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              {station.icon}
              <Typography sx={{ mx: 1 }}>
                {station.label}
              </Typography>
              <Chip 
                label={station.count} 
                size="small" 
                color={selectedStation === station.id ? "primary" : "default"}
                sx={{ ml: 0.5 }}
              />
            </Box>
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
    </Box>
  );
};

export default StationFilter;