'use client';
import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import axiosWithAuth from '@/lib/axiosWithAuth';
import { 
  ShoppingCart, 
  Utensils, 
  Receipt, 
  Truck, 
  ShoppingBag,
  Circle, 
  User,
  Menu
} from 'lucide-react';

const TableView = () => {
  const router = useRouter();
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [webMode, setWebMode] = useState(false);

  // Fetch tables and their associated orders
  useEffect(() => {
    const fetchTablesAndOrders = async () => {
      try {
        setLoading(true);
        
        // Step 1: Fetch all tables
        const tablesResponse = await axiosWithAuth.get('/api/tables');
        if (!tablesResponse.data.success) {
          throw new Error('Failed to fetch tables');
        }
        
        const rawTables = tablesResponse.data.data;
        
        // Step 2: Fetch active orders (only Dine-in orders)
        const ordersResponse = await axiosWithAuth.get('/api/orders?mode=Dine-in&status=pending,preparing,ready,served');
        if (!ordersResponse.data.success) {
          throw new Error('Failed to fetch orders');
        }
        
        const orders = ordersResponse.data.data;
        
        // Step 3: Fetch KOTs for these orders
        let tableKots = {};
        let tableKotsCount = {};
        
        // Process orders to collect table IDs that have orders
        for (const order of orders) {
          if (order.table) {
            const tableId = typeof order.table === 'string' ? order.table : order.table._id;
            
            // Fetch KOTs for this order
            try {
              const kotsResponse = await axiosWithAuth.get(`/api/orders/kot?orderId=${order._id}`);
              if (kotsResponse.data.success) {
                // Keep track of KOTs by tableId
                if (!tableKots[tableId]) {
                  tableKots[tableId] = [];
                }
                tableKots[tableId] = [...tableKots[tableId], ...kotsResponse.data.data];
                tableKotsCount[tableId] = (tableKotsCount[tableId] || 0) + kotsResponse.data.data.length;
              }
            } catch (error) {
              console.error(`Error fetching KOTs for order ${order._id}:`, error);
            }
          }
        }
        
        // Step 4: Map tables with orders and KOTs
        const processedTables = rawTables.map(table => {
          // Find active order for this table
          const tableOrder = orders.find(order => {
            const orderTableId = typeof order.table === 'string' ? order.table : order.table?._id;
            return orderTableId === table._id;
          });
          
          // Determine table status based on order status
          let orderStatus = 'blank';
          if (tableOrder) {
            if (tableOrder.orderStatus === 'pending') orderStatus = 'occupied';
            else if (['preparing', 'ready'].includes(tableOrder.orderStatus)) orderStatus = 'kot_printed';
            else if (['served', 'completed'].includes(tableOrder.orderStatus)) orderStatus = 'invoice_printed';
          }
          
          // Generate order references
          const orderRefs = tableOrder ? {
            eps: tableOrder.invoiceNumber || '--',
            kot: tableOrder.refNum || '--'
          } : {
            eps: '--',
            kot: '--'
          };
          
          // Get KOTs count for this table
          const kots = tableKotsCount[table._id] 
            ? `KOT's: ${tableKotsCount[table._id]}` 
            : `KOT's:`;
          
          return {
            _id: table._id,
            tableName: table.tableName,
            capacity: table.capacity || 2,
            status: table.status,
            orderStatus,
            orderRefs,
            kots,
            totalAmount: tableOrder ? tableOrder.totalAmount || 0 : 0
          };
        });
        
        setTables(processedTables);
        setLoading(false);
      } catch (error) {
        console.error('Error fetching tables and orders:', error);
        setLoading(false);
      }
    };

    fetchTablesAndOrders();
    
    // Optional: Set up a polling interval to refresh data
    const intervalId = setInterval(() => {
      fetchTablesAndOrders();
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(intervalId);
  }, []);

  // Get the appropriate indicator color based on status
  const getStatusIndicator = (status) => {
    switch (status) {
      case 'blank':
        return { colorClass: 'text-gray-300', bgColorClass: 'bg-gray-300' };
      case 'occupied':
        return { colorClass: 'text-blue-500', bgColorClass: 'bg-blue-500' };
      case 'kot_printed':
        return { colorClass: 'text-green-500', bgColorClass: 'bg-green-500' };
      case 'invoice_printed':
        return { colorClass: 'text-pink-500', bgColorClass: 'bg-pink-500' };
      default:
        return { colorClass: 'text-gray-300', bgColorClass: 'bg-gray-300' };
    }
  };

  // Handle table click to open sales register
  const handleTableClick = (tableId, hasOrder) => {
    // Navigate to the sales register with table information
    router.push(`/pos/register?tableId=${tableId}&mode=Dine-in`);
  };

  // Toggle switch component
  const Toggle = ({ checked, onChange }) => (
    <div className="relative inline-block w-10 align-middle select-none">
      <input
        type="checkbox"
        name="toggle"
        id="toggle"
        className="opacity-0 w-0 h-0"
        checked={checked}
        onChange={onChange}
      />
      <label
        htmlFor="toggle"
        className={`block overflow-hidden h-6 rounded-full cursor-pointer transition-colors duration-200 ease-in 
          ${checked ? 'bg-blue-600' : 'bg-gray-300'}`}
      >
        <span 
          className={`block h-6 w-6 rounded-full transform transition-transform duration-200 ease-in 
            ${checked ? 'translate-x-4 bg-white' : 'translate-x-0 bg-white'}`}
        />
      </label>
    </div>
  );

  return (
    <div className="w-full pb-8">


      {/* Main Content */}
      <div className="px-6">


        {/* Status Legend */}
        <div className="flex gap-6 mb-6">
          <div className="flex items-center gap-2">
            <Circle size={16} className="text-gray-300 fill-current" />
            <span className="text-sm">Blank Table</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle size={16} className="text-blue-500 fill-current" />
            <span className="text-sm">Occupied</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle size={16} className="text-green-500 fill-current" />
            <span className="text-sm">KOT Printed/Saved</span>
          </div>
          <div className="flex items-center gap-2">
            <Circle size={16} className="text-pink-500 fill-current" />
            <span className="text-sm">Invoice Printed</span>
          </div>
        </div>

        {/* Table Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {loading ? (
            <div>Loading tables...</div>
          ) : (
            tables.map((table) => {
              const { colorClass, bgColorClass } = getStatusIndicator(table.orderStatus);
              
              return (
                <div 
                  key={table._id}
                  onClick={() => handleTableClick(table._id, table.orderStatus !== 'blank')}
                  className="relative p-4 border border-gray-200 rounded-lg shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                >
                  {/* Status Indicator (circle at top) */}
                  <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 w-6 h-6 rounded-full bg-white border border-gray-200 flex justify-center items-center">
                    <Circle size={16} className={colorClass + " fill-current"} />
                  </div>

                  {/* Table Header */}
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="text-lg font-semibold">{table.tableName}</h3>
                    <div className="flex items-center">
                      <span className="mr-2 text-sm">
                        {table.totalAmount === 0 ? '00.00' : table.totalAmount.toFixed(2)}
                      </span>
                      <div className="flex items-center">
                        <User size={16} className="mr-1" />
                        <span className="text-sm">{table.capacity}</span>
                      </div>
                    </div>
                  </div>

                  {/* Order References */}
                  <div className="text-xs text-gray-500 mb-1">
                    {table.orderRefs.eps}
                  </div>
                  <div className="text-xs text-gray-500">
                    Ref: {table.orderRefs.kot}
                  </div>

                  {/* KOT Information */}
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs">{table.kots}</span>
                    <span className="font-bold">
                      INR {table.totalAmount}
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default TableView;