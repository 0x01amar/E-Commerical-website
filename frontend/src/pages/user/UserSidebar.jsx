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

  return (
    <aside className="w-full md:w-64 space-y-2">
      <div className="hidden md:block mb-8">
        <h2 className="font-heading text-xl font-bold">My Account</h2>
      </div>
      
      <nav className="flex md:flex-col gap-2 overflow-x-auto pb-4 md:pb-0">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex-grow md:flex-grow-0 flex items-center gap-4 px-6 py-4 rounded-sm text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === item.id 
                ? "bg-primary text-white shadow-md" 
                : "bg-white text-neutral-dark/40 hover:bg-neutral-dark/5"
            }`}
          >
            <item.icon className="w-5 h-5" />
            {item.name}
          </button>
        ))}
        
        <button 
          onClick={onLogout}
          className="flex-grow md:flex-grow-0 md:mt-8 flex items-center gap-4 px-6 py-4 text-accent hover:bg-accent/5 transition-all text-sm font-medium rounded-sm border border-accent/10 md:border-none"
        >
          <ArrowLeftOnRectangleIcon className="w-5 h-5" />
          Logout
        </button>
      </nav>
    </aside>
  );
}

export default UserSidebar;
