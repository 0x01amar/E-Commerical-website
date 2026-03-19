const ORDER_STATUS_STEPS = [
  "Order Placed",
  "Confirmed",
  "Processing",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

function OrderTimeline({ status = "Order Placed", compact = false }) {
  const activeIndex = ORDER_STATUS_STEPS.indexOf(status);
  const isCancelled = status === "Cancelled";

  return (
    <div className="overflow-x-auto pb-1">
      <div className={`min-w-160 ${compact ? "" : "pt-1"}`}>
        <div className="flex items-center">
          {ORDER_STATUS_STEPS.map((step, index) => {
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

                {index < ORDER_STATUS_STEPS.length - 1 ? (
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

export { ORDER_STATUS_STEPS };
export default OrderTimeline;
