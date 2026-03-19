import { 
  Squares2X2Icon, 
  ShoppingBagIcon, 
  ClipboardDocumentListIcon, 
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon 
} from "@heroicons/react/24/outline";

function AdminSidebar({ activeTab, setActiveTab, onLogout }) {
  const menuItems = [
    { id: 'overview', name: 'Overview', icon: Squares2X2Icon },
    { id: 'products', name: 'Products', icon: ShoppingBagIcon },
    { id: 'orders', name: 'Orders', icon: ClipboardDocumentListIcon },
    { id: 'settings', name: 'Settings', icon: Cog6ToothIcon },
  ];

  return (
    <aside className="w-64 bg-neutral-dark text-white min-h-screen p-8 flex flex-col fixed left-0 top-0">
      <div className="mb-12">
        <div className="h-8 w-auto">
          <svg className="h-full w-auto" viewBox="0 0 300 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <polygon points="40,10 75,30 75,70 40,90 5,70 5,30" fill="#D4A373" />
            <path d="M20 65 V35 L40 55 L60 35 V65" stroke="white" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
            <text x="95" y="55" fontFamily="Playfair Display, serif" fontWeight="bold" fontSize="36" fill="white">Maa Sheela</text>
            <text x="95" y="82" fontFamily="Inter, sans-serif" fontWeight="bold" fontSize="14" fill="white" opacity="0.6" letterSpacing="6">IRON ARTS</text>
          </svg>
        </div>
      </div>
      
      <nav className="flex-grow space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-sm text-sm font-medium transition-all ${
              activeTab === item.id 
                ? "bg-primary text-white" 
                : "text-white/40 hover:bg-white/5 hover:text-white"
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </button>
        ))}
      </nav>

      <button 
        onClick={onLogout}
        className="mt-auto flex items-center gap-4 px-4 py-3 text-white/40 hover:text-accent transition-colors text-sm font-medium"
      >
        <ArrowLeftOnRectangleIcon className="w-5 h-5" />
        Logout
      </button>
    </aside>
  );
}

export default AdminSidebar;
