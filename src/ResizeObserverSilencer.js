// frontend/src/resizeObserverSilencer.js
if (typeof window !== "undefined") {
  const roMsg = /ResizeObserver loop (limit exceeded|completed with undelivered notifications)/;
  const handler = (e) => {
    if (roMsg.test(e.message)) e.stopImmediatePropagation();
  };
  window.addEventListener("error", handler, true);
}
