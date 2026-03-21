import { 
  UserIcon, 
  ShoppingBagIcon, 
  ArrowLeftOnRectangleIcon 
} from "@heroicons/react/24/outline";

function UserSidebar({ activeTab, setActiveTab, onLogout }) {
  const menuItems = [
    { id: 'profile', name: 'My Profile', icon: UserIcon },
    { id: 'orders', name: 'My Orders', icon: ShoppingBagIcon },
  ];

  const handleTabChange = (id) => {
    setActiveTab(id);
    if (window.innerWidth < 768) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  return (
    <aside className="w-full md:w-64 space-y-2">
      <div className="hidden md:block mb-8">
        <h2 className="font-heading text-xl font-bold">My Account</h2>
      </div>
      
      <nav className="flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0 scrollbar-hide">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTabChange(item.id)}
            className={`flex-1 md:flex-grow-0 flex items-center justify-center md:justify-start gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 rounded-xl md:rounded-sm text-xs md:text-sm font-bold md:font-medium transition-all whitespace-nowrap ${
              activeTab === item.id 
                ? "bg-primary text-white shadow-md" 
                : "bg-white text-neutral-dark/40 border border-neutral-dark/5"
            }`}
          >
            <item.icon className="w-4 h-4 md:w-5 md:h-5" />
            {item.name}
          </button>
        ))}
        
        <button 
          onClick={onLogout}
          className="flex-1 md:flex-grow-0 md:mt-8 flex items-center justify-center md:justify-start gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 text-accent hover:bg-accent/5 transition-all text-xs md:text-sm font-bold md:font-medium rounded-xl md:rounded-sm border border-accent/10"
        >
          <ArrowLeftOnRectangleIcon className="w-4 h-4 md:w-5 md:h-5" />
          Logout
        </button>
      </nav>
    </aside>
  );
}

export default UserSidebar;
