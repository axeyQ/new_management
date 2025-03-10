import { useState, useEffect } from 'react';
import { Plus, Printer, RefreshCw, AlertCircle, Loader2, CheckCircle } from "lucide-react";
import { formatDate } from '@/lib/utils';

export default function KotPanel({ order, onKotCreated }) {
  const [kots, setKots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showNewKotDialog, setShowNewKotDialog] = useState(false);

  useEffect(() => {
    fetchKots();
  }, [order._id]);

  async function fetchKots() {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/orders/kot?orderId=${order._id}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Failed to fetch KOTs');
      
      setKots(data.data);
    } catch (err) {
      console.error('Error fetching KOTs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Function to get status color
  function getStatusColor(status) {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-purple-100 text-purple-800';
      case 'served': return 'bg-indigo-100 text-indigo-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  }

  if (loading && kots.length === 0) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        <span className="ml-2">Loading KOTs...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4 my-4">
        <div className="flex items-center">
          <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
          <p className="text-red-700">Error loading KOTs: {error}</p>
        </div>
        <button 
          onClick={fetchKots}
          className="mt-2 text-sm text-red-600 hover:text-red-800"
        >
          <RefreshCw className="h-4 w-4 inline mr-1" />
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-semibold">Kitchen Order Tickets (KOT)</h2>
        <button
          onClick={() => setShowNewKotDialog(true)}
          className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          disabled={['completed', 'cancelled'].includes(order.orderStatus)}
        >
          <Plus className="h-4 w-4 mr-1" />
          Create KOT
        </button>
      </div>

      {kots.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-dashed border-gray-300">
          <p className="text-gray-500">No KOTs have been created for this order yet.</p>
          <button
            onClick={() => setShowNewKotDialog(true)}
            className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            disabled={['completed', 'cancelled'].includes(order.orderStatus)}
          >
            <Plus className="h-4 w-4 mr-1" />
            Create First KOT
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {kots.map((kot) => (
            <div 
              key={kot._id} 
              className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
            >
              <div className="border-b border-gray-200 px-4 py-3 flex justify-between items-center">
                <div className="flex items-center">
                  <span className="font-medium">KOT #{kot.kotTokenNum}</span>
                  <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(kot.kotStatus)}`}>
                    {kot.kotStatus.charAt(0).toUpperCase() + kot.kotStatus.slice(1)}
                  </span>
                </div>
                {kot.printed ? (
                  <div className="flex items-center text-green-600">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    <span className="text-xs">Printed</span>
                  </div>
                ) : (
                  <button 
                    className="text-blue-600 hover:text-blue-800"
                    onClick={() => handlePrintKot(kot._id)}
                  >
                    <Printer className="h-4 w-4" />
                  </button>
                )}
              </div>
              
              <div className="px-4 py-2 text-sm text-gray-500">
                <div>Created: {formatDate(kot.createdAt)}</div>
              </div>
              
              <div className="px-4 pb-4">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="text-left text-xs font-medium text-gray-500 uppercase tracking-wider py-2">
                        Item
                      </th>
                      <th className="text-right text-xs font-medium text-gray-500 uppercase tracking-wider py-2">
                        Qty
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {kot.items.map((item, idx) => (
                      <tr key={idx}>
                        <td className="py-2">
                          <div className="text-sm">{item.dishName}</div>
                          {item.variantName && (
                            <div className="text-xs text-gray-500">
                              Variant: {item.variantName}
                            </div>
                          )}
                          {item.notes && (
                            <div className="text-xs text-gray-500">
                              Note: {item.notes}
                            </div>
                          )}
                        </td>
                        <td className="py-2 text-right">
                          {item.quantity}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 border-t border-gray-200">
                <select
                  className="block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md"
                  value={kot.kotStatus}
                  onChange={(e) => handleUpdateKotStatus(kot._id, e.target.value)}
                  disabled={kot.kotStatus === 'completed' || kot.kotStatus === 'cancelled'}
                >
                  <option value="pending">Pending</option>
                  <option value="preparing">Preparing</option>
                  <option value="ready">Ready</option>
                  <option value="served">Served</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* KOT Creation Dialog would go here */}
      {showNewKotDialog && (
        <NewKotDialog 
          order={order} 
          onClose={() => setShowNewKotDialog(false)} 
          onSuccess={() => {
            fetchKots();
            if (onKotCreated) onKotCreated();
          }} 
        />
      )}
    </div>
  );
}

// We would create the NewKotDialog component separately
function NewKotDialog({ order, onClose, onSuccess }) {
  // Implement the dialog for creating a new KOT
  return null;
}