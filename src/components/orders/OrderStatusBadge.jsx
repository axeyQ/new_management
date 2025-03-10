export default function OrderStatusBadge({ status }) {
    // Define colors based on status
    const statusConfig = {
      pending: { bgColor: 'bg-yellow-100', textColor: 'text-yellow-800', label: 'Pending' },
      preparing: { bgColor: 'bg-blue-100', textColor: 'text-blue-800', label: 'Preparing' },
      ready: { bgColor: 'bg-purple-100', textColor: 'text-purple-800', label: 'Ready' },
      served: { bgColor: 'bg-indigo-100', textColor: 'text-indigo-800', label: 'Served' },
      completed: { bgColor: 'bg-green-100', textColor: 'text-green-800', label: 'Completed' },
      cancelled: { bgColor: 'bg-red-100', textColor: 'text-red-800', label: 'Cancelled' }
    };
  
    const config = statusConfig[status] || statusConfig.pending;
  
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium ${config.bgColor} ${config.textColor}`}>
        {config.label}
      </span>
    );
  }