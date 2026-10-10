export const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export function amounts(d) {
  const subtotal = round(d.items.reduce((a, i) => a + i.qty * i.price, 0));
  const discount = round((subtotal * d.discount) / 100);
  const total = round(subtotal - discount);
  const paid = round(d.payments.reduce((a, p) => a + p.amount, 0));
  return { subtotal, discount, total, paid, remaining: round(total - paid) };
}
export function status(d, today) {
  if (d.type === "quote") return "عرض سعر";
  const a = amounts(d);
  if (a.remaining <= 0) return "مدفوعة";
  if (d.due < today) return "متأخرة";
  return a.paid > 0 ? "مدفوعة جزئيًا" : "بانتظار الدفع";
}
