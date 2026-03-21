import { useState } from "react";
import { Card } from "../../components/ui/card";
import { mediaUrl } from "../../config/api";
import OrderTimeline from "../../components/OrderTimeline";

function AdminOrders({ orders, onUpdateStatus, onUpdateDelivery, onUpdateCustom }) {
  const [filter, setFilter] = useState("All");

  const filteredOrders = orders.filter(o => 
    filter === "All" || o.status === filter
  );

  const ORDER_STATUSES = [
    "Order Placed",
    "Confirmed",
    "Processing",
    "Shipped",
    "Out for Delivery",
    "Delivered",
    "Cancelled",
    "Custom Request Received",
    "Design Finalized",
    "Advance Payment Requested",
  ];

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="space-y-1 md:space-y-2">
          <h2 className="text-2xl md:text-3xl font-heading font-bold">Order Tracking</h2>
          <p className="text-neutral-dark/40 text-sm font-body">Manage and update customer orders.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 w-full sm:w-auto scrollbar-hide">
          {["All", "Order Placed", "Shipped", "Delivered", "Cancelled", "Custom Request Received"].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-3 md:px-4 py-2 rounded-sm text-[10px] md:text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                filter === s ? "bg-primary text-white" : "bg-neutral-cream text-neutral-dark/40 hover:bg-neutral-dark/5"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 md:space-y-6">
        {filteredOrders.map((order) => (
          <Card key={order._id} className="p-4 md:p-8 border-none shadow-sm bg-white rounded-sm space-y-4 md:space-y-8 max-w-full overflow-hidden">
            {/* Mobile Header: IDs at top */}
            <div className="lg:hidden flex flex-col gap-0.5 border-b border-neutral-dark/5 pb-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-primary font-heading">Order ID: #{order.orderCode}</p>
              {order.upiTransactionId && (
                <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-dark/40">Txn: {order.upiTransactionId}</p>
              )}
            </div>

            <div className="flex flex-col lg:flex-row justify-between gap-4 md:gap-8">
              <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 flex-1 min-w-0">
                
                {/* Mobile: Progress (Left) and Image+Details (Right) side-by-side */}
                <div className="lg:hidden flex gap-4 items-start">
                  <div className="shrink-0 pt-1">
                    <OrderTimeline status={order.status} isCustom={Boolean(order.isCustom)} vertical />
                  </div>
                  <div className="grow min-w-0 space-y-3">
                    <div className="w-full h-36 bg-neutral-cream rounded-sm overflow-hidden border border-neutral-dark/5">
                      <img src={mediaUrl(order.productImage)} className="w-full h-full object-cover" alt="" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-heading text-base font-bold truncate">{order.productName}</h3>
                        {order.isCustom && (
                          <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter shrink-0">Custom</span>
                        )}
                      </div>
                      <div className="text-xs space-y-0.5">
                        <p className="truncate"><span className="text-neutral-dark/40 font-medium">Customer:</span> {order.userName}</p>
                        <p><span className="text-neutral-dark/40 font-medium">Phone:</span> {order.userPhone}</p>
                        <p><span className="text-neutral-dark/40 font-medium">Amount:</span> <span className="font-bold text-primary">₹{order.totalAmount?.toLocaleString()}</span></p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Desktop Layout - Image and Details Sidebar */}
                <div className="hidden lg:flex gap-6 flex-1 min-w-0">
                  <div className="sm:w-24 h-32 bg-neutral-cream rounded-sm overflow-hidden shrink-0">
                    <img src={mediaUrl(order.productImage)} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="space-y-1 grow min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 flex-wrap min-w-0">
                        <h3 className="font-heading text-lg font-bold truncate max-w-none">{order.productName}</h3>
                        {order.isCustom && (
                          <span className="bg-amber-100 text-amber-700 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-tighter">Custom</span>
                        )}
                      </div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-dark/40 shrink-0">#{order.orderCode}</p>
                    </div>
                    <div className="text-sm space-y-0.5">
                      <p className="truncate"><span className="text-neutral-dark/40 font-medium">Customer:</span> {order.userName}</p>
                      <p><span className="text-neutral-dark/40 font-medium">Phone:</span> {order.userPhone}</p>
                      <p><span className="text-neutral-dark/40 font-medium">Amount:</span> <span className="font-bold text-primary">₹{order.totalAmount?.toLocaleString()}</span></p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Controls */}
              <div className="space-y-3 lg:w-80 border-t lg:border-t-0 border-neutral-dark/5 pt-3 lg:pt-0 min-w-0">
                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-dark/40">Order Status</label>
                  <div className="relative">
                    <select 
                      value={order.status} 
                      onChange={(e) => {
                        const nextStatus = e.target.value;
                        if (order.isCustom) {
                          onUpdateCustom(order._id, { status: nextStatus });
                          return;
                        }
                        onUpdateStatus(order._id, nextStatus);
                      }}
                      className="w-full border border-neutral-dark/10 p-2 text-xs focus:outline-none focus:border-primary rounded-sm bg-white cursor-pointer"
                    >
                      {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </div>
                </div>

                {order.isCustom && (
                  <>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-dark/40">Custom Status</label>
                      <input 
                        type="text" 
                        defaultValue={order.customStatus || ""} 
                        onBlur={(e) => onUpdateCustom(order._id, { customStatus: e.target.value })}
                        className="w-full border border-neutral-dark/10 p-2 text-xs focus:outline-none focus:border-primary rounded-sm"
                        placeholder="Artisan's Note..."
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-dark/40">Advance (₹)</label>
                      <div className="flex gap-2">
                        <input 
                          type="number" 
                          defaultValue={order.advanceAmount || 0} 
                          onBlur={(e) => onUpdateCustom(order._id, { advanceAmount: e.target.value })}
                          className="grow border border-neutral-dark/10 p-2 text-xs focus:outline-none focus:border-primary rounded-sm min-w-0"
                        />
                        {order.status === "Advance Payment Requested" && (
                          <span className={`flex items-center px-2 text-[9px] font-bold rounded-sm uppercase shrink-0 ${order.isAdvancePaid ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"}`}>
                            {order.isAdvancePaid ? "Paid" : "Pending"}
                          </span>
                        )}
                      </div>
                    </div>
                  </>
                )}

                <div className="space-y-1">
                  <label className="text-[9px] font-bold uppercase tracking-widest text-neutral-dark/40">Expected Delivery</label>
                  <input 
                    type="text" 
                    defaultValue={order.expectedDelivery || ""} 
                    onBlur={(e) => onUpdateDelivery(order._id, e.target.value)}
                    className="w-full border border-neutral-dark/10 p-2 text-xs focus:outline-none focus:border-primary rounded-sm"
                    placeholder="e.g. 10 Days"
                  />
                </div>
              </div>
            </div>

            {/* Customization Details - Separate for both views if exists */}
            {order.isCustom && (
              <div className="mt-2 p-3 bg-neutral-cream rounded-sm space-y-1 border border-neutral-dark/5">
                <p className="text-[9px] font-bold uppercase text-neutral-dark/60">Customization Details:</p>
                <p className="text-xs italic text-neutral-dark/80 break-words leading-tight">{order.customDetails}</p>
              </div>
            )}

            {/* Desktop only Horizontal Timeline */}
            <div className="hidden lg:block pt-4 border-t border-neutral-dark/5">
              <div className="overflow-x-auto scrollbar-hide">
                <OrderTimeline status={order.status} isCustom={Boolean(order.isCustom)} compact />
              </div>
            </div>
          </Card>
        ))}
        {filteredOrders.length === 0 && (
          <div className="py-12 md:py-20 text-center bg-neutral-cream rounded-sm italic text-neutral-dark/40">
            No orders found matching this status.
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminOrders;
