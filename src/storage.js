import { addDemoData } from "./demo-data.js";
const KEY = "daftar-v1";
export const emptyState = () => ({
  version: 1,
  clients: [],
  services: [],
  documents: [],
  settings: { business: "استوديو العمل الحر", email: "", currency: "USD" },
});
export const repository = {
  load() {
    const raw = localStorage.getItem(KEY);
    const state = raw ? JSON.parse(raw) : emptyState();
    validate(state);
    // Apply the requested USD default once while preserving later currency choices
    const currencyUpdateKey = `${KEY}-usd-default-v1`;
    if (!localStorage.getItem(currencyUpdateKey)) {
      state.settings.currency = "USD";
      localStorage.setItem(KEY, JSON.stringify(state));
      localStorage.setItem(currencyUpdateKey, "done");
    }
    const demoUpdateKey = `${KEY}-demo-v1`;
    if (!localStorage.getItem(demoUpdateKey)) {
      addDemoData(state);
      validate(state);
      localStorage.setItem(KEY, JSON.stringify(state));
      localStorage.setItem(demoUpdateKey, "done");
    }
    // Update the original demo names without overwriting custom client names
    const originalDemoNames = {
      "demo-client-1": ["استوديو مدار التجريبي", "استوديو مدار"],
      "demo-client-2": ["متجر ورد التجريبي", "متجر ورد"],
      "demo-client-3": ["شركة أفق التجريبية", "شركة أفق"],
      "demo-client-4": ["مقهى نواة التجريبي", "مقهى نواة"],
    };
    let namesUpdated = false;
    for (const client of state.clients) {
      const names = originalDemoNames[client.id];
      if (names && client.name === names[0]) {
        client.name = names[1];
        namesUpdated = true;
      }
    }
    if (namesUpdated) localStorage.setItem(KEY, JSON.stringify(state));
    return state;
  },
  save(state) {
    localStorage.setItem(KEY, JSON.stringify(state));
  },
};
export function validate(s) {
  if (
    !s ||
    s.version !== 1 ||
    !s.settings ||
    typeof s.settings.business !== "string" ||
    typeof s.settings.email !== "string" ||
    !["SAR", "USD", "JOD", "AED", "EGP"].includes(s.settings.currency) ||
    !["clients", "services", "documents"].every((k) => Array.isArray(s[k]))
  )
    throw Error("ملف النسخة الاحتياطية غير صالح");
  const ids = new Set();
  for (const c of s.clients) {
    if (
      typeof c.id !== "string" ||
      ids.has(c.id) ||
      typeof c.name !== "string" ||
      !c.name.trim() ||
      typeof c.email !== "string" ||
      typeof c.phone !== "string"
    )
      throw Error("بيانات العملاء غير صالحة");
    ids.add(c.id);
  }
  for (const x of s.services)
    if (
      typeof x.id !== "string" ||
      typeof x.name !== "string" ||
      !Number.isFinite(x.price) ||
      x.price < 0
    )
      throw Error("بيانات الخدمات غير صالحة");
  const docs = new Set();
  for (const d of s.documents) {
    if (
      typeof d.id !== "string" ||
      docs.has(d.id) ||
      typeof d.number !== "string" ||
      !["invoice", "quote"].includes(d.type) ||
      !ids.has(d.clientId) ||
      !Array.isArray(d.items) ||
      !d.items.length ||
      !Array.isArray(d.payments) ||
      !Number.isFinite(d.discount) ||
      d.discount < 0 ||
      d.discount > 100 ||
      typeof d.notes !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(d.date) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(d.due) ||
      d.items.some(
        (i) =>
          typeof i.name !== "string" ||
          !i.name.trim() ||
          !Number.isFinite(i.qty) ||
          i.qty <= 0 ||
          !Number.isFinite(i.price) ||
          i.price < 0,
      ) ||
      d.payments.some(
        (p) =>
          !Number.isFinite(p.amount) ||
          p.amount <= 0 ||
          typeof p.date !== "string",
      )
    )
      throw Error("بيانات المستندات غير صالحة");
    docs.add(d.id);
    const total =
      d.items.reduce((a, i) => a + i.qty * i.price, 0) * (1 - d.discount / 100);
    if (d.payments.reduce((a, p) => a + p.amount, 0) > total + 0.01)
      throw Error("دفعات تتجاوز قيمة الفاتورة");
  }
}
