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
                    className={`h-4 w-4 rounded-full border-2 ${isActive
                      ? isCancelled
                        ? "border-rose-500 bg-rose-500"
                        : "border-emerald-500 bg-emerald-500"
                      : "border-slate-300 bg-white"
                      }`}
                  />
                  <span
                    className={`mt-2 text-[10px] font-medium sm:text-xs ${isCurrent
                      ? isCancelled
                        ? "text-rose-600"
                        : "text-emerald-700"
                      : "text-slate-500"
                      }`}
                  >
                    {step}
                  </span>
                </div>

                {index < ORDER_STATUS_STEPS.length - 1 ? (
                  <span
                    className={`mx-2 h-1 flex-1 rounded-full ${isActive && !isCancelled
                      ? "bg-emerald-400"
                      : "bg-slate-200"
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
