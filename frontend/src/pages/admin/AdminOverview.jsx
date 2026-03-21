import { 
  CurrencyRupeeIcon, 
  ShoppingBagIcon, 
  UsersIcon, 
  ClipboardDocumentCheckIcon 
} from "@heroicons/react/24/outline";
import { Card } from "../../components/ui/card";

function AdminOverview({ products, orders }) {
  const totalRevenue = orders
    .filter(o => o.status !== "Cancelled")
    .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
  
  const stats = [
    { name: 'Total Revenue', value: `₹${totalRevenue.toLocaleString()}`, icon: CurrencyRupeeIcon, color: 'text-emerald-600' },
    { name: 'Total Products', value: products.length, icon: ShoppingBagIcon, color: 'text-blue-600' },
    { name: 'Total Orders', value: orders.length, icon: ClipboardDocumentCheckIcon, color: 'text-primary' },
    { name: 'Active Users', value: new Set(orders.map(o => o.userEmail)).size, icon: UsersIcon, color: 'text-secondary' },
  ];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <h2 className="text-2xl md:text-3xl font-heading font-bold">Dashboard Overview</h2>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {stats.map((stat) => (
          <Card key={stat.name} className="p-4 md:p-6 border-none shadow-sm bg-white rounded-sm space-y-3 md:space-y-4">
            <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center bg-neutral-cream ${stat.color}`}>
              <stat.icon className="w-5 h-5 md:w-6 md:h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-[10px] md:text-xs font-bold uppercase tracking-widest text-neutral-dark/40">{stat.name}</p>
              <p className="text-xl md:text-2xl font-body font-bold text-neutral-dark">{stat.value}</p>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 pt-4 md:pt-8">
        <Card className="p-4 md:p-8 border-none shadow-sm bg-white rounded-sm space-y-4 md:space-y-6">
          <h3 className="font-heading text-lg md:text-xl font-bold">Recent Orders</h3>
          <div className="space-y-2 md:space-y-4">
            {orders.slice(0, 5).map((order) => (
              <div key={order._id} className="flex justify-between items-center py-3 border-b border-neutral-dark/5 last:border-0">
                <div className="space-y-1">
                  <p className="text-sm font-bold truncate max-w-[120px] sm:max-w-none">{order.productName}</p>
                  <p className="text-xs text-neutral-dark/40">#{order.orderCode} • {order.userName}</p>
                </div>
                <div className="text-right space-y-1 shrink-0">
                  <p className="text-sm font-bold text-primary">₹{order.totalAmount?.toLocaleString()}</p>
                  <p className={`text-[10px] font-bold uppercase tracking-widest ${
                    order.status === 'Cancelled' ? 'text-accent' : 'text-emerald-600'
                  }`}>{order.status}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-4 md:p-8 border-none shadow-sm bg-white rounded-sm space-y-4 md:space-y-6">
          <h3 className="font-heading text-lg md:text-xl font-bold">Low Stock Alert</h3>
          <div className="space-y-2 md:space-y-4">
            {products.filter(p => (p.stock || 0) < 5).map((product) => (
              <div key={product._id} className="flex justify-between items-center py-3 border-b border-neutral-dark/5 last:border-0">
                <div className="space-y-1">
                  <p className="text-sm font-bold truncate max-w-[150px] sm:max-w-none">{product.name}</p>
                  <p className="text-xs text-neutral-dark/40">{product.section}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`px-2 md:px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-accent/10 text-accent`}>
                    Only {product.stock || 0} Left
                  </span>
                </div>
              </div>
            ))}
            {products.filter(p => (p.stock || 0) < 5).length === 0 && (
              <p className="text-center py-12 text-sm text-neutral-dark/40 italic">All products are well-stocked.</p>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}

export default AdminOverview;
