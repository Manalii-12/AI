import React from 'react';

export default function StatCard({ title, value, subtitle, icon: Icon, trend, color = 'sage', alert = false, onClick }) {
  const colorMap = {
    sage: 'text-[#347A59] bg-[#EBF4EE] border-[#B8DFCA]',
    taupe: 'text-[#347A59] bg-[#EBF4EE] border-[#B8DFCA]',
    charcoal: 'text-[#FFFFFF] bg-[#347A59] border-[#244B39]',
    champagne: 'text-[#347A59] bg-[#F4F8F5] border-[#E5ECE7]',
    emerald: 'text-[#347A59] bg-[#EBF4EE] border-[#B8DFCA]',
    blue: 'text-[#2C4E6F] bg-[#EBF1F7] border-[#B7CEE2]',
    amber: 'text-[#825425] bg-[#FBF3E8] border-[#E8CDA8]',
    rose: 'text-[#8B2E37] bg-[#FDF0F1] border-[#F2C1C5]',
    purple: 'text-[#56386C] bg-[#F4EEF7] border-[#D3BEDF]',
    cyan: 'text-[#285A65] bg-[#EBF5F7] border-[#B6DCE2]',
  };

  return (
    <div
      onClick={onClick}
      className={`glass-card glass-card-hover rounded-2xl p-5 relative overflow-hidden transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:shadow-md hover:-translate-y-0.5' : ''
      } ${
        alert ? 'border-rose-300 bg-[#FFFBFB] ring-1 ring-rose-200' : 'border-[#E5ECE7] bg-white'
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-extrabold text-[#111827] tracking-wider uppercase">{title}</p>
          <h3 className="text-2xl font-black text-[#111827] mt-1.5 tracking-tight">{value}</h3>
        </div>
        {Icon && (
          <div className={`p-3 rounded-xl border shadow-sm ${colorMap[color] || colorMap.sage}`}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </div>
      {(subtitle || trend) && (
        <div className="mt-3.5 flex items-center text-xs">
          {trend && (
            <span className={`font-bold mr-1.5 px-1.5 py-0.5 rounded text-[10px] ${
              trend.startsWith('+') ? 'text-[#347A59] bg-[#EBF4EE]' : 'text-[#8B2E37] bg-[#FDF0F1]'
            }`}>
              {trend}
            </span>
          )}
          <span className="text-[#111827] font-semibold text-[11px]">{subtitle}</span>
        </div>
      )}
    </div>
  );
}

