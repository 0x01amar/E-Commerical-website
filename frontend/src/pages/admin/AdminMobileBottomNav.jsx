import { 
  Squares2X2Icon, 
  ShoppingBagIcon, 
  ClipboardDocumentListIcon, 
  Cog6ToothIcon,
  ArrowLeftOnRectangleIcon,
  ChatBubbleLeftRightIcon
} from "@heroicons/react/24/outline";
import { 
  Squares2X2Icon as SquaresSolid, 
  ShoppingBagIcon as ShoppingSolid, 
  ClipboardDocumentListIcon as ClipboardSolid, 
  Cog6ToothIcon as CogSolid,
  ChatBubbleLeftRightIcon as ChatSolid
} from "@heroicons/react/24/solid";

function AdminMobileBottomNav({ activeTab, setActiveTab, onLogout }) {
  const menuItems = [
    { id: 'overview', name: 'Overview', icon: Squares2X2Icon, activeIcon: SquaresSolid },
    { id: 'products', name: 'Products', icon: ShoppingBagIcon, activeIcon: ShoppingSolid },
    { id: 'orders', name: 'Orders', icon: ClipboardDocumentListIcon, activeIcon: ClipboardSolid },
    { id: 'inquiries', name: 'Inqs', icon: ChatBubbleLeftRightIcon, activeIcon: ChatSolid },
    { id: 'settings', name: 'Settings', icon: Cog6ToothIcon, activeIcon: CogSolid },
  ];

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-lg border-t border-neutral-dark/5 px-2 pb-6 pt-3 z-50 flex items-center justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.03)] rounded-t-[32px]">
      {menuItems.map((item) => {
        const isActive = activeTab === item.id;
        const Icon = isActive ? item.activeIcon : item.icon;

        return (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className="flex flex-col items-center gap-1 group flex-1"
          >
            <div className={`p-2 rounded-2xl transition-all duration-300 ${isActive ? 'bg-primary text-white scale-110' : 'text-neutral-dark/40 group-active:scale-90'}`}>
              <Icon className="w-6 h-6" />
            </div>
            <span className={`text-[10px] font-bold uppercase tracking-wider transition-colors duration-300 ${isActive ? 'text-primary' : 'text-neutral-dark/40'}`}>
              {item.name}
            </span>
          </button>
        );
      })}
      
      <button
        onClick={onLogout}
        className="flex flex-col items-center gap-1 group flex-1"
      >
        <div className="p-2 rounded-2xl text-accent group-active:scale-90 transition-all duration-300">
          <ArrowLeftOnRectangleIcon className="w-6 h-6" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider text-accent">
          Exit
        </span>
      </button>
    </nav>
  );
}

export default AdminMobileBottomNav;
