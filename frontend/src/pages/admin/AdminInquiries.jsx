import { useState } from "react";
import { Card } from "../../components/ui/card";
import { Button } from "../../components/ui/button";
import { 
  EnvelopeIcon, 
  UserIcon, 
  CalendarIcon,
  ChatBubbleLeftEllipsisIcon,
  CheckCircleIcon,
  ClockIcon
} from "@heroicons/react/24/outline";

function AdminInquiries({ inquiries, onUpdateStatus }) {
  const [filter, setFilter] = useState("All");

  const filtered = inquiries.filter(i => 
    filter === "All" || i.status === filter
  );

  const getStatusColor = (status) => {
    switch (status) {
      case "Pending": return "bg-amber-100 text-amber-700";
      case "Reviewed": return "bg-blue-100 text-blue-700";
      case "Responded": return "bg-emerald-100 text-emerald-700";
      default: return "bg-neutral-100 text-neutral-700";
    }
  };

  return (
    <div className="space-y-6 md:space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div className="space-y-1 md:space-y-2">
          <h2 className="text-2xl md:text-3xl font-heading font-bold">Customer Inquiries</h2>
          <p className="text-neutral-dark/40 text-sm font-body">Manage questions and quote requests from the contact page.</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 w-full sm:w-auto scrollbar-hide">
          {["All", "Pending", "Reviewed", "Responded"].map(s => (
            <button
              key={s}
              onClick={() => setFilter(s)}
              className={`px-4 py-2 rounded-sm text-xs font-bold uppercase tracking-widest transition-all whitespace-nowrap ${
                filter === s ? "bg-primary text-white" : "bg-white border border-neutral-dark/5 text-neutral-dark/40 hover:bg-neutral-dark/5"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:gap-6">
        {filtered.map((item) => (
          <Card key={item._id} className="p-6 md:p-8 border-none shadow-sm bg-white rounded-sm space-y-6">
            <div className="flex flex-col md:flex-row justify-between gap-4">
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                  <span className="text-[10px] text-neutral-dark/30 font-bold uppercase tracking-widest flex items-center gap-1">
                    <CalendarIcon className="w-3 h-3" />
                    {new Date(item.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </span>
                </div>
                
                <div className="space-y-1">
                  <h3 className="text-xl font-heading font-bold text-neutral-dark">{item.subject}</h3>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-neutral-dark/60 font-body">
                    <p className="flex items-center gap-2"><UserIcon className="w-4 h-4 text-primary/40" /> {item.name}</p>
                    <p className="flex items-center gap-2"><EnvelopeIcon className="w-4 h-4 text-primary/40" /> {item.email}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2 shrink-0">
                {item.status !== "Responded" && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-9 text-[10px] uppercase tracking-widest font-bold border-emerald-100 text-emerald-700 hover:bg-emerald-50"
                    onClick={() => onUpdateStatus(item._id, "Responded")}
                  >
                    Mark Responded
                  </Button>
                )}
                {item.status === "Pending" && (
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="h-9 text-[10px] uppercase tracking-widest font-bold border-blue-100 text-blue-700 hover:bg-blue-50"
                    onClick={() => onUpdateStatus(item._id, "Reviewed")}
                  >
                    Mark Reviewed
                  </Button>
                )}
              </div>
            </div>

            <div className="bg-neutral-cream p-6 rounded-sm border border-neutral-dark/5">
              <div className="flex gap-3">
                <ChatBubbleLeftEllipsisIcon className="w-5 h-5 text-primary/20 shrink-0 mt-1" />
                <p className="text-sm text-neutral-dark/80 font-body leading-relaxed whitespace-pre-wrap italic">
                  "{item.message}"
                </p>
              </div>
            </div>
          </Card>
        ))}

        {filtered.length === 0 && (
          <div className="py-20 text-center bg-neutral-cream rounded-sm italic text-neutral-dark/40">
            No inquiries found.
          </div>
        )}
      </div>
    </div>
  );
}

export default AdminInquiries;
