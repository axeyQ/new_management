import { useState } from 'react';
import { CheckCircle, Circle, AlertCircle, ArrowRight, Loader2 } from "lucide-react";

export default function OrderStatusStepper({ currentStatus, orderId, onStatusChange }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const steps = [
    { status: 'pending', label: 'Order Placed' },
    { status: 'preparing', label: 'Preparing' },
    { status: 'ready', label: 'Ready' },
    { status: 'served', label: 'Served' },
    { status: 'completed', label: 'Completed' }
  ];

  const currentStepIndex = steps.findIndex(step => step.status === currentStatus);
  
  async function updateStatus(newStatus) {
    if (newStatus === currentStatus) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });
      
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.message || 'Failed to update status');
      
      if (onStatusChange) onStatusChange();
    } catch (err) {
      console.error('Error updating order status:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  // Get next status
  function getNextStatus() {
    if (currentStepIndex < steps.length - 1) {
      return steps[currentStepIndex + 1].status;
    }
    return null;
  }

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Order Status</h3>
        
        {!['completed', 'cancelled'].includes(currentStatus) && (
          <button
            onClick={() => updateStatus(getNextStatus())}
            disabled={loading || !getNextStatus()}
            className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {loading ? (
              <Loader2 className="animate-spin h-4 w-4 mr-1" />
            ) : (
              <>
                Update to {steps.find(s => s.status === getNextStatus())?.label}
                <ArrowRight className="ml-1 h-4 w-4" />
              </>
            )}
          </button>
        )}
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mt-2">
          <div className="flex">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <span>{error}</span>
          </div>
        </div>
      )}
      
      <div className="mt-4">
        <div className="space-y-6">
          <div className="relative flex items-center justify-between">
            {steps.map((step, index) => (
              <div 
                key={step.status} 
                className={`flex flex-col items-center ${index < steps.length - 1 ? 'flex-1' : ''}`}
              >
                {index < steps.length - 1 && (
                  <div 
                    className={`absolute h-0.5 top-5 left-0 right-0 mx-8 ${
                      index < currentStepIndex ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                    style={{ width: index < steps.length - 1 ? '100%' : '0%' }}
                  ></div>
                )}
                
                <div className="relative flex items-center justify-center">
                  {index < currentStepIndex ? (
                    <CheckCircle className="h-10 w-10 text-blue-600" />
                  ) : index === currentStepIndex ? (
                    <Circle className="h-10 w-10 text-blue-600 fill-white stroke-2" />
                  ) : (
                    <Circle className="h-10 w-10 text-gray-300 fill-white stroke-2" />
                  )}
                </div>
                
                <div className="text-sm font-medium mt-2">
                  {step.label}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}