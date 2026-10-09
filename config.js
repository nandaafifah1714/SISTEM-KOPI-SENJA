"use strict";

const http = require("node:http");
const { URL } = require("node:url");

const PORT = Number(process.env.PORT) || 3001;
const SUPABASE_URL = "https://vocdnxkhtidvkbxzcjzi.supabase.co";
const SUPABASE_SERVICE_ROLE_KEY = "sb_publishable_pw0qL73z9wDT2yFyRfSh3A_fQjwmzi3";
const PAYMENT_METHODS = ["Tunai", "QRIS", "Debit", "Transfer"];
const PROMO_TYPES = ["persentase", "nominal"];
const MAX_BODY_SIZE = 1024 * 1024;
const saleRequests = new Map();

function send(res, status, body) {
  res.writeHead(status, {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, Idempotency-Key",
    "Content-Type": "application/json; charset=utf-8"
  });
  res.end(status === 204 ? undefined : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    let tooLarge = false;
    req.on("data", chunk => {
      if (tooLarge) return;
      body += chunk;
      if (Buffer.byteLength(body) > MAX_BODY_SIZE) {
        tooLarge = true;
        body = "";
      }
    });
    req.on("end", () => {
      if (tooLarge) return reject(Object.assign(new Error("Ukuran request melebihi batas 1 MB."), { status: 413 }));
      if (!body) return resolve({});
      try {
        const value = JSON.parse(body);
        if (!value || Array.isArray(value) || typeof value !== "object") throw new Error();
        resolve(value);
      } catch {
        reject(Object.assign(new Error("Body JSON tidak valid."), { status: 400 }));
      }
    });
    req.on("error", reject);
  });
}

function requireDatabaseConfig() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw Object.assign(new Error("Backend belum dikonfigurasi. Atur SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY."), { status: 503 });
  }
}

async function supabase(path, options = {}) {
  requireDatabaseConfig();
  let response;
  try {
    response = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
      method: options.method || "GET",
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        "Content-Type": "application/json",
        Prefer: options.prefer || (options.withCount ? "count=exact" : "return=representation"),
        ...(options.headers || {})
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
  } catch (error) {
    throw Object.assign(new Error(`Tidak dapat terhubung ke Supabase: ${error.message}`), { status: 502 });
  }
  const text = await response.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw Object.assign(new Error("Supabase mengirim respons yang tidak valid."), { status: 502 });
    }
  }
  if (!response.ok) {
    throw Object.assign(
      new Error(data?.message || data?.hint || `Supabase menolak request (HTTP ${response.status}).`),
      { status: data?.code === "23503" ? 409 : response.status >= 500 ? 502 : 400 }
    );
  }
  if (options.withCount) {
    const totalText = (response.headers.get("content-range") || "").split("/")[1];
    const total = totalText ? Number(totalText) : NaN;
    return { data, total: Number.isFinite(total) ? total : null };
  }
  return data;
}

function fail(message, status = 400) {
  return Object.assign(new Error(message), { status });
}

function requiredText(value, label, maxLength = 120) {
  if (typeof value !== "string" || !value.trim() || value.trim().length > maxLength) {
    throw fail(`${label} wajib diisi (maks. ${maxLength} karakter).`);
  }
  return value.trim();
}

function validPrice(value, label = "Harga") {
  const price = Number(value);
  if (!Number.isFinite(price) || price < 0 || price > 9999999999.99) throw fail(`${label} harus berupa angka nol atau lebih.`);
  return price;
}

function validDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function one(data, message) {
  if (!Array.isArray(data) || data.length === 0) throw fail(message, 404);
  return data[0];
}

function unwrapRpc(data) {
  return Array.isArray(data) ? one(data, "Transaksi tidak ditemukan.") : data;
}

function promoStatus(promo) {
  const today = new Date().toISOString().slice(0, 10);
  if (!promo.status_promo) return "Nonaktif";
  if (today < promo.tanggal_mulai) return "Akan datang";
  if (today > promo.tanggal_selesai) return "Kedaluwarsa";
  return "Aktif";
}

function normalizePromo(promo) {
  return { ...promo, status_tampilan: promoStatus(promo) };
}

function normalizeSale(sale) {
  const items = (sale.detail_penjualan || sale.items || []).map(item => ({
    id_menu: item.id_menu,
    nama_menu: item.nama_menu,
    kategori: item.menu?.kategori || null,
    jumlah: Number(item.jumlah),
    harga_satuan: Number(item.harga_satuan),
    subtotal: Number(item.subtotal ?? Number(item.jumlah) * Number(item.harga_satuan))
  }));
  const totalBeforeDiscount = items.reduce((sum, item) => sum + item.subtotal, 0);
  return {
    id_penjualan: sale.id_penjualan,
    nomor_penjualan: sale.nomor_penjualan,
    tanggal_penjualan: sale.tanggal_penjualan,
    total_sebelum_diskon: totalBeforeDiscount,
    diskon_penjualan: Number(sale.diskon_penjualan || 0),
    total_penjualan: Number(sale.total_penjualan),
    metode_pembayaran: sale.metode_pembayaran,
    id_promo: sale.id_promo || null,
    nama_promo: sale.nama_promo || null,
    items
  };
}

function promoPayload(body, partial = false) {
  const result = {};
  if (!partial || body.nama_promo !== undefined) result.nama_promo = requiredText(body.nama_promo, "Nama promo", 100);
  if (!partial || body.jenis_promo !== undefined) {
    if (!PROMO_TYPES.includes(body.jenis_promo)) throw fail("Jenis promo harus persentase atau nominal.");
    result.jenis_promo = body.jenis_promo;
  }
  if (!partial || body.nilai_promo !== undefined) result.nilai_promo = validPrice(body.nilai_promo, "Nilai promo");
  if (!partial || body.tanggal_mulai !== undefined) {
    if (!validDate(body.tanggal_mulai)) throw fail("Tanggal mulai promo tidak valid.");
    result.tanggal_mulai = body.tanggal_mulai;
  }
  if (!partial || body.tanggal_selesai !== undefined) {
    if (!validDate(body.tanggal_selesai)) throw fail("Tanggal selesai promo tidak valid.");
    result.tanggal_selesai = body.tanggal_selesai;
  }
  if (body.status_promo !== undefined) {
    if (typeof body.status_promo !== "boolean") throw fail("Status promo tidak valid.");
    result.status_promo = body.status_promo;
  } else if (!partial) result.status_promo = true;

  const jenis = result.jenis_promo;
  const nilai = result.nilai_promo;
  if (jenis === "persentase" && nilai !== undefined && (nilai <= 0 || nilai > 100)) {
    throw fail("Diskon persentase harus lebih dari 0 dan maksimal 100.");
  }
  if (jenis === "nominal" && nilai !== undefined && nilai <= 0) throw fail("Potongan nominal harus lebih dari 0.");
  const start = result.tanggal_mulai || body.existing_tanggal_mulai;
  const end = result.tanggal_selesai || body.existing_tanggal_selesai;
  if (start && end && start > end) throw fail("Tanggal mulai promo tidak boleh melewati tanggal selesai.");
  return result;
}

function normalizeSaleItems(items) {
  if (!Array.isArray(items) || !items.length ||
      items.some(item => !item || !item.id_menu || !Number.isInteger(Number(item.jumlah)) || Number(item.jumlah) < 1 || Number(item.jumlah) > 1000000)) {
    throw fail("Transaksi harus memiliki menu dan jumlah yang valid.");
  }
  return items.map(item => ({ id_menu: String(item.id_menu), jumlah: Number(item.jumlah) }));
}

async function createSale(body) {
  if (!PAYMENT_METHODS.includes(body.metode_pembayaran)) throw fail("Metode pembayaran tidak valid.");
  const items = normalizeSaleItems(body.items);
  if (body.id_promo !== undefined && body.id_promo !== null && typeof body.id_promo !== "string") throw fail("Promo tidak valid.");
  const data = await supabase("rpc/create_sale_with_details", {
    method: "POST",
    body: { p_metode_pembayaran: body.metode_pembayaran, p_items: items, p_id_promo: body.id_promo || null }
  });
  const sale = normalizeSale(unwrapRpc(data));
  if (!sale.id_penjualan || !sale.nomor_penjualan || !sale.tanggal_penjualan || sale.items.length !== items.length) {
    throw fail("Respons transaksi dari database tidak lengkap.", 502);
  }
  return sale;
}

async function paginated(path) {
  const rows = [];
  const pageSize = 1000;
  let offset = 0;
  let expectedTotal = null;
  do {
    const page = await supabase(path, {
      withCount: true,
      headers: { Range: `${offset}-${offset + pageSize - 1}`, "Range-Unit": "items" }
    });
    rows.push(...page.data);
    expectedTotal = page.total;
    offset += page.data.length;
    if (page.data.length < pageSize || (expectedTotal !== null && offset >= expectedTotal)) break;
  } while (true);
  return rows;
}

async function readSalesPeriod(from, to) {
  const start = `${from}T00:00:00.000Z`;
  const endDate = new Date(`${to}T00:00:00.000Z`);
  endDate.setUTCDate(endDate.getUTCDate() + 1);
  const end = endDate.toISOString();
  const query = `penjualan?select=id_penjualan,nomor_penjualan,tanggal_penjualan,total_penjualan,diskon_penjualan,nama_promo,id_promo,metode_pembayaran,detail_penjualan(id_menu,nama_menu,jumlah,harga_satuan,subtotal,menu(nama_menu,kategori))&tanggal_penjualan=gte.${encodeURIComponent(start)}&tanggal_penjualan=lt.${encodeURIComponent(end)}&order=tanggal_penjualan.desc,id_penjualan.desc`;
  return paginated(query);
}

async function route(req, res, url) {
  const path = url.pathname.replace(/\/+$/, "") || "/";
  if (req.method === "OPTIONS") return send(res, 204, {});
  if (req.method === "GET" && ["/", "/health", "/api/health"].includes(path)) {
    const configured = Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
    return send(res, configured ? 200 : 503, {
      ok: configured, service: "Kopi Senja API", databaseConfigured: configured,
      message: configured ? "API siap digunakan." : "Atur SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY."
    });
  }
  const body = ["POST", "PUT", "PATCH"].includes(req.method) ? await readBody(req) : {};

  if (req.method === "GET" && path === "/api/menu") {
    const rows = await supabase("menu?select=*&order=nama_menu.asc");
    return send(res, 200, rows);
  }
  if (req.method === "POST" && path === "/api/menu") {
    const data = await supabase("menu", {
      method: "POST",
      body: {
        nama_menu: requiredText(body.nama_menu, "Nama menu"),
        kategori: requiredText(body.kategori, "Kategori", 60),
        kode_menu: typeof body.kode_menu === "string" ? body.kode_menu.trim() || null : null,
        harga: validPrice(body.harga),
        status_menu: body.status_menu === undefined ? true : Boolean(body.status_menu)
      }
    });
    return send(res, 201, one(data, "Menu gagal disimpan."));
  }
  let match = path.match(/^\/api\/menu\/([^/]+)$/);
  if (req.method === "PATCH" && match) {
    const update = {};
    if (body.nama_menu !== undefined) update.nama_menu = requiredText(body.nama_menu, "Nama menu");
    if (body.kategori !== undefined) update.kategori = requiredText(body.kategori, "Kategori", 60);
    if (body.kode_menu !== undefined) update.kode_menu = typeof body.kode_menu === "string" ? body.kode_menu.trim() || null : null;
    if (body.harga !== undefined) update.harga = validPrice(body.harga);
    if (body.status_menu !== undefined) {
      if (typeof body.status_menu !== "boolean") throw fail("Status menu tidak valid.");
      update.status_menu = body.status_menu;
    }
    const data = await supabase(`menu?id_menu=eq.${encodeURIComponent(match[1])}`, { method: "PATCH", body: update });
    return send(res, 200, one(data, "Menu tidak ditemukan."));
  }
  if (req.method === "DELETE" && match) {
    const deleted = await supabase(`menu?id_menu=eq.${encodeURIComponent(match[1])}`, { method: "DELETE" });
    if (!deleted?.length) throw fail("Menu tidak ditemukan.", 404);
    return send(res, 200, { deleted: true });
  }

  if (req.method === "GET" && path === "/api/promos") {
    const rows = await supabase("promo?select=*&order=tanggal_mulai.desc,nama_promo.asc");
    return send(res, 200, rows.map(normalizePromo));
  }
  if (req.method === "POST" && path === "/api/promos") {
    const data = await supabase("promo", { method: "POST", body: promoPayload(body) });
    return send(res, 201, normalizePromo(one(data, "Promo gagal disimpan.")));
  }
  match = path.match(/^\/api\/promos\/([^/]+)$/);
  if (req.method === "PATCH" && match) {
    const existing = one(await supabase(`promo?id_promo=eq.${encodeURIComponent(match[1])}&select=*`), "Promo tidak ditemukan.");
    const update = promoPayload({ ...existing, ...body }, true);
    const saved = one(await supabase(`promo?id_promo=eq.${encodeURIComponent(match[1])}`, {
      method: "PATCH", body: update
    }), "Promo tidak ditemukan.");
    return send(res, 200, normalizePromo(saved));
  }
  if (req.method === "DELETE" && match) {
    const deleted = await supabase(`promo?id_promo=eq.${encodeURIComponent(match[1])}`, { method: "DELETE" });
    if (!deleted?.length) throw fail("Promo tidak ditemukan.", 404);
    return send(res, 200, { deleted: true });
  }

  if (req.method === "GET" && path === "/api/sales") {
    const rows = await paginated("penjualan?select=*,detail_penjualan(id_detail,id_menu,nama_menu,jumlah,harga_satuan,subtotal,menu(kategori))&order=tanggal_penjualan.desc,id_penjualan.desc");
    return send(res, 200, rows.map(normalizeSale));
  }
  if (req.method === "POST" && path === "/api/sales") {
    const key = req.headers["idempotency-key"];
    if (key && (typeof key !== "string" || key.length > 120)) throw fail("Idempotency-Key tidak valid.");
    const fingerprint = JSON.stringify(body);
    let request = key ? saleRequests.get(key) : null;
    if (request && request.fingerprint !== fingerprint) throw fail("Kunci request ini sudah digunakan untuk transaksi berbeda.", 409);
    const replayed = Boolean(request);
    if (!request) {
      request = { fingerprint, promise: createSale(body) };
      if (key) {
        saleRequests.set(key, request);
        if (saleRequests.size > 500) saleRequests.delete(saleRequests.keys().next().value);
      }
    }
    return send(res, replayed ? 200 : 201, await request.promise);
  }

  if (req.method === "GET" && path === "/api/reports/sales") {
    const from = url.searchParams.get("from");
    const to = url.searchParams.get("to");
    if (!validDate(from) || !validDate(to) || from > to) throw fail("Rentang tanggal laporan tidak valid.");
    const sales = await readSalesPeriod(from, to);
    const menuTotals = new Map();
    const methods = new Map();
    const days = new Map();
    let totalCents = 0;
    let totalItems = 0;
    const saleRows = sales.map(sale => {
      const details = sale.detail_penjualan || [];
      const quantity = details.reduce((sum, detail) => sum + Number(detail.jumlah), 0);
      totalItems += quantity;
      const cents = Math.round(Number(sale.total_penjualan) * 100);
      totalCents += cents;
      const methodSummary = methods.get(sale.metode_pembayaran) || { count: 0, total_cents: 0 };
      methodSummary.count++;
      methodSummary.total_cents += cents;
      methods.set(sale.metode_pembayaran, methodSummary);
      const day = String(sale.tanggal_penjualan).slice(0, 10);
      const daySummary = days.get(day) || { count: 0, item_count: 0, total_cents: 0 };
      daySummary.count++;
      daySummary.item_count += quantity;
      daySummary.total_cents += cents;
      days.set(day, daySummary);

      details.forEach(detail => {
        const id = detail.id_menu;
        const menu = detail.menu || {};
        const product = menuTotals.get(id) || {
          id_menu: id, nama_menu: menu.nama_menu || detail.nama_menu,
          kategori: menu.kategori || "Kategori tidak tersedia", total_unit: 0, total_cents: 0
        };
        product.total_unit += Number(detail.jumlah);
        product.total_cents += Math.round(Number(detail.subtotal) * 100);
        menuTotals.set(id, product);
      });
      const normalized = normalizeSale(sale);
      return {
        id_penjualan: sale.id_penjualan, nomor_penjualan: sale.nomor_penjualan,
        tanggal_penjualan: sale.tanggal_penjualan, total_sebelum_diskon: normalized.total_sebelum_diskon,
        diskon_penjualan: normalized.diskon_penjualan, nama_promo: normalized.nama_promo,
        total_penjualan: sale.total_penjualan, metode_pembayaran: sale.metode_pembayaran, jumlah_item: quantity
      };
    });
    const bestSellers = [...menuTotals.values()]
      .sort((a, b) => b.total_unit - a.total_unit || b.total_cents - a.total_cents || a.nama_menu.localeCompare(b.nama_menu, "id"))
      .map((row, index) => ({
        peringkat: index + 1, id_menu: row.id_menu, nama_menu: row.nama_menu, nama_kategori: row.kategori,
        total_unit: row.total_unit, total_pendapatan: row.total_cents / 100
      }));
    return send(res, 200, {
      period: { from, to },
      summary: { total_revenue: totalCents / 100, transaction_count: sales.length, total_items: totalItems },
      payment_methods: [...methods].map(([metode_pembayaran, value]) => ({
        metode_pembayaran, transaction_count: value.count, total_revenue: value.total_cents / 100
      })),
      daily: [...days].sort((a, b) => b[0].localeCompare(a[0])).map(([tanggal, value]) => ({
        tanggal, transaction_count: value.count, total_items: value.item_count, total_revenue: value.total_cents / 100
      })),
      best_sellers: bestSellers, sales: saleRows
    });
  }

  match = path.match(/^\/api\/sales\/([^/]+)$/);
  if (req.method === "GET" && match) {
    const data = await supabase(`penjualan?select=*,detail_penjualan(id_detail,id_menu,nama_menu,jumlah,harga_satuan,subtotal,menu(kategori))&id_penjualan=eq.${encodeURIComponent(match[1])}`);
    return send(res, 200, normalizeSale(one(data, "Transaksi tidak ditemukan.")));
  }

  return send(res, 404, { error: "Endpoint tidak ditemukan." });
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  route(req, res, url).catch(error => {
    if (!res.headersSent) send(res, error.status || 500, { error: error.message || "Terjadi kesalahan pada server." });
    if ((error.status || 500) >= 500) console.error(error);
  });
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Kopi Senja API aktif di http://127.0.0.1:${PORT}`);
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("Database belum dikonfigurasi. Atur SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.");
  }
});
