import { repository, emptyState, validate } from "./storage.js";
import { amounts, status, round } from "./model.js";
const $ = (s) => document.querySelector(s),
  esc = (v) =>
    String(v ?? "").replace(
      /[&<>"']/g,
      (c) =>
        ({
          "&": "&amp;",
          "<": "&lt;",
          ">": "&gt;",
          '"': "&quot;",
          "'": "&#39;",
        })[c],
    );
const uid = () => crypto.randomUUID(),
  today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };
let state;
try {
  state = repository.load();
} catch (e) {
  state = emptyState();
  setTimeout(
    () =>
      toast(
        "تعذّر قراءة البيانات المحفوظة يمكن استيراد نسخة احتياطية لاستعادة البيانات",
      ),
    50,
  );
}
let page = "dashboard",
  query = "";
const titles = {
  dashboard: "نظرة عامة",
  documents: "الفواتير وعروض الأسعار",
  clients: "العملاء",
  services: "الخدمات",
  settings: "الإعدادات والنسخ الاحتياطي",
};
const money = (n) =>
  new Intl.NumberFormat("ar", {
    style: "currency",
    currency: state.settings.currency,
    maximumFractionDigits: 2,
  }).format(n);
function toast(m) {
  $("#toast").textContent = m;
  $("#toast").style.display = "block";
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => ($("#toast").style.display = "none"), 5000);
}
function commit(next) {
  try {
    repository.save(next);
    state = next;
    $("#save-state").textContent = "تم الحفظ على هذا المتصفح";
    render();
    return true;
  } catch (e) {
    toast("تعذّر الحفظ قد تكون مساحة المتصفح ممتلئة يُنصح بتصدير نسخة احتياطية");
    return false;
  }
}
function mutate(fn) {
  const next = structuredClone(state);
  fn(next);
  return commit(next);
}
function modal(title, body) {
  $("#modal").innerHTML =
    `<div class="modal-head"><h2>${title}</h2><button class="secondary" data-close aria-label="إغلاق">×</button></div>${body}`;
  $("#modal").showModal();
  $("#modal").querySelector("[data-close]").onclick = () => $("#modal").close();
}
function clientName(id) {
  return state.clients.find((c) => c.id === id)?.name || "عميل غير موجود";
}
function badge(d) {
  const s = status(d, today());
  return `<span class="badge ${s === "متأخرة" || s === "بانتظار الدفع" ? "warn" : d.type === "quote" ? "gray" : ""}">${s}</span>`;
}
function rows(docs) {
  return docs.length
    ? `<div class="table-wrap"><table><thead><tr><th>المستند / العميل</th><th>القيمة</th><th>الحالة</th><th>الإجراءات</th></tr></thead><tbody>${docs.map((d) => `<tr><td><b>${esc(d.number)}</b><br><span class="muted">${esc(clientName(d.clientId))}</span></td><td>${money(amounts(d).total)}<br><small class="muted">${esc(d.date)}</small></td><td>${badge(d)}</td><td><button class="secondary" data-preview="${d.id}">عرض</button><button class="secondary" data-edit="${d.id}">تعديل</button>${d.type === "quote" ? `<button data-convert="${d.id}">تحويل لفاتورة</button>` : amounts(d).remaining > 0 ? `<button data-pay="${d.id}">دفعة</button>` : ""}<button class="danger" data-delete="${d.id}">حذف</button></td></tr>`).join("")}</tbody></table></div>`
    : '<div class="empty">لا توجد مستندات حتى الآن<br>يمكن البدء بإضافة عميل ثم إنشاء أول عرض سعر</div>';
}
function render() {
  $("#nav").innerHTML = Object.entries(titles)
    .map(
      ([k, v]) =>
        `<button data-page="${k}" class="${page === k ? "active" : ""}">${v}</button>`,
    )
    .join("");
  let html = `<div class="heading"><div><h1>${titles[page]}</h1><span class="muted">${page === "dashboard" ? "كل تفاصيل شغلك في مكان واحد" : "إدارة بسيطة تخلّي وقتك لشغلك"}</span></div></div>`;
  if (page === "dashboard") {
    const inv = state.documents.filter((d) => d.type === "invoice");
    const total = round(inv.reduce((a, d) => a + amounts(d).total, 0)),
      paid = round(inv.reduce((a, d) => a + amounts(d).paid, 0));
    html += `<div class="hero"><div><h2>من أول اتفاق لآخر دفعة</h2><p>إعداد عرض سعر واضح وتحويله إلى فاتورة عند بدء العمل</p></div><button data-new>＋ إنشاء عرض سعر</button></div><div class="stats">${[
      ["إجمالي الفواتير", money(total), "قيمة الفواتير بعد الخصم"],
      ["المبالغ المحصّلة", money(paid), "الدفعات المسجّلة"],
      ["المبالغ المتبقية", money(total - paid), "رصيد الفواتير المفتوحة"],
      ["عملاؤك", state.clients.length, "علاقات تستحق التنظيم"],
    ]
      .map(
        ([a, b, c]) =>
          `<div class="stat"><span class="muted">${a}</span><b>${b}</b><small>${c}</small></div>`,
      )
      .join(
        "",
      )}</div><div class="grid"><section class="panel"><div class="panel-title"><h2>آخر المستندات</h2><button class="secondary" data-page="documents">عرض الكل ←</button></div>${rows([...state.documents].reverse().slice(0, 5))}</section><section class="panel"><h2>رحلة شغلك</h2><ol class="steps"><li>إضافة العميل ومعلومات التواصل</li><li>تحديد الخدمات وإرسال عرض السعر</li><li>تحويل العرض المقبول إلى فاتورة</li><li>تسجيل الدفعات ومتابعة الرصيد</li></ol><div class="tip">يمكن تجربة دورة العمل كاملة باستخدام عميل واحد وخدمة واحدة</div></section></div>`;
  }
  if (page === "documents")
    html += `<div class="toolbar"><input id="search" placeholder="بحث برقم المستند أو اسم العميل" value="${esc(query)}"><button data-new>＋ مستند جديد</button></div><section class="panel" id="document-list">${rows(filtered())}</section>`;
  if (page === "clients")
    html += `<section class="panel"><div class="panel-title"><h2>قائمة العملاء (${state.clients.length})</h2><button id="add-client">＋ إضافة عميل</button></div>${state.clients.length ? state.clients.map((c) => `<div class="client-card"><div class="avatar">${esc(c.name.charAt(0))}</div><div><b>${esc(c.name)}</b><small>${esc(c.email || c.phone || "لا توجد معلومات تواصل")}</small></div><button class="secondary" data-client="${c.id}">تعديل</button></div>`).join("") : '<div class="empty">إضافة أول عميل لبدء العمل</div>'}</section>`;
  if (page === "services")
    html += `<section class="panel"><div class="panel-title"><h2>كتالوج الخدمات</h2><button id="add-service">＋ إضافة خدمة</button></div>${state.services.length ? state.services.map((s) => `<div class="client-card"><div class="avatar">◇</div><div><b>${esc(s.name)}</b><small>${money(s.price)}</small></div><button class="secondary" data-service="${s.id}">تعديل</button></div>`).join("") : '<div class="empty">حفظ الخدمات وأسعارها يتيح إضافتها للمستند بضغطة واحدة</div>'}</section>`;
  if (page === "settings")
    html += `<div class="grid"><section class="panel"><h2>بيانات نشاطك</h2><form id="settings-form"><div class="fields" style="margin-top:20px"><label class="wide">اسم النشاط<input name="business" required value="${esc(state.settings.business)}"></label><label>البريد الإلكتروني<input type="email" name="email" value="${esc(state.settings.email)}"></label><label>العملة<select name="currency">${[
      ["SAR", "ريال سعودي"],
      ["USD", "دولار أمريكي"],
      ["JOD", "دينار أردني"],
      ["AED", "درهم إماراتي"],
      ["EGP", "جنيه مصري"],
    ]
      .map(
        ([v, t]) =>
          `<option value="${v}" ${state.settings.currency === v ? "selected" : ""}>${t}</option>`,
      )
      .join(
        "",
      )}</select></label></div><p class="metric-note">العملة تنطبق على كل المستندات تغييرها لا يحوّل قيم المبالغ</p><button>حفظ الإعدادات</button></form></section><section class="panel"><h2>نسخة احتياطية</h2><p class="muted">البيانات محفوظة في هذا المتصفح فقط وقد تُحذف عند مسح بياناته يمكن تصدير نسخة لنقل البيانات إلى جهاز آخر</p><button id="export">تصدير البيانات</button><label style="margin-top:20px">استيراد نسخة احتياطية<input id="import" type="file" accept=".json,application/json"></label><p class="warning">الاستيراد يستبدل البيانات الحالية بعد التأكيد</p></section></div>`;
  $("#view").innerHTML = html;
  bind();
}
function filtered() {
  return [...state.documents]
    .reverse()
    .filter((d) =>
      (d.number + " " + clientName(d.clientId))
        .toLowerCase()
        .includes(query.toLowerCase()),
    );
}
function bind() {
  document.querySelectorAll("[data-page]").forEach(
    (b) =>
      (b.onclick = () => {
        page = b.dataset.page;
        query = "";
        render();
      }),
  );
  document
    .querySelectorAll("[data-new]")
    .forEach((b) => (b.onclick = () => editDocument()));
  bindRows();
  $("#add-client")?.addEventListener("click", () => editClient());
  $("#add-service")?.addEventListener("click", () => editService());
  document
    .querySelectorAll("[data-client]")
    .forEach((b) => (b.onclick = () => editClient(b.dataset.client)));
  document
    .querySelectorAll("[data-service]")
    .forEach((b) => (b.onclick = () => editService(b.dataset.service)));
  $("#search")?.addEventListener("input", (e) => {
    query = e.target.value;
    $("#document-list").innerHTML = rows(filtered());
    bindRows();
  });
  $("#settings-form")?.addEventListener("submit", (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const settings = Object.fromEntries(f);
    if (
      state.documents.length &&
      settings.currency !== state.settings.currency &&
      !confirm(
        "تغيير العملة سيغيّر رمز العملة لجميع المستندات دون تحويل المبالغ متابعة؟",
      )
    )
      return;
    if (mutate((s) => (s.settings = settings))) toast("تم حفظ الإعدادات");
  });
  $("#export")?.addEventListener("click", () =>
    download(JSON.stringify(state, null, 2), `daftar-backup-${today()}.json`),
  );
  $("#import")?.addEventListener("change", async (e) => {
    try {
      const s = JSON.parse(await e.target.files[0].text());
      validate(s);
      if (confirm("استبدال جميع بياناتك بالنسخة المستوردة؟") && commit(s))
        toast("تم استيراد النسخة الاحتياطية");
    } catch (err) {
      toast(err.message || "تعذّر استيراد الملف");
    }
  });
}
function bindRows() {
  document
    .querySelectorAll("[data-preview]")
    .forEach((b) => (b.onclick = () => preview(b.dataset.preview)));
  document
    .querySelectorAll("[data-edit]")
    .forEach((b) => (b.onclick = () => editDocument(b.dataset.edit)));
  document
    .querySelectorAll("[data-pay]")
    .forEach((b) => (b.onclick = () => payment(b.dataset.pay)));
  document.querySelectorAll("[data-delete]").forEach(
    (b) =>
      (b.onclick = () => {
        if (confirm("حذف المستند ودفعاته المسجّلة؟"))
          mutate(
            (s) =>
              (s.documents = s.documents.filter(
                (d) => d.id !== b.dataset.delete,
              )),
          );
      }),
  );
  document.querySelectorAll("[data-convert]").forEach(
    (b) =>
      (b.onclick = () => {
        const source = state.documents.find((d) => d.id === b.dataset.convert);
        const existing = state.documents.find((d) => d.quoteId === source.id);
        if (existing) {
          toast("تم تحويل هذا العرض سابقًا");
          preview(existing.id);
          return;
        }
        if (
          mutate((s) =>
            s.documents.push({
              ...structuredClone(source),
              id: uid(),
              number: nextNumber("invoice"),
              type: "invoice",
              payments: [],
              quoteId: source.id,
            }),
          )
        )
          toast("تم إنشاء فاتورة مع الاحتفاظ بعرض السعر");
      }),
  );
}
function editClient(id) {
  const c = state.clients.find((c) => c.id === id) || {
    name: "",
    email: "",
    phone: "",
  };
  modal(
    id ? "تعديل العميل" : "إضافة عميل",
    `<form id="client-form"><div class="fields"><label class="wide">اسم العميل<input name="name" value="${esc(c.name)}" required></label><label>البريد الإلكتروني<input name="email" type="email" value="${esc(c.email)}"></label><label>رقم الهاتف<input name="phone" value="${esc(c.phone)}"></label></div><div class="actions"><button>حفظ العميل</button></div></form>`,
  );
  $("#client-form").onsubmit = (e) => {
    e.preventDefault();
    const data = Object.fromEntries(new FormData(e.target));
    data.name = data.name.trim();
    if (!data.name) return;
    if (
      mutate((s) => {
        if (id)
          Object.assign(
            s.clients.find((c) => c.id === id),
            data,
          );
        else s.clients.push({ id: uid(), ...data });
      })
    )
      $("#modal").close();
  };
}
function editService(id) {
  const v = state.services.find((s) => s.id === id) || { name: "", price: 0 };
  modal(
    id ? "تعديل الخدمة" : "إضافة خدمة",
    `<form id="service-form"><div class="fields"><label>اسم الخدمة<input name="name" required value="${esc(v.name)}"></label><label>السعر الافتراضي<input type="number" name="price" min="0" step="0.01" required value="${v.price}"></label></div><div class="actions"><button>حفظ الخدمة</button></div></form>`,
  );
  $("#service-form").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target),
      data = { name: f.get("name").trim(), price: Number(f.get("price")) };
    if (!data.name) return;
    if (
      mutate((s) => {
        if (id)
          Object.assign(
            s.services.find((s) => s.id === id),
            data,
          );
        else s.services.push({ id: uid(), ...data });
      })
    )
      $("#modal").close();
  };
}
function nextNumber(type) {
  const prefix = type === "invoice" ? "INV" : "QUO";
  let n = 1;
  while (
    state.documents.some(
      (d) => d.number === `${prefix}-${String(n).padStart(3, "0")}`,
    )
  )
    n++;
  return `${prefix}-${String(n).padStart(3, "0")}`;
}
function editDocument(id) {
  if (!state.clients.length) {
    toast("يلزم إضافة عميل قبل إنشاء المستند");
    page = "clients";
    render();
    editClient();
    return;
  }
  const old = state.documents.find((d) => d.id === id);
  const d = structuredClone(
    old || {
      type: "quote",
      clientId: state.clients[0].id,
      date: today(),
      due: today(),
      discount: 0,
      notes: "",
      items: [{ name: "", qty: 1, price: 0 }],
      payments: [],
    },
  );
  modal(
    id ? "تعديل المستند" : "مستند جديد",
    `<form id="doc-form"><div class="fields"><label>نوع المستند<select name="type" ${old ? "disabled" : ""}><option value="quote" ${d.type === "quote" ? "selected" : ""}>عرض سعر</option><option value="invoice" ${d.type === "invoice" ? "selected" : ""}>فاتورة</option></select></label><label>العميل<select name="clientId">${state.clients.map((c) => `<option value="${c.id}" ${d.clientId === c.id ? "selected" : ""}>${esc(c.name)}</option>`).join("")}</select></label><label>تاريخ الإصدار<input name="date" type="date" required value="${d.date}"></label><label>تاريخ الاستحقاق / صلاحية العرض<input name="due" type="date" required value="${d.due}"></label></div><div class="items"><div class="panel-title"><h2>الخدمات</h2><button type="button" class="secondary" id="add-item">＋ بند</button></div><p class="muted">الوصف الكمية سعر الوحدة</p><div id="items"></div><select id="service-picker"><option value="">إضافة من الخدمات المحفوظة</option>${state.services.map((s) => `<option value="${s.id}">${esc(s.name)}</option>`).join("")}</select></div><div class="fields" style="margin-top:18px"><label>الخصم (%)<input name="discount" type="number" min="0" max="100" step="0.01" value="${d.discount}" required></label><label>ملاحظات<textarea name="notes">${esc(d.notes)}</textarea></label></div><div class="totals" id="totals"></div><div class="actions"><button>حفظ المستند</button></div></form>`,
  );
  function itemRows() {
    $("#items").innerHTML = d.items
      .map(
        (i, n) =>
          `<div class="item-row"><input aria-label="وصف الخدمة" data-index="${n}" data-field="name" value="${esc(i.name)}" required placeholder="وصف الخدمة"><input aria-label="الكمية" data-index="${n}" data-field="qty" type="number" min="0.01" step="0.01" value="${i.qty}" required><input aria-label="سعر الوحدة" data-index="${n}" data-field="price" type="number" min="0" step="0.01" value="${i.price}" required><button type="button" class="danger" data-remove="${n}" aria-label="حذف البند">×</button></div>`,
      )
      .join("");
    document.querySelectorAll("[data-field]").forEach(
      (i) =>
        (i.oninput = () => {
          d.items[Number(i.dataset.index)][i.dataset.field] =
            i.dataset.field === "name" ? i.value : Number(i.value);
          updateTotals();
        }),
    );
    document.querySelectorAll("[data-remove]").forEach(
      (b) =>
        (b.onclick = () => {
          if (d.items.length === 1)
            return toast("يجب أن يحتوي المستند على بند واحد على الأقل");
          d.items.splice(Number(b.dataset.remove), 1);
          itemRows();
          updateTotals();
        }),
    );
  }
  function updateTotals() {
    d.discount = Number($("#doc-form [name=discount]").value);
    const a = amounts(d);
    $("#totals").innerHTML =
      `<div><span>المجموع قبل الخصم</span><b>${money(a.subtotal)}</b></div><div><span>الخصم</span><b>${money(a.discount)}</b></div><div><span>الإجمالي</span><b>${money(a.total)}</b></div>${a.paid ? `<div><span>مدفوع</span><b>${money(a.paid)}</b></div>` : ""}`;
  }
  itemRows();
  updateTotals();
  $("#doc-form [name=discount]").oninput = updateTotals;
  $("#add-item").onclick = () => {
    d.items.push({ name: "", qty: 1, price: 0 });
    itemRows();
    updateTotals();
  };
  $("#service-picker").onchange = (e) => {
    const s = state.services.find((s) => s.id === e.target.value);
    if (s) {
      if (d.items.length === 1 && !d.items[0].name && !d.items[0].price)
        d.items = [];
      d.items.push({ name: s.name, qty: 1, price: s.price });
      itemRows();
      updateTotals();
      e.target.value = "";
    }
  };
  $("#doc-form").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    d.type = old ? old.type : f.get("type");
    d.clientId = f.get("clientId");
    d.date = f.get("date");
    d.due = f.get("due");
    d.notes = f.get("notes");
    d.items = d.items.map((i) => ({ ...i, name: i.name.trim() }));
    if (d.items.some((i) => !i.name)) return toast("يلزم إدخال وصف لكل بند");
    if (d.due < d.date)
      return toast("تاريخ الاستحقاق يجب أن يكون بعد الإصدار أو في نفس اليوم");
    if (amounts(d).total < amounts(d).paid)
      return toast("قيمة المستند لا يمكن أن تكون أقل من الدفعات المسجّلة");
    d.id = old?.id || uid();
    d.number = old?.number || nextNumber(d.type);
    if (
      mutate((s) => {
        if (old) s.documents[s.documents.findIndex((x) => x.id === old.id)] = d;
        else s.documents.push(d);
      })
    ) {
      $("#modal").close();
      toast("تم حفظ المستند");
    }
  };
}
function payment(id) {
  const d = state.documents.find((d) => d.id === id),
    a = amounts(d);
  modal(
    "تسجيل دفعة",
    `<p class="muted">${esc(d.number)} المتبقي ${money(a.remaining)}</p><form id="payment-form"><div class="fields"><label>المبلغ<input type="number" name="amount" min="0.01" max="${a.remaining}" step="0.01" required></label><label>تاريخ الدفع<input type="date" name="date" value="${today()}" required></label></div><div class="actions"><button>تسجيل الدفعة</button></div></form>`,
  );
  $("#payment-form").onsubmit = (e) => {
    e.preventDefault();
    const f = new FormData(e.target),
      amount = Number(f.get("amount"));
    if (!Number.isFinite(amount) || amount <= 0 || amount > a.remaining) return;
    if (
      mutate((s) =>
        s.documents
          .find((x) => x.id === id)
          .payments.push({
            id: uid(),
            amount: round(amount),
            date: f.get("date"),
          }),
      )
    )
      $("#modal").close();
  };
}
function preview(id) {
  const d = state.documents.find((d) => d.id === id),
    c = state.clients.find((c) => c.id === d.clientId),
    a = amounts(d);
  modal(
    "معاينة المستند",
    `<div class="no-print toolbar"><button id="print">طباعة / حفظ PDF</button><select id="print-language" style="width:auto"><option value="ar">العربية</option><option value="en">English</option></select></div><div id="sheet"></div>`,
  );
  function sheet(en = false) {
    const t = en
      ? {
          title: d.type === "quote" ? "Quotation" : "Invoice",
          to: "Bill to",
          date: "Issue date",
          due: "Due / valid until",
          item: "Description",
          qty: "Quantity",
          price: "Unit price",
          sum: "Amount",
          sub: "Subtotal",
          discount: "Discount",
          total: "Total",
          paid: "Paid",
          remaining: "Balance",
          payments: "Payments",
          notes: "Notes",
        }
      : {
          title: d.type === "quote" ? "عرض سعر" : "فاتورة",
          to: "إلى",
          date: "تاريخ الإصدار",
          due: "الاستحقاق / الصلاحية",
          item: "الخدمة",
          qty: "الكمية",
          price: "سعر الوحدة",
          sum: "المجموع",
          sub: "المجموع قبل الخصم",
          discount: "الخصم",
          total: "الإجمالي",
          paid: "المدفوع",
          remaining: "المتبقي",
          payments: "سجل الدفعات",
          notes: "ملاحظات",
        };
    $("#sheet").innerHTML =
      `<article class="print-sheet" dir="${en ? "ltr" : "rtl"}"><div class="print-head"><div><h1>${esc(state.settings.business)}</h1><span>${esc(state.settings.email)}</span></div><div><h2>${t.title}</h2><b>${esc(d.number)}</b></div></div><p><b>${t.to}:</b> ${esc(c.name)}<br>${esc(c.email)} ${esc(c.phone)}</p><p>${t.date}: ${esc(d.date)}<br>${t.due}: ${esc(d.due)}</p><table><thead><tr><th>${t.item}</th><th>${t.qty}</th><th>${t.price}</th><th>${t.sum}</th></tr></thead><tbody>${d.items.map((i) => `<tr><td>${esc(i.name)}</td><td>${i.qty}</td><td>${money(i.price)}</td><td>${money(round(i.qty * i.price))}</td></tr>`).join("")}</tbody></table><div class="totals print-total">${[
        [t.sub, a.subtotal],
        [t.discount, a.discount],
        [t.total, a.total],
        [t.paid, a.paid],
        [t.remaining, a.remaining],
      ]
        .map(([k, v]) => `<div><span>${k}</span><b>${money(v)}</b></div>`)
        .join(
          "",
        )}</div>${d.notes ? `<p><b>${t.notes}</b><br>${esc(d.notes).replace(/\n/g, "<br>")}</p>` : ""}${d.payments.length ? `<h2>${t.payments}</h2>${d.payments.map((p) => `<p>${esc(p.date)} — ${money(p.amount)}</p>`).join("")}` : ""}</article>`;
  }
  sheet();
  $("#print-language").onchange = (e) => sheet(e.target.value === "en");
  $("#print").onclick = () => window.print();
  $("#modal .modal-head").classList.add("no-print");
}
function download(content, name) {
  const url = URL.createObjectURL(
    new Blob([content], { type: "application/json" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("#new-document").onclick = () => editDocument();
render();
