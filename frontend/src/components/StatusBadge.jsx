import React from 'react';

export default function StatusBadge({ status, type = 'default' }) {
  const getBadgeStyle = () => {
    switch (status) {
      // Order Status
      case 'Delivered':
      case 'Success':
      case 'Paid':
      case 'Resolved':
      case 'Active':
      case 'Received':
        return 'bg-[#EBF4EE] text-[#347A59] border-[#B8DFCA]';
      
      case 'Dispatched':
      case 'In Transit':
      case 'Processing':
      case 'Approved':
      case 'In Progress':
        return 'bg-[#EBF1F7] text-[#2C4E6F] border-[#B7CEE2]';
      
      case 'Packed':
      case 'Confirmed':
      case 'Ordered':
      case 'Regular':
        return 'bg-[#F4EEF7] text-[#56386C] border-[#D3BEDF]';
      
      case 'New':
      case 'Preparing':
      case 'Pending':
      case 'Draft':
        return 'bg-[#FBF3E8] text-[#825425] border-[#E8CDA8]';
      
      case 'Cancelled':
      case 'Failed':
      case 'Out of Stock':
      case 'CRITICAL':
      case 'Urgent':
      case 'Critical Risk':
        return 'bg-[#FDF0F1] text-[#8B2E37] border-[#F2C1C5]';
      
      case 'Low Stock':
      case 'Delayed':
      case 'WARNING':
      case 'High':
      case 'At Risk':
      case 'Mismatch':
        return 'bg-[#FFF6E9] text-[#935414] border-[#F2D7B2]';

      case 'VIP':
        return 'bg-[#EBF4EE] text-[#347A59] border-[#B8DFCA]';

      default:
        return 'bg-[#F4F8F5] text-[#244B39] border-[#E5ECE7]';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border shadow-xs ${getBadgeStyle()}`}>
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-80"></span>
      {status}
    </span>
  );
}

