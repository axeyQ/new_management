import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  MoreVertical, 
  Eye, 
  Edit, 
  Printer, 
  Trash, 
  Receipt, 
  ChefHat 
} from 'lucide-react';

export default function OrderActionMenu({ order, onRefresh, onClick }) {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  
  const handleAction = (action) => {
    setIsOpen(false);
    
    switch(action) {
      case 'view':
        router.push(`/dashboard/orders/${order._id}`);
        break;
      case 'edit':
        router.push(`/dashboard/orders/edit/${order._id}`);
        break;
      case 'print':
        // Handle print functionality
        break;
      case 'delete':
        // Handle delete functionality
        break;
      case 'kot':
        // Handle KOT generation
        break;
      default:
        break;
    }
  };
  
  return (
    <div className="relative" onClick={onClick}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="p-1.5 rounded-full hover:bg-gray-100"
      >
        <MoreVertical className="h-5 w-5 text-gray-500" />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 z-10 mt-2 w-48 origin-top-right rounded-md bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
          <button
            onClick={() => handleAction('view')}
            className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
          >
            <Eye className="mr-3 h-4 w-4" />
            View Details
          </button>
          
          {order.orderStatus === 'pending' && (
            <button
              onClick={() => handleAction('edit')}
              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Edit className="mr-3 h-4 w-4" />
              Edit Order
            </button>
          )}
          
          {order.orderStatus === 'pending' && (
            <button
              onClick={() => handleAction('kot')}
              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <ChefHat className="mr-3 h-4 w-4" />
              Generate KOT
            </button>
          )}
          
          {order.orderStatus === 'completed' && (
            <button
              onClick={() => handleAction('print')}
              className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
            >
              <Printer className="mr-3 h-4 w-4" />
              Print Invoice
            </button>
          )}
          
          {['pending', 'preparing'].includes(order.orderStatus) && (
            <button
              onClick={() => handleAction('delete')}
              className="flex w-full items-center px-4 py-2 text-sm text-red-700 hover:bg-red-50"
            >
              <Trash className="mr-3 h-4 w-4" />
              Cancel Order
            </button>
          )}
        </div>
      )}
    </div>
  );
}