"use strict";

const API_BASE = "http://127.0.0.1:3001/api";
const $ = selector => document.querySelector(selector);
const S = {
  menu: [],
  promos: [],
  sales: [],
  cart: [],
  report: null,
  submit: null,
  saving: false,
  saleRequestKey: null,
  activeReceiptId: null
};
const money = value => new Intl.NumberFormat("id-ID", {
  style: "currency",
  currency: "IDR",
  maximumFractionDigits: 0
}).format(Number(value || 0));
const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
}[char]));

function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("show");
  setTimeout(() => $("#toast").classList.remove("show"), 3500);
}

async function api(path, options = {}) {
  let response;
  try {
    response = await fetch(API_BASE + path, {
      ...options,
      headers: { "Content-Type": "application/json", ...(options.headers || {}) }
    });
  } catch {
    throw Error(`Tidak dapat terhubung ke API (${API_BASE}). Pastikan backend aktif.`);
  }
  const data = await response.json().catch(() => ({ error: "Respons server tidak valid." }));
  if (!response.ok) throw Error(data.error || "Permintaan gagal.");
  return data;
}

function table(headers, rows, emptyMessage = "Belum ada data untuk ditampilkan.") {
  return rows.length
    ? `<table><thead><tr>${headers.map(value => `<th>${value}</th>`).join("")}</tr></thead><tbody>${rows.join("")}</tbody></table>`
    : `<div class="empty">${esc(emptyMessage)}</div>`;
}

function localDateValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

async function load() {
  try {
    [S.menu, S.promos, S.sales] = await Promise.all([api("/menu"), api("/promos"), api("/sales")]);
    dashboard();
    saleOptions();
  } catch (error) {
    toast("Tidak dapat memuat data. Periksa backend dan konfigurasi database: " + error.message);
  }
}

function go(page) {
  document.querySelectorAll(".page").forEach(section => section.classList.remove("active"));
  $(`#${page}Page`).classList.add("active");
  document.querySelectorAll(".nav").forEach(button => button.classList.toggle("active", button.dataset.page === page));
  $("#pageTitle").textContent = ({
    dashboard: "Dashboard",
    menu: "Data Menu",
    promos: "Promo",
    sales: "Transaksi Penjualan",
    history: "Riwayat Penjualan",
    reports: "Laporan Penjualan"
  })[page];
  if (page === "menu") renderMenu();
  if (page === "promos") renderPromos();
  if (page === "sales") saleOptions();
  if (page === "history") renderHistory();
  if (page === "reports") loadReport();
}

function dashboard() {
  const today = localDateValue(new Date());
  const todaysSales = S.sales.filter(sale => String(sale.tanggal_penjualan).slice(0, 10) === today);
  $("#statProducts").textContent = S.menu.filter(item => item.status_menu).length;
  $("#statSales").textContent = todaysSales.length;
  $("#statRevenue").textContent = money(todaysSales.reduce((sum, sale) => sum + Number(sale.total_penjualan), 0));
  const recent = [...S.sales].sort((a, b) => new Date(b.tanggal_penjualan) - new Date(a.tanggal_penjualan)).slice(0, 5);
  $("#recent").innerHTML = table(
    ["Nomor", "Tanggal", "Metode", "Total"],
    recent.map(sale => `<tr><td><b>${esc(sale.nomor_penjualan)}</b></td><td>${esc(formatDate(sale.tanggal_penjualan))}</td><td>${esc(sale.metode_pembayaran)}</td><td><b>${money(sale.total_penjualan)}</b></td></tr>`)
  );
}

function renderMenu() {
  const query = $("#menuSearch").value.trim().toLowerCase();
  const rows = S.menu.filter(item => `${item.nama_menu} ${item.kategori || ""}`.toLowerCase().includes(query));
  $("#menuTable").innerHTML = table(
    ["Nama Menu", "Kategori", "Harga", "Status", "Aksi"],
    rows.map(item => `<tr><td><b>${esc(item.nama_menu)}</b><br><small>${esc(item.kode_menu || "")}</small></td><td>${esc(item.kategori || "-")}</td><td>${money(item.harga)}</td><td><span class="pill ${item.status_menu ? "" : "off"}">${item.status_menu ? "Aktif" : "Nonaktif"}</span></td><td><button class="mini" data-edit-menu="${item.id_menu}">Edit</button><button class="mini" data-toggle-menu="${item.id_menu}">${item.status_menu ? "Nonaktifkan" : "Aktifkan"}</button><button class="mini danger" data-delete-menu="${item.id_menu}">Hapus</button></td></tr>`)
  );
}

function promoValue(promo) {
  return promo.jenis_promo === "persentase" ? `${Number(promo.nilai_promo)}%` : money(promo.nilai_promo);
}

function promoStatus(promo) {
  if (promo.status_tampilan) return promo.status_tampilan;
  const today = localDateValue(new Date());
  if (!promo.status_promo) return "Nonaktif";
  if (today < promo.tanggal_mulai) return "Akan datang";
  if (today > promo.tanggal_selesai) return "Kedaluwarsa";
  return "Aktif";
}

function renderPromos() {
  const query = $("#promoSearch").value.trim().toLowerCase();
  const rows = S.promos.filter(promo => promo.nama_promo.toLowerCase().includes(query));
  $("#promosTable").innerHTML = table(
    ["Nama Promo", "Jenis", "Nilai", "Periode", "Status", "Aksi"],
    rows.map(promo => `<tr><td><b>${esc(promo.nama_promo)}</b></td><td>${promo.jenis_promo === "persentase" ? "Diskon persentase" : "Potongan nominal"}</td><td>${esc(promoValue(promo))}</td><td>${esc(promo.tanggal_mulai)} – ${esc(promo.tanggal_selesai)}</td><td><span class="pill ${promoStatus(promo) === "Aktif" ? "" : "off"}">${esc(promoStatus(promo))}</span></td><td><button class="mini" data-edit-promo="${promo.id_promo}">Edit</button><button class="mini" data-toggle-promo="${promo.id_promo}">${promo.status_promo ? "Nonaktifkan" : "Aktifkan"}</button><button class="mini danger" data-delete-promo="${promo.id_promo}">Hapus</button></td></tr>`)
  );
}

function activePromos() {
  const today = localDateValue(new Date());
  return S.promos.filter(promo => promo.status_promo && promo.tanggal_mulai <= today && promo.tanggal_selesai >= today);
}

function saleOptions() {
  $("#saleMenu").innerHTML = S.menu.filter(item => item.status_menu)
    .map(item => `<option value="${esc(item.id_menu)}">${esc(item.nama_menu)} — ${money(item.harga)}</option>`).join("");
  const currentPromo = $("#salePromo").value;
  $("#salePromo").innerHTML = '<option value="">Tanpa promo</option>' + activePromos()
    .map(promo => `<option value="${esc(promo.id_promo)}">${esc(promo.nama_promo)} — ${esc(promoValue(promo))}</option>`).join("");
  if (activePromos().some(promo => promo.id_promo === currentPromo)) $("#salePromo").value = currentPromo;
  cart();
}

function cartAmounts() {
  const subtotalCents = S.cart.reduce((sum, item) => sum + Math.round(Number(item.harga) * 100) * item.jumlah, 0);
  const promo = S.promos.find(row => row.id_promo === $("#salePromo").value && activePromos().some(active => active.id_promo === row.id_promo));
  let discountCents = 0;
  if (promo) {
    discountCents = promo.jenis_promo === "persentase"
      ? Math.round(subtotalCents * Number(promo.nilai_promo) / 100)
      : Math.min(subtotalCents, Math.round(Number(promo.nilai_promo) * 100));
  }
  return { subtotalCents, discountCents, totalCents: Math.max(0, subtotalCents - discountCents), promo };
}

function cart() {
  $("#cartTable").innerHTML = table(
    ["Menu", "Harga", "Jumlah", "Subtotal", ""],
    S.cart.map((item, index) => `<tr><td>${esc(item.nama_menu)}</td><td>${money(item.harga)}</td><td><input class="cart-quantity" data-cart-quantity="${index}" aria-label="Jumlah ${esc(item.nama_menu)}" type="number" min="1" step="1" value="${item.jumlah}"></td><td>${money(Number(item.harga) * item.jumlah)}</td><td><button class="mini danger" data-remove-cart="${index}">Hapus</button></td></tr>`)
  );
  $("#cartSummary").innerHTML = S.cart.map(item => `<p>${esc(item.nama_menu)} × ${item.jumlah}<b style="float:right">${money(Number(item.harga) * item.jumlah)}</b></p>`).join("") || '<p class="muted">Belum ada menu.</p>';
  const amounts = cartAmounts();
  $("#cartSubtotal").textContent = money(amounts.subtotalCents / 100);
  $("#cartDiscount").textContent = `− ${money(amounts.discountCents / 100)}`;
  $("#cartDiscountLabel").textContent = amounts.promo ? `Diskon (${amounts.promo.nama_promo})` : "Diskon";
  $("#cartTotal").textContent = money(amounts.totalCents / 100);
}

function renderHistory() {
  const query = $("#historySearch").value.trim().toLowerCase();
  const selectedDate = $("#historyDate").value;
  const rows = [...S.sales]
    .filter(sale => (!selectedDate || String(sale.tanggal_penjualan).slice(0, 10) === selectedDate) &&
      String(sale.nomor_penjualan).toLowerCase().includes(query))
    .sort((a, b) => new Date(b.tanggal_penjualan) - new Date(a.tanggal_penjualan));
  $("#historyTable").innerHTML = table(
    ["Nomor Transaksi", "Tanggal", "Promo / Diskon", "Jumlah Item", "Metode Pembayaran", "Total Akhir", ""],
    rows.map(sale => `<tr><td><b>${esc(sale.nomor_penjualan)}</b></td><td>${esc(formatDate(sale.tanggal_penjualan))}</td><td>${sale.nama_promo ? `${esc(sale.nama_promo)} · −${money(sale.diskon_penjualan)}` : "Tanpa promo"}</td><td>${sale.items.reduce((sum, item) => sum + Number(item.jumlah), 0)}</td><td>${esc(sale.metode_pembayaran)}</td><td><b>${money(sale.total_penjualan)}</b></td><td><button class="mini" data-detail-sale="${sale.id_penjualan}">Detail / Struk</button></td></tr>`)
  );
}

function openModal(title, description, fields, submit) {
  $("#modalTitle").textContent = title;
  $("#modalDesc").textContent = description;
  $("#fields").innerHTML = fields;
  S.submit = submit;
  $("#modalForm .actions").innerHTML = '<button type="button" class="secondary" id="cancel">Batal</button><button class="primary" id="formSave">Simpan</button>';
  $("#modal").classList.remove("hidden");
  $("#cancel").onclick = closeModal;
}

function closeModal() {
  $("#modal").classList.add("hidden");
  S.submit = null;
}

function menuForm(item = {}) {
  const categories = [...new Set(["Kopi", "Nonkopi", "Makanan", ...S.menu.map(row => row.kategori).filter(Boolean)])];
  const options = categories.map(category => `<option value="${esc(category)}" ${item.kategori === category ? "selected" : ""}>${esc(category)}</option>`).join("");
  openModal(item.id_menu ? "Edit Menu" : "Tambah Menu", "Kategori disimpan sebagai atribut menu. Harga transaksi lama tetap tersimpan.", `
    <label>Nama Menu<input name="nama_menu" maxlength="120" required value="${esc(item.nama_menu || "")}"></label>
    <label>Kode Menu<input name="kode_menu" maxlength="80" value="${esc(item.kode_menu || "")}"></label>
    <label>Kategori<select name="kategori" required>${options}</select></label>
    <label>Harga<input name="harga" type="number" min="0" max="9999999999.99" step="0.01" required value="${item.harga ?? ""}"></label>
  `, async form => {
    const payload = {
      nama_menu: form.get("nama_menu").trim(),
      kode_menu: form.get("kode_menu").trim() || null,
      kategori: form.get("kategori"),
      harga: Number(form.get("harga"))
    };
    await api(item.id_menu ? `/menu/${encodeURIComponent(item.id_menu)}` : "/menu", {
      method: item.id_menu ? "PATCH" : "POST", body: JSON.stringify(payload)
    });
    closeModal();
    await load();
    renderMenu();
    toast("Menu tersimpan.");
  });
}

function promoForm(promo = {}) {
  const start = promo.tanggal_mulai || localDateValue(new Date());
  const end = promo.tanggal_selesai || start;
  openModal(promo.id_promo ? "Edit Promo" : "Tambah Promo", "Promo hanya dapat digunakan saat aktif dan berada dalam periode yang ditentukan.", `
    <label>Nama Promo<input name="nama_promo" maxlength="100" required value="${esc(promo.nama_promo || "")}"></label>
    <label>Jenis Promo<select name="jenis_promo"><option value="persentase" ${promo.jenis_promo === "persentase" ? "selected" : ""}>Diskon persentase (%)</option><option value="nominal" ${promo.jenis_promo === "nominal" ? "selected" : ""}>Potongan nominal (Rp)</option></select></label>
    <label>Nilai Promo<input name="nilai_promo" type="number" min="0.01" step="0.01" required value="${promo.nilai_promo ?? ""}"></label>
    <label>Tanggal Mulai<input name="tanggal_mulai" type="date" required value="${esc(start)}"></label>
    <label>Tanggal Selesai<input name="tanggal_selesai" type="date" required value="${esc(end)}"></label>
    <label class="check-label"><input name="status_promo" type="checkbox" ${promo.status_promo === false ? "" : "checked"}> Promo aktif</label>
  `, async form => {
    const payload = {
      nama_promo: form.get("nama_promo").trim(),
      jenis_promo: form.get("jenis_promo"),
      nilai_promo: Number(form.get("nilai_promo")),
      tanggal_mulai: form.get("tanggal_mulai"),
      tanggal_selesai: form.get("tanggal_selesai"),
      status_promo: form.get("status_promo") === "on"
    };
    if (payload.tanggal_mulai > payload.tanggal_selesai) throw Error("Tanggal mulai promo tidak boleh melewati tanggal selesai.");
    if (payload.jenis_promo === "persentase" && (payload.nilai_promo <= 0 || payload.nilai_promo > 100)) throw Error("Diskon persentase harus lebih dari 0 dan maksimal 100.");
    if (payload.jenis_promo === "nominal" && payload.nilai_promo <= 0) throw Error("Potongan nominal harus lebih dari 0.");
    await api(promo.id_promo ? `/promos/${encodeURIComponent(promo.id_promo)}` : "/promos", {
      method: promo.id_promo ? "PATCH" : "POST", body: JSON.stringify(payload)
    });
    closeModal();
    await load();
    renderPromos();
    toast("Promo tersimpan.");
  });
}

function receiptDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) throw Error("Waktu transaksi tidak valid.");
  return {
    date: new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(date),
    time: new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(date)
  };
}

function renderReceipt(sale) {
  if (!sale?.id_penjualan || !sale.nomor_penjualan || !sale.tanggal_penjualan || !Array.isArray(sale.items) || !sale.items.length) {
    throw Error("Data transaksi dari server belum lengkap.");
  }
  const formattedDate = receiptDate(sale.tanggal_penjualan);
  const items = sale.items.map(item => `<div class="receipt-item"><div class="receipt-item-name">${esc(item.nama_menu)}</div><div class="receipt-item-values"><span>${item.jumlah} × ${money(item.harga_satuan)}</span><b>${money(item.subtotal)}</b></div></div>`).join("");
  const gross = Number(sale.total_sebelum_diskon ?? sale.items.reduce((sum, item) => sum + Number(item.subtotal), 0));
  const discount = Number(sale.diskon_penjualan || 0);
  $("#receiptPaper").innerHTML = `<header class="receipt-brand"><div class="receipt-cup" aria-hidden="true">☕</div><h1>KOPI SENJA</h1><p>Temani harimu, satu cangkir setiap waktu.</p><span>STRUK PEMBAYARAN / SALES RECEIPT</span></header><div class="receipt-rule"></div><div class="receipt-meta"><div><span>No. Transaksi</span><b>${esc(sale.nomor_penjualan)}</b></div><div><span>Tanggal</span><b>${esc(formattedDate.date)}</b></div><div><span>Waktu</span><b>${esc(formattedDate.time)}</b></div></div><div class="receipt-rule receipt-rule-dashed"></div><div class="receipt-items">${items}</div><div class="receipt-rule receipt-rule-dashed"></div><div class="receipt-summary"><div><span>Total sebelum diskon</span><b>${money(gross)}</b></div>${sale.nama_promo ? `<div><span>Promo · ${esc(sale.nama_promo)}</span><b>− ${money(discount)}</b></div>` : ""}<div class="receipt-total"><span>Total akhir</span><b>${money(sale.total_penjualan)}</b></div><div><span>Metode Pembayaran</span><b>${esc(sale.metode_pembayaran)}</b></div></div><footer class="receipt-footer"><b>Terima kasih telah berkunjung ke Kopi Senja</b><span>Sampai jumpa kembali!</span><small>Simpan struk ini sebagai bukti transaksi.</small></footer>`;
  S.activeReceiptId = sale.id_penjualan;
  $("#receiptOverlay").classList.remove("hidden");
}

function closeReceipt() {
  $("#receiptOverlay").classList.add("hidden");
}

function newSale() {
  S.cart = [];
  S.saleRequestKey = null;
  $("#saleMethod").value = "Tunai";
  $("#salePromo").value = "";
  $("#saleQty").value = "1";
  saleOptions();
  closeReceipt();
  go("sales");
  $("#saleMenu").focus();
}

function printReceipt(asPdf = false) {
  if (!S.activeReceiptId) return;
  if (asPdf) toast("Pada dialog cetak pilih Save as PDF atau Microsoft Print to PDF.");
  const originalTitle = document.title;
  document.title = `Struk-${$("#receiptPaper .receipt-meta b")?.textContent || "Kopi-Senja"}`;
  document.body.classList.add("print-receipt");
  const restore = () => {
    document.title = originalTitle;
    document.body.classList.remove("print-receipt");
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore, { once: true });
  window.print();
  setTimeout(restore, 1500);
}

function localDay(isoDate) {
  return new Date(`${isoDate}T00:00:00`).toLocaleDateString("id-ID", { dateStyle: "medium" });
}

function renderReport(report) {
  const summary = report.summary;
  $("#reportRevenue").textContent = money(summary.total_revenue);
  $("#reportTransactions").textContent = new Intl.NumberFormat("id-ID").format(summary.transaction_count);
  $("#reportItems").textContent = new Intl.NumberFormat("id-ID").format(summary.total_items);
  $("#reportPayments").innerHTML = table(
    ["Metode", "Transaksi", "Omzet"],
    report.payment_methods.map(row => `<tr><td>${esc(row.metode_pembayaran)}</td><td>${row.transaction_count}</td><td><b>${money(row.total_revenue)}</b></td></tr>`)
  );
  $("#reportDaily").innerHTML = table(
    ["Tanggal", "Transaksi", "Item Terjual", "Omzet"],
    report.daily.map(row => `<tr><td>${esc(localDay(row.tanggal))}</td><td>${row.transaction_count}</td><td>${row.total_items}</td><td><b>${money(row.total_revenue)}</b></td></tr>`)
  );
  $("#bestSellersTable").innerHTML = table(
    ["Peringkat", "Nama Menu", "Kategori", "Total Unit Terjual", "Total Pendapatan"],
    report.best_sellers.map(row => `<tr><td><b>${row.peringkat}</b></td><td>${esc(row.nama_menu)}</td><td>${esc(row.nama_kategori)}</td><td>${row.total_unit}</td><td><b>${money(row.total_pendapatan)}</b></td></tr>`),
    "Belum ada data produk terlaris pada periode ini."
  );
  $("#reportTable").innerHTML = table(
    ["No. Transaksi", "Tanggal", "Promo", "Sebelum Diskon", "Diskon", "Metode", "Jumlah Item", "Total Akhir"],
    report.sales.map(row => `<tr><td><b>${esc(row.nomor_penjualan)}</b></td><td>${esc(formatDate(row.tanggal_penjualan))}</td><td>${row.nama_promo ? esc(row.nama_promo) : "—"}</td><td>${money(row.total_sebelum_diskon)}</td><td>${money(row.diskon_penjualan)}</td><td>${esc(row.metode_pembayaran)}</td><td>${row.jumlah_item}</td><td><b>${money(row.total_penjualan)}</b></td></tr>`)
  );
}

async function loadReport() {
  const from = $("#reportFrom");
  const to = $("#reportTo");
  const button = $("#loadReport");
  if (!from.value || !to.value) {
    const today = new Date();
    to.value = localDateValue(today);
    from.value = localDateValue(new Date(today.getFullYear(), today.getMonth(), 1));
  }
  if (from.value > to.value) {
    S.report = null;
    $("#reportStatus").textContent = "Tanggal awal tidak boleh melewati tanggal akhir.";
    return;
  }
  button.disabled = true;
  button.textContent = "Memuat...";
  $("#reportStatus").textContent = "Mengambil data penjualan dan detail menu...";
  try {
    const report = await api(`/reports/sales?from=${encodeURIComponent(from.value)}&to=${encodeURIComponent(to.value)}`);
    if (!report?.summary || !Array.isArray(report.best_sellers) || !Array.isArray(report.sales)) throw Error("Format laporan dari server tidak valid.");
    S.report = report;
    renderReport(report);
    $("#reportStatus").textContent = `Periode ${from.value} sampai ${to.value} · ${report.summary.transaction_count} transaksi`;
  } catch (error) {
    S.report = null;
    $("#reportStatus").textContent = "Laporan gagal dimuat: " + error.message;
  } finally {
    button.disabled = false;
    button.textContent = "Tampilkan Laporan";
  }
}

function exportReportCsv() {
  if (!S.report) return toast("Muat laporan terlebih dahulu.");
  const quote = value => `"${String(value ?? "").replace(/"/g, '""')}"`;
  const lines = [
    ["No. Transaksi", "Tanggal", "Promo", "Sebelum Diskon", "Diskon", "Metode", "Jumlah Item", "Total Akhir"],
    ...S.report.sales.map(row => [row.nomor_penjualan, row.tanggal_penjualan, row.nama_promo, row.total_sebelum_diskon, row.diskon_penjualan, row.metode_pembayaran, row.jumlah_item, row.total_penjualan]),
    [],
    ["Peringkat", "Nama Menu", "Kategori", "Unit Terjual", "Total Pendapatan"],
    ...S.report.best_sellers.map(row => [row.peringkat, row.nama_menu, row.nama_kategori, row.total_unit, row.total_pendapatan])
  ];
  const blob = new Blob(["\uFEFF" + lines.map(row => row.map(quote).join(",")).join("\r\n")], { type: "text/csv;charset=utf-8" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `laporan-penjualan-${$("#reportFrom").value}-${$("#reportTo").value}.csv`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

function printReport() {
  if (!S.report) return toast("Muat laporan terlebih dahulu.");
  document.body.classList.add("print-report");
  const restore = () => {
    document.body.classList.remove("print-report");
    window.removeEventListener("afterprint", restore);
  };
  window.addEventListener("afterprint", restore, { once: true });
  window.print();
  setTimeout(restore, 1500);
}

document.querySelectorAll(".nav").forEach(button => button.onclick = () => go(button.dataset.page));
document.querySelectorAll("[data-goto]").forEach(button => button.onclick = () => go(button.dataset.goto));
$("#addMenu").onclick = () => menuForm();
$("#addPromo").onclick = () => promoForm();
$("#menuSearch").oninput = renderMenu;
$("#promoSearch").oninput = renderPromos;
$("#historySearch").oninput = renderHistory;
$("#historyDate").onchange = renderHistory;
$("#refresh").onclick = async () => { await load(); renderHistory(); };

$("#menuTable").onclick = async event => {
  const edit = event.target.closest("[data-edit-menu]");
  const toggle = event.target.closest("[data-toggle-menu]");
  const remove = event.target.closest("[data-delete-menu]");
  if (edit) menuForm(S.menu.find(item => item.id_menu === edit.dataset.editMenu));
  if (toggle) {
    const item = S.menu.find(row => row.id_menu === toggle.dataset.toggleMenu);
    toggle.disabled = true;
    try {
      await api(`/menu/${encodeURIComponent(item.id_menu)}`, { method: "PATCH", body: JSON.stringify({ status_menu: !item.status_menu }) });
      await load();
      renderMenu();
      toast("Status menu diperbarui.");
    } catch (error) {
      toast("Status menu tidak dapat diubah: " + error.message);
    } finally {
      toggle.disabled = false;
    }
  }
  if (remove) {
    if (!window.confirm("Hapus menu ini? Menu yang memiliki riwayat penjualan tidak dapat dihapus.")) return;
    remove.disabled = true;
    try {
      await api(`/menu/${encodeURIComponent(remove.dataset.deleteMenu)}`, { method: "DELETE" });
      await load();
      renderMenu();
      toast("Menu dihapus.");
    } catch (error) {
      toast("Menu tidak dapat dihapus: " + error.message);
    } finally {
      remove.disabled = false;
    }
  }
};

$("#promosTable").onclick = async event => {
  const edit = event.target.closest("[data-edit-promo]");
  const toggle = event.target.closest("[data-toggle-promo]");
  const remove = event.target.closest("[data-delete-promo]");
  if (edit) promoForm(S.promos.find(promo => promo.id_promo === edit.dataset.editPromo));
  if (toggle) {
    const promo = S.promos.find(row => row.id_promo === toggle.dataset.togglePromo);
    toggle.disabled = true;
    try {
      await api(`/promos/${encodeURIComponent(promo.id_promo)}`, { method: "PATCH", body: JSON.stringify({ status_promo: !promo.status_promo }) });
      await load();
      renderPromos();
      toast("Status promo diperbarui.");
    } catch (error) {
      toast("Status promo tidak dapat diubah: " + error.message);
    } finally {
      toggle.disabled = false;
    }
  }
  if (remove) {
    if (!window.confirm("Hapus promo ini? Promo yang sudah digunakan transaksi tidak dapat dihapus agar riwayat tetap utuh.")) return;
    remove.disabled = true;
    try {
      await api(`/promos/${encodeURIComponent(remove.dataset.deletePromo)}`, { method: "DELETE" });
      await load();
      renderPromos();
      toast("Promo dihapus.");
    } catch (error) {
      toast("Promo tidak dapat dihapus: " + error.message);
    } finally {
      remove.disabled = false;
    }
  }
};

$("#addCart").onclick = () => {
  const item = S.menu.find(row => row.id_menu === $("#saleMenu").value && row.status_menu);
  const quantity = Number($("#saleQty").value);
  if (!item || !Number.isInteger(quantity) || quantity < 1) return toast("Pilih menu aktif dan jumlah yang benar.");
  S.saleRequestKey = null;
  const existing = S.cart.find(row => row.id_menu === item.id_menu);
  if (existing) existing.jumlah += quantity;
  else S.cart.push({ id_menu: item.id_menu, nama_menu: item.nama_menu, harga: Number(item.harga), jumlah: quantity });
  cart();
};

$("#cartTable").onchange = event => {
  const input = event.target.closest("[data-cart-quantity]");
  if (!input) return;
  const quantity = Number(input.value);
  if (!Number.isInteger(quantity) || quantity < 1) {
    input.value = S.cart[Number(input.dataset.cartQuantity)].jumlah;
    return toast("Jumlah minimal satu.");
  }
  S.saleRequestKey = null;
  S.cart[Number(input.dataset.cartQuantity)].jumlah = quantity;
  cart();
};

$("#cartTable").onclick = event => {
  const button = event.target.closest("[data-remove-cart]");
  if (!button) return;
  S.saleRequestKey = null;
  S.cart.splice(Number(button.dataset.removeCart), 1);
  cart();
};

$("#clearCart").onclick = () => {
  S.saleRequestKey = null;
  S.cart = [];
  $("#salePromo").value = "";
  cart();
};
$("#salePromo").onchange = () => { S.saleRequestKey = null; cart(); };
$("#saleMethod").onchange = () => { S.saleRequestKey = null; };

$("#saveSale").onclick = async () => {
  if (S.saving) return;
  if (!S.cart.length) return toast("Tambahkan menu ke transaksi terlebih dahulu.");
  const button = $("#saveSale");
  const controls = ["#saleMethod", "#salePromo", "#saleMenu", "#saleQty", "#addCart", "#clearCart"];
  let saved = null;
  S.saving = true;
  button.disabled = true;
  button.textContent = "Menyimpan...";
  controls.forEach(selector => $(selector).disabled = true);
  try {
    if (!S.saleRequestKey) S.saleRequestKey = `sale-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    saved = await api("/sales", {
      method: "POST",
      headers: { "Idempotency-Key": S.saleRequestKey },
      body: JSON.stringify({
        metode_pembayaran: $("#saleMethod").value,
        id_promo: $("#salePromo").value || null,
        items: S.cart.map(item => ({ id_menu: item.id_menu, jumlah: item.jumlah }))
      })
    });
    if (!saved?.id_penjualan) throw Error("Server tidak mengembalikan ID penjualan tersimpan.");
    S.saleRequestKey = null;
    S.cart = [];
    cart();
    renderReceipt(saved);
    toast(`Transaksi ${saved.nomor_penjualan} berhasil disimpan.`);
    await load();
  } catch (error) {
    if (saved?.id_penjualan) {
      S.cart = [];
      cart();
      S.activeReceiptId = saved.id_penjualan;
      toast("Transaksi sudah tersimpan, tetapi struk gagal dimuat. Buka riwayat penjualan untuk melihatnya.");
      await load();
    } else {
      toast("Gagal menyimpan transaksi: " + error.message);
    }
  } finally {
    S.saving = false;
    button.disabled = false;
    button.textContent = "Simpan Transaksi";
    controls.forEach(selector => $(selector).disabled = false);
  }
};

$("#receiptClose").onclick = closeReceipt;
$("#receiptOverlay").onclick = event => { if (event.target.id === "receiptOverlay") closeReceipt(); };
$("#receiptNew").onclick = newSale;
$("#receiptPrint").onclick = () => printReceipt(false);
$("#receiptPdf").onclick = () => printReceipt(true);
$("#historyTable").onclick = async event => {
  const button = event.target.closest("[data-detail-sale]");
  if (!button) return;
  button.disabled = true;
  try {
    const sale = await api(`/sales/${encodeURIComponent(button.dataset.detailSale)}`);
    renderReceipt(sale);
  } catch (error) {
    toast("Detail penjualan gagal dimuat: " + error.message);
  } finally {
    button.disabled = false;
  }
};
$("#loadReport").onclick = loadReport;
$("#reportCsv").onclick = exportReportCsv;
$("#reportPrint").onclick = printReport;
$("#modalForm").onsubmit = async event => {
  event.preventDefault();
  if (!S.submit) return;
  const save = $("#formSave");
  save.disabled = true;
  try {
    await S.submit(new FormData(event.currentTarget));
  } catch (error) {
    toast(error.message);
  } finally {
    save.disabled = false;
  }
};
$("#close").onclick = closeModal;
$("#today").textContent = new Intl.DateTimeFormat("id-ID", {
  weekday: "long", day: "numeric", month: "long", year: "numeric"
}).format(new Date());
load();
