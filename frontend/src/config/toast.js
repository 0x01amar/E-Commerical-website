export const TOAST_EVENT_NAME = "maa-sheela-toast";

export const showToast = (message = "", type = "info", duration = 2800) => {
  const text = String(message || "").trim();

  if (!text || typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(TOAST_EVENT_NAME, {
    detail: {
      id: `${Date.now()}-${Math.random()}`,
      message: text,
      type,
      duration,
    },
  }));
};
