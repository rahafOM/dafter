// Fictional records used to demonstrate the complete invoice workflow
export function createDemoData() {
  const date = (offset) => {
    const value = new Date();
    value.setDate(value.getDate() + offset);
    return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
  };
  const clients = [
    { id: "demo-client-1", name: "استوديو مدار", email: "madar@example.com", phone: "" },
    { id: "demo-client-2", name: "متجر ورد", email: "ward@example.com", phone: "" },
    { id: "demo-client-3", name: "شركة أفق", email: "ofuq@example.com", phone: "" },
    { id: "demo-client-4", name: "مقهى نواة", email: "nawa@example.com", phone: "" },
  ];
  const services = [
    { id: "demo-service-1", name: "تصميم واجهات موقع", price: 1000 },
    { id: "demo-service-2", name: "تطوير موقع", price: 2000 },
    { id: "demo-service-3", name: "تصميم هوية بصرية", price: 800 },
    { id: "demo-service-4", name: "تصميم منشور", price: 50 },
    { id: "demo-service-5", name: "كتابة محتوى صفحة", price: 150 },
  ];
  const document = (id, type, clientId, issued, due, items, discount = 0, payments = []) => ({
    id, type, number: "", clientId, date: date(issued), due: date(due), items, discount, payments,
    notes: "مستند تجريبي لتوضيح طريقة عمل الموقع",
  });
  const documents = [
    document("demo-invoice-paid", "invoice", clients[1].id, -20, -8,
      [{ name: "تصميم هوية بصرية", qty: 1, price: 800 }], 0,
      [{ id: "demo-payment-1", amount: 400, date: date(-18) }, { id: "demo-payment-2", amount: 400, date: date(-10) }]),
    document("demo-invoice-overdue", "invoice", clients[2].id, -15, -4,
      [{ name: "كتابة محتوى صفحة", qty: 4, price: 150 }], 0,
      [{ id: "demo-payment-3", amount: 200, date: date(-12) }]),
    document("demo-quote-open", "quote", clients[3].id, -1, 20,
      [{ name: "تصميم هوية بصرية", qty: 1, price: 800 }, { name: "تصميم منشور", qty: 6, price: 50 }], 5),
    document("demo-invoice-unpaid", "invoice", clients[3].id, -2, 10,
      [{ name: "تصميم منشور", qty: 12, price: 50 }]),
    document("demo-invoice-partial", "invoice", clients[0].id, -5, 14,
      [{ name: "تصميم واجهات موقع", qty: 1, price: 1000 }, { name: "تطوير موقع", qty: 1, price: 2000 }], 10,
      [{ id: "demo-payment-4", amount: 1000, date: date(-3) }]),
  ];
  return { clients, services, documents };
}

export function addDemoData(state) {
  const demo = createDemoData();
  for (const key of ["clients", "services", "documents"]) {
    for (const record of demo[key]) {
      if (state[key].some((existing) => existing.id === record.id)) continue;
      if (key === "documents") {
        const prefix = record.type === "invoice" ? "INV" : "QUO";
        let counter = 1;
        do { record.number = `${prefix}-${String(counter++).padStart(3, "0")}`; }
        while (state.documents.some((existing) => existing.number === record.number));
      }
      state[key].push(record);
    }
  }
  return state;
}
