import { useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { mediaUrl } from "../../config/api";
import OrderTimeline from "../../components/OrderTimeline";

function AdminOrders({ orders, onUpdateStatus, onUpdateDelivery }) {
  const [filter, setFilter] = useState("All");

  const filteredOrders = orders.filter(o => 
    filter === "All" || o.status === filter
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div className="space-y-2">
          <h2 className="text-3xl font-heading font-bold">Order Tracking</h2>
          <p className="text-neutral-dark/40 text-sm font-body">Manage and update customer orders.</p>
        </div>
        <div className="flex gap-2">
          {["All", "Order Placed", "Shipped", "Delivered", "Cancelled"].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-widest transition-all ${
                filter === s ? "bg-primary text-white" : "bg-neutral-cream text-neutral-dark/40 hover:bg-neutral-dark/5"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {filteredOrders.map((order) => (
          <Card key={order._id} className="p-8 border-none shadow-sm bg-white rounded-sm space-y-8">
            <div className="flex flex-col md:flex-row justify-between gap-8">
              <div className="flex gap-6">
                <div className="w-24 h-32 bg-neutral-cream rounded-sm overflow-hidden shrink-0">
                  <img src={mediaUrl(order.productImage)} className="w-full h-full object-cover" alt="" />
                </div>
                <div className="space-y-2">
                  <h3 className="font-heading text-lg font-bold">{order.productName}</h3>
                  <p className="text-xs font-bold uppercase tracking-widest text-neutral-dark/40">#{order.orderCode}</p>
                  <div className="pt-2 text-sm space-y-1">
                    <p><span className="text-neutral-dark/40">Customer:</span> {order.userName}</p>
                    <p><span className="text-neutral-dark/40">Phone:</span> {order.userPhone}</p>
                    <p><span className="text-neutral-dark/40">Amount:</span> <span className="font-bold text-primary">₹{order.totalAmount?.toLocaleString()}</span></p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 md:w-64">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Order Status</label>
                  <select 
                    value={order.status} 
                    onChange={(e) => onUpdateStatus(order._id, e.target.value)}
                    className="w-full border border-neutral-dark/10 p-3 text-sm focus:outline-none focus:border-primary rounded-sm"
                  >
                    <option>Order Placed</option>
                    <option>Order Confirmed</option>
                    <option>Shipped</option>
                    <option>Out for Delivery</option>
                    <option>Delivered</option>
                    <option>Cancelled</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40">Expected Delivery</label>
                  <input 
                    type="text" 
                    value={order.expectedDelivery || ""} 
                    onChange={(e) => onUpdateDelivery(order._id, e.target.value)}
                    className="w-full border border-neutral-dark/10 p-3 text-sm focus:outline-none focus:border-primary rounded-sm"
                    placeholder="e.g. 5-7 Days"
                  />
                </div>
              </div>
            </div>

            <div className="pt-8 border-t border-neutral-dark/5">
              <OrderTimeline status={order.status} />
            </div>
          </Card>
        ))}
        {filteredOrders.length === 0 && (
          <div className="py-20 text-center bg-neutral-cream rounded-sm italic text-neutral-dark/40">
            No orders found matching this status.
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminOrders;
