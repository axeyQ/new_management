// Updated Sidebar.js with Outlet Management

'use client';

import { useState } from 'react';
import {
  Box,
  Drawer,
  List,
  Divider,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  IconButton,
  Table,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Restaurant as RestaurantIcon,
  Category as CategoryIcon,
  Fastfood as FastfoodIcon,
  TableRestaurant as TableIcon,
  Receipt as ReceiptIcon,
  Group as GroupIcon,
  Settings as SettingsIcon,
  ChevronLeft as ChevronLeftIcon,
  ExpandLess,
  ExpandMore,
  MenuOpen as MenuOpenIcon,
  TableBar as TableTypeIcon,
  ViewModule as LayoutIcon,
  Kitchen as KitchenIcon,
  MenuBook as MenuBookIcon,
  LocalOffer as PricingIcon,
  AddCircleOutline as AddOnIcon,
  Store as StoreIcon,
  AccessTime as TimeIcon,
  PowerOff as PowerOffIcon,
  Chair,
  ChairSharp,
} from '@mui/icons-material';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

const drawerWidth = 240;

const Sidebar = ({ open, toggleDrawer }) => {
  const pathname = usePathname();
  const { user } = useAuth();

  // Define menu items with nested structure
  const [menuOpen, setMenuOpen] = useState({
    menu: true,
    tables: true,
    outlet: true, // Add outlet section state
  });

  const handleMenuToggle = (section) => {
    setMenuOpen((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const isActive = (path) => pathname === path;

  return (
    <Drawer
      sx={{
        width: drawerWidth,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: drawerWidth,
          boxSizing: 'border-box',
        },
      }}
      variant="persistent"
      anchor="left"
      open={open}
    >
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          padding: 1,
          justifyContent: 'flex-end',
        }}
      >
        <IconButton onClick={toggleDrawer}>
          {open ? <ChevronLeftIcon /> : <MenuOpenIcon />}
        </IconButton>
      </Box>
      <Divider />
      <List>
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            href="/dashboard"
            selected={isActive('/dashboard')}
          >
            <ListItemIcon>
              <DashboardIcon />
            </ListItemIcon>
            <ListItemText primary="Dashboard" />
          </ListItemButton>
        </ListItem>

        {/* Outlet Management Section */}
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleMenuToggle('outlet')}>
            <ListItemIcon>
              <StoreIcon />
            </ListItemIcon>
            <ListItemText primary="Outlet Management" />
            {menuOpen.outlet ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>
        <Collapse in={menuOpen.outlet} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItemButton
              component={Link}
              href="/dashboard/outlet"
              selected={isActive('/dashboard/outlet')}
              sx={{ pl: 4 }}
            >
              <ListItemIcon>
                <StoreIcon />
              </ListItemIcon>
              <ListItemText primary="Outlet Status" />
            </ListItemButton>

            <ListItemButton
              component={Link}
              href="/dashboard/outlet/hours"
              selected={isActive('/dashboard/outlet/hours')}
              sx={{ pl: 4 }}
            >
              <ListItemIcon>
                <TimeIcon />
              </ListItemIcon>
              <ListItemText primary="Operational Hours" />
            </ListItemButton>

            {user?.role === 'admin' && (
              <ListItemButton
                component={Link}
                href="/dashboard/outlet/offline-reasons"
                selected={isActive('/dashboard/outlet/offline-reasons')}
                sx={{ pl: 4 }}
              >
                <ListItemIcon>
                  <PowerOffIcon />
                </ListItemIcon>
                <ListItemText primary="Offline Reasons" />
              </ListItemButton>
            )}

            {user?.role === 'admin' && (
              <ListItemButton
                component={Link}
                href="/dashboard/outlet/settings"
                selected={isActive('/dashboard/outlet/settings')}
                sx={{ pl: 4 }}
              >
                <ListItemIcon>
                  <SettingsIcon />
                </ListItemIcon>
                <ListItemText primary="Outlet Settings" />
              </ListItemButton>
            )}
          </List>
        </Collapse>

        {/* Menu Management Section */}
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleMenuToggle('menu')}>
            <ListItemIcon>
              <RestaurantIcon />
            </ListItemIcon>
            <ListItemText primary="Menu Management" />
            {menuOpen.menu ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>
        <Collapse in={menuOpen.menu} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItemButton
              component={Link}
              href="/dashboard/menu/categories"
              selected={isActive('/dashboard/menu/categories')}
              sx={{ pl: 4 }}
            >
              <ListItemIcon>
                <CategoryIcon />
              </ListItemIcon>
              <ListItemText primary="Categories" />
            </ListItemButton>

            <ListItemButton
              component={Link}
              href="/dashboard/menu/subcategories"
              selected={isActive('/dashboard/menu/subcategories')}
              sx={{ pl: 4 }}
            >
              <ListItemIcon>
                <CategoryIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText primary="Sub Categories" />
            </ListItemButton>

            <ListItemButton
              component={Link}
              href="/dashboard/menu/dishes"
              selected={isActive('/dashboard/menu/dishes')}
              sx={{ pl: 4 }}
            >
              <ListItemIcon>
                <FastfoodIcon />
              </ListItemIcon>
              <ListItemText primary="Dishes" />
            </ListItemButton>

            <ListItemButton
              component={Link}
              href="/dashboard/menu/addons"
              selected={isActive('/dashboard/menu/addons')}
              sx={{ pl: 4 }}
            >
              <ListItemIcon>
                <AddOnIcon />
              </ListItemIcon>
              <ListItemText primary="Add-ons" />
            </ListItemButton>

            <ListItemButton
              component={Link}
              href="/dashboard/menu/menus"
              selected={isActive('/dashboard/menu/menus')}
              sx={{ pl: 4 }}
            >
              <ListItemIcon>
                <MenuBookIcon />
              </ListItemIcon>
              <ListItemText primary="Menus" />
            </ListItemButton>
          </List>
        </Collapse>

        {/* Table Management Section */}
        <ListItem disablePadding>
          <ListItemButton onClick={() => handleMenuToggle('tables')}>
            <ListItemIcon>
              <TableIcon />
            </ListItemIcon>
            <ListItemText primary="Table Management" />
            {menuOpen.tables ? <ExpandLess /> : <ExpandMore />}
          </ListItemButton>
        </ListItem>
        <Collapse in={menuOpen.tables} timeout="auto" unmountOnExit>
          <List component="div" disablePadding>
            <ListItemButton
              component={Link}
              href="/dashboard/tables/types"
              selected={isActive('/dashboard/tables/types')}
              sx={{ pl: 4 }}
            >
              <ListItemIcon>
                <TableTypeIcon />
              </ListItemIcon>
              <ListItemText primary="Table Types" />
            </ListItemButton>

            <ListItemButton
              component={Link}
              href="/dashboard/tables"
              selected={isActive('/dashboard/tables')}
              sx={{ pl: 4 }}
            >
              <ListItemIcon>
                <TableIcon />
              </ListItemIcon>
              <ListItemText primary="Tables" />
            </ListItemButton>

            <ListItemButton
              component={Link}
              href="/dashboard/tables/layout"
              selected={isActive('/dashboard/tables/layout')}
              sx={{ pl: 4 }}
            >
              <ListItemIcon>
                <LayoutIcon />
              </ListItemIcon>
              <ListItemText primary="Table Layout" />
            </ListItemButton>
          </List>
        </Collapse>

        {/* Order Management */}
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            href="/dashboard/orders"
            selected={isActive('/dashboard/orders')}
          >
            <ListItemIcon>
            <ReceiptIcon />

            </ListItemIcon>
            <ListItemText primary="Orders" />
          </ListItemButton>
        </ListItem>

        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            href="/dashboard/orders/tableview"
            selected={isActive('/dashboard/orders/tableview')}
          >
          
            <ListItemIcon>
            <ChairSharp />

            </ListItemIcon>
            <ListItemText primary="Table View" />
          </ListItemButton>
        </ListItem>

        

        {/* Kitchen Display System */}
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            href="/dashboard/kitchen"
            selected={isActive('/dashboard/kitchen')}
          >
            <ListItemIcon>
              <KitchenIcon />
            </ListItemIcon>
            <ListItemText primary="Kitchen Display" />
          </ListItemButton>
        </ListItem>
        
        {/* Customer Management */}
        <ListItem disablePadding>
          <ListItemButton
            component={Link}
            href="/dashboard/customers"
            selected={isActive('/dashboard/customers')}
          >
            <ListItemIcon>
              <GroupIcon />
            </ListItemIcon>
            <ListItemText primary="Customers" />
          </ListItemButton>
        </ListItem>

        {/* Settings - Only visible to admin */}
        {user?.role === 'admin' && (
          <ListItem disablePadding>
            <ListItemButton
              component={Link}
              href="/dashboard/settings"
              selected={isActive('/dashboard/settings')}
            >
              <ListItemIcon>
                <SettingsIcon />
              </ListItemIcon>
              <ListItemText primary="Settings" />
            </ListItemButton>
          </ListItem>
        )}
      </List>
    </Drawer>
  );
};

export default Sidebar;