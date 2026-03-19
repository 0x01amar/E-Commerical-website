import { useEffect, useState } from "react";
import { CheckCircleIcon, ExclamationTriangleIcon, InformationCircleIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { TOAST_EVENT_NAME } from "../config/toast";

const getToastStyles = (type = "info") => {
  if (type === "success") {
    return {
      wrapper: "border-emerald-200 bg-emerald-50 text-emerald-700",
      Icon: CheckCircleIcon,
    };
  }

  if (type === "error") {
    return {
      wrapper: "border-rose-200 bg-rose-50 text-rose-700",
      Icon: ExclamationTriangleIcon,
    };
  }

  return {
    wrapper: "border-sky-200 bg-white text-slate-700",
    Icon: InformationCircleIcon,
  };
};

function ToastHost() {
  const [toasts, setToasts] = useState([]);

  useEffect(() => {
    const handleToast = (event) => {
      const detail = event?.detail || {};
      const id = String(detail.id || `${Date.now()}-${Math.random()}`);
      const message = String(detail.message || "").trim();
      const type = String(detail.type || "info");
      const duration = Number(detail.duration || 2800);

      if (!message) {
        return;
      }

      setToasts((prev) => [...prev, { id, message, type }]);

      window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
      }, Number.isFinite(duration) && duration > 0 ? duration : 2800);
    };

    window.addEventListener(TOAST_EVENT_NAME, handleToast);

    return () => {
      window.removeEventListener(TOAST_EVENT_NAME, handleToast);
    };
  }, []);

  if (!toasts.length) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed right-4 top-4 z-[130] flex w-[min(92vw,22rem)] flex-col gap-2">
      {toasts.map((toast) => {
        const styles = getToastStyles(toast.type);
        const Icon = styles.Icon;

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-2 rounded-xl border px-3 py-2 shadow-lg animate-fade-in ${styles.wrapper}`}
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="flex-1 text-sm font-medium leading-5">{toast.message}</p>
            <button
              type="button"
              onClick={() => setToasts((prev) => prev.filter((item) => item.id !== toast.id))}
              className="rounded-md p-0.5 transition hover:bg-black/5"
              aria-label="Dismiss notification"
            >
              <XMarkIcon className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

export default ToastHost;
