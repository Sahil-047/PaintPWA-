import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from "@/components/ui/card";

const DashboardGrid = () => {
  const navigate = useNavigate();

  const modules = [
    {
      title: 'Billing',
      path: '/billing',
      icon: (
        <svg viewBox="0 0 120 120" className="w-full h-full">
          {/* Credit Card */}
          <rect x="20" y="30" width="60" height="40" rx="4" fill="#3B82F6" />
          <rect x="25" y="35" width="15" height="10" rx="2" fill="#FBBF24" />
          <rect x="25" y="50" width="40" height="3" rx="1.5" fill="#E5E7EB" />
          <rect x="25" y="57" width="30" height="3" rx="1.5" fill="#E5E7EB" />
          
          {/* Document */}
          <rect x="50" y="45" width="35" height="45" rx="2" fill="#FFFFFF" stroke="#D1D5DB" strokeWidth="2" />
          <line x1="55" y1="55" x2="80" y2="55" stroke="#9CA3AF" strokeWidth="2" />
          <line x1="55" y1="62" x2="75" y2="62" stroke="#9CA3AF" strokeWidth="2" />
          <line x1="55" y1="69" x2="80" y2="69" stroke="#9CA3AF" strokeWidth="2" />
          
          {/* Dollar Sign */}
          <circle cx="75" cy="75" r="8" fill="#FBBF24" />
          <text x="75" y="80" fontSize="10" fill="#92400E" textAnchor="middle" fontWeight="bold">$</text>
          
          {/* Checkmark */}
          <circle cx="60" cy="25" r="10" fill="#10B981" />
          <path d="M55 25 L58 28 L65 21" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
    {
      title: 'Inventory',
      path: '/inventory',
      icon: (
        <svg viewBox="0 0 120 120" className="w-full h-full">
          {/* Clipboard */}
          <rect x="35" y="20" width="50" height="70" rx="4" fill="#1F2937" />
          <rect x="55" y="15" width="10" height="8" rx="2" fill="#FBBF24" />
          
          {/* Paper */}
          <rect x="40" y="30" width="40" height="55" rx="2" fill="#FFFFFF" />
          
          {/* Checkboxes */}
          <rect x="45" y="38" width="12" height="12" rx="2" fill="#10B981" />
          <path d="M48 43 L51 46 L57 40" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
          <rect x="60" y="40" width="15" height="8" rx="1" fill="#D1D5DB" />
          
          <rect x="45" y="52" width="12" height="12" rx="2" fill="#10B981" />
          <path d="M48 57 L51 60 L57 54" stroke="white" strokeWidth="2" fill="none" strokeLinecap="round" />
          <rect x="60" y="54" width="18" height="8" rx="1" fill="#D1D5DB" />
          
          <rect x="45" y="66" width="12" height="12" rx="2" fill="none" stroke="#9CA3AF" strokeWidth="2" />
          <rect x="60" y="68" width="12" height="8" rx="1" fill="#D1D5DB" />
          
          <rect x="45" y="80" width="12" height="12" rx="2" fill="none" stroke="#9CA3AF" strokeWidth="2" />
          <rect x="60" y="82" width="15" height="8" rx="1" fill="#D1D5DB" />
          
          {/* Hand with Pen */}
          <rect x="75" y="35" width="20" height="25" rx="3" fill="#2563EB" />
          <ellipse cx="85" cy="55" rx="8" ry="12" fill="#E5E7EB" />
          <rect x="90" y="38" width="3" height="15" rx="1.5" fill="#1F2937" />
        </svg>
      ),
    },
    {
      title: 'Reports',
      path: '/reports',
      icon: (
        <svg viewBox="0 0 120 120" className="w-full h-full">
          {/* Back Document */}
          <rect x="25" y="35" width="45" height="60" rx="3" fill="#FFFFFF" stroke="#D1D5DB" strokeWidth="2" transform="rotate(5 47.5 65)" />
          <line x1="30" y1="45" x2="65" y2="45" stroke="#9CA3AF" strokeWidth="2" />
          <line x1="30" y1="52" x2="60" y2="52" stroke="#9CA3AF" strokeWidth="2" />
          <line x1="30" y1="59" x2="65" y2="59" stroke="#9CA3AF" strokeWidth="2" />
          <line x1="30" y1="66" x2="55" y2="66" stroke="#9CA3AF" strokeWidth="2" />
          
          {/* Front Document */}
          <rect x="35" y="30" width="45" height="60" rx="3" fill="#FFFFFF" stroke="#3B82F6" strokeWidth="2" />
          <rect x="40" y="38" width="35" height="6" rx="1" fill="#3B82F6" />
          <rect x="40" y="48" width="30" height="6" rx="1" fill="#3B82F6" />
          <line x1="40" y1="58" x2="75" y2="58" stroke="#9CA3AF" strokeWidth="2" />
          <line x1="40" y1="65" x2="70" y2="65" stroke="#9CA3AF" strokeWidth="2" />
          <line x1="40" y1="72" x2="75" y2="72" stroke="#9CA3AF" strokeWidth="2" />
          
          {/* Chart Bars */}
          <rect x="50" y="78" width="6" height="8" fill="#10B981" />
          <rect x="58" y="75" width="6" height="11" fill="#10B981" />
          <rect x="66" y="80" width="6" height="6" fill="#10B981" />
        </svg>
      ),
    },
    {
      title: 'Employees',
      path: '/employees',
      icon: (
        <svg viewBox="0 0 120 120" className="w-full h-full">
          {/* Person 1 */}
          <circle cx="35" cy="35" r="12" fill="#3B82F6" />
          <path d="M20 65 Q20 55 35 55 Q50 55 50 65 L50 75 L20 75 Z" fill="#3B82F6" />
          
          {/* Person 2 */}
          <circle cx="60" cy="30" r="10" fill="#10B981" />
          <path d="M48 60 Q48 52 60 52 Q72 52 72 60 L72 70 L48 70 Z" fill="#10B981" />
          
          {/* Person 3 */}
          <circle cx="85" cy="35" r="12" fill="#F59E0B" />
          <path d="M70 65 Q70 55 85 55 Q100 55 100 65 L100 75 L70 75 Z" fill="#F59E0B" />
          
          {/* Connection Lines */}
          <line x1="47" y1="40" x2="70" y2="40" stroke="#D1D5DB" strokeWidth="2" strokeDasharray="3,3" />
          <line x1="60" y1="50" x2="60" y2="60" stroke="#D1D5DB" strokeWidth="2" strokeDasharray="3,3" />
          
          {/* Team Badge */}
          <circle cx="60" cy="85" r="15" fill="#6366F1" />
          <text x="60" y="90" fontSize="12" fill="white" textAnchor="middle" fontWeight="bold">TEAM</text>
        </svg>
      ),
    },
    {
      title: 'Settings',
      path: '/settings',
      icon: (
        <svg viewBox="0 0 120 120" className="w-full h-full">
          {/* Outer Gear */}
          <g transform="translate(60, 60)">
            <circle r="28" fill="#475569" />
            {/* Gear Teeth */}
            {[0, 45, 90, 135, 180, 225, 270, 315].map((angle, i) => (
              <rect
                key={i}
                x="-3"
                y="-35"
                width="6"
                height="12"
                rx="1"
                fill="#475569"
                transform={`rotate(${angle})`}
              />
            ))}
            {/* Center Circle */}
            <circle r="18" fill="#64748B" />
            <circle r="12" fill="#1E293B" />
          </g>
          
          {/* Inner Gear (rotated) */}
          <g transform="translate(60, 60) rotate(30)">
            <circle r="20" fill="#64748B" />
            {/* Inner Teeth */}
            {[0, 60, 120, 180, 240, 300].map((angle, i) => (
              <rect
                key={i}
                x="-2"
                y="-28"
                width="4"
                height="10"
                rx="1"
                fill="#64748B"
                transform={`rotate(${angle})`}
              />
            ))}
            <circle r="14" fill="#475569" />
            <circle r="8" fill="#1E293B" />
          </g>
          
          {/* Settings Icon */}
          <circle cx="60" cy="60" r="6" fill="#FBBF24" />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-full px-8 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {modules.map((module, index) => (
          <Card
            key={module.path}
            className={`bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow cursor-pointer group ${
              index === 3 ? 'lg:col-start-1' : ''
            }`}
            onClick={() => navigate(module.path)}
          >
            <CardContent className="p-8 flex flex-col items-center text-center">
              <div className="w-36 h-36 mb-6 flex items-center justify-center group-hover:scale-105 transition-transform">
                {module.icon}
              </div>
              <h3 className="text-xl font-semibold text-slate-900">
                {module.title}
              </h3>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default DashboardGrid;
