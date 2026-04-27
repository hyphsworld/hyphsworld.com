const selected = document.getElementById("selectedProduct");

document.querySelectorAll(".order-link").forEach(link => {
  link.addEventListener("click", () => {
    const product = link.dataset.product || "HYPHSWORLD merch";
    if (selected) {
      selected.textContent = `Selected: ${product}. Send product, size, quantity, shipping info, and payment method.`;
    }
    if (window.gtag) {
      gtag("event", "merch_order_click", { event_label: product });
    }
  });
});

document.querySelectorAll(".pay-btn").forEach(link => {
  link.addEventListener("click", () => {
    if (window.gtag) {
      gtag("event", "merch_payment_click", { event_label: link.textContent.trim() });
    }
  });
});
