const DEFAULT_ORDER_STATUS_STEPS = [
  "Order Placed",
  "Confirmed",
  "Processing",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

const CUSTOM_ORDER_STATUS_STEPS = [
  "Order Placed",
  "Custom Request Received",
  "Design Finalized",
  "Advance Payment Requested",
  "Confirmed",
  "Processing",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

function OrderTimeline({ status = "Order Placed", compact = false, isCustom = false, vertical = false }) {
  const steps = isCustom ? CUSTOM_ORDER_STATUS_STEPS : DEFAULT_ORDER_STATUS_STEPS;
  const activeIndex = steps.indexOf(status);
  const isCancelled = status === "Cancelled";

  if (vertical) {
    return (
      <div className="space-y-3">
        {steps.map((step, index) => {
          const isActive = isCancelled ? step === "Cancelled" : index <= activeIndex;
          const isCurrent = step === status;

          return (
            <div key={step} className="flex gap-3 items-start">
              <div className="flex flex-col items-center">
                <span
                  className={`h-2.5 w-2.5 rounded-full border transition-all duration-500 shrink-0 ${isActive
                    ? isCancelled
                      ? "border-accent bg-accent"
                      : "border-primary bg-primary shadow-[0_0_8px_rgba(74,93,78,0.3)]"
                    : "border-neutral-dark/10 bg-white"
                    }`}
                />
                {index < steps.length - 1 && (
                  <div 
                    className={`w-px h-6 transition-all duration-700 ${isActive && !isCancelled && index < activeIndex
                      ? "bg-primary"
                      : "bg-neutral-dark/5"
                    }`}
                  />
                )}
              </div>
              <div className="pt-0">
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider ${isCurrent
                    ? isCancelled
                      ? "text-accent"
                      : "text-primary"
                    : "text-neutral-dark/20"
                    }`}
                >
                  {step}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto pb-1 scrollbar-hide">
      <div className={`min-w-160 ${compact ? "" : "pt-1"}`}>
        <div className="flex items-center">
          {steps.map((step, index) => {
            const isActive = isCancelled ? step === "Cancelled" : index <= activeIndex;
            const isCurrent = step === status;

            return (
              <div key={step} className="flex flex-1 items-center">
                <div className="flex flex-col items-center text-center">
                  <span
                    className={`h-3 w-3 rounded-full border-2 transition-all duration-500 ${isActive
                      ? isCancelled
                        ? "border-accent bg-accent"
                        : "border-primary bg-primary shadow-[0_0_10px_rgba(74,93,78,0.3)]"
                      : "border-neutral-dark/10 bg-white"
                      }`}
                  />
                  <span
                    className={`mt-3 text-[10px] font-bold uppercase tracking-widest ${isCurrent
                      ? isCancelled
                        ? "text-accent"
                        : "text-primary"
                      : "text-neutral-dark/20"
                      }`}
                  >
                    {step}
                  </span>
                </div>

                {index < steps.length - 1 ? (
                  <span
                    className={`mx-2 h-0.5 flex-1 rounded-full transition-all duration-700 ${isActive && !isCancelled && index < activeIndex
                      ? "bg-primary"
                      : "bg-neutral-dark/5"
                      }`}
                  />
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export { DEFAULT_ORDER_STATUS_STEPS, CUSTOM_ORDER_STATUS_STEPS };
export default OrderTimeline;
