let paddyTypes = [];
const settingsStore = {
  rice: [],
  supplier: [],
  driver: [],
  company: [],
};

const paymentsStore = {
  farmers: [],
  suppliers: [],
  company: [],
};

const viewMeta = {
  dashboard: {
    eyebrow: "Operations Overview",
    title: "Paddy Purchase Dashboard",
    copy:
      "Track procurement, monitor payable balances, and switch between purchase modules without leaving the page.",
  },
  "godown-entry": {
    eyebrow: "Godown Purchase",
    title: "Godown Purchase Entry",
    copy:
      "Record supplier purchases, apply deductions, and calculate payable values instantly.",
  },
  "home-entry": {
    eyebrow: "Home Procurement",
    title: "Home Purchase Entry",
    copy:
      "Manage direct farmer purchases with live row-wise weight and amount calculations.",
  },
  selling: {
    eyebrow: "Sales Module",
    title: "Selling Entry",
    copy: "Capture company sales, apply deductions, and calculate the final amount instantly.",
  },
  reports: {
    eyebrow: "Analytics",
    title: "Reports",
    copy: "Search farmer, supplier, and company records, open any transaction, and print detailed PDF-style reports from one screen.",
  },
  payments: {
    eyebrow: "Finance Desk",
    title: "Payments Workspace",
    copy: "Search party ledgers, review outstanding balances, and record lump-sum settlements with bank account and reference tracking.",
  },
  settings: {
    eyebrow: "Configuration",
    title: "Settings",
    copy: "Manage rice types, suppliers, drivers, and companies that will later power dropdowns dynamically from the backend.",
  },
};

const app = document.getElementById("dashboardApp");
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const navButtons = [...document.querySelectorAll(".nav-item")];
const viewPanels = [...document.querySelectorAll("[data-view-panel]")];
const pageEyebrow = document.getElementById("pageEyebrow");
const pageTitle = document.getElementById("pageTitle");
const pageCopy = document.getElementById("pageCopy");
const dashboardStatValues = [...document.querySelectorAll(".stat-card .stat-value")];
const dashboardStatMeta = [...document.querySelectorAll(".stat-card .stat-meta")];
const dashboardRecentBody = document.querySelector(".dashboard-table tbody");
const API_BASE = window.PADDY_API_BASE || "http://localhost:4000/api";
let currentReportDetail = null;
let currentPaymentDetail = null;

function buildApiUrl(path, query = {}) {
  const url = new URL(`${API_BASE}${path}`);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

async function apiRequest(path, options = {}) {
  const { method = "GET", query, body } = options;
  const response = await fetch(buildApiUrl(path, query), {
    method,
    headers: {
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.message || `Request failed with status ${response.status}`;
    throw new Error(message);
  }

  return payload;
}

function setStoreItems(target, items) {
  target.splice(0, target.length, ...items);
}

function replaceSelectOptions(select, placeholder, items) {
  if (!select) return;
  const currentValue = select.value;
  select.innerHTML = [`<option value="">${placeholder}</option>`]
    .concat(items.map((item) => `<option>${escapeHtml(item)}</option>`))
    .join("");
  if (items.includes(currentValue)) {
    select.value = currentValue;
  }
}

function refreshRiceTypeOptions() {
  document.querySelectorAll(".entry-type").forEach((select) => {
    const currentValue = select.value;
    select.innerHTML = buildTypeOptions();
    select.value = paddyTypes.includes(currentValue) ? currentValue : "";
  });
}

function refreshMasterDropdowns() {
  replaceSelectOptions(
    document.getElementById("godownSupplierName"),
    "Select supplier",
    settingsStore.supplier.map((item) => item.name)
  );
  replaceSelectOptions(
    document.getElementById("sellingCompanyName"),
    "Select company",
    settingsStore.company.map((item) => item.name)
  );
  replaceSelectOptions(
    document.getElementById("homeDriverName"),
    "Select driver",
    settingsStore.driver.map((item) => item.name)
  );
  refreshRiceTypeOptions();
}

function getCategoryFromModule(moduleType) {
  if (moduleType === "home") return "farmers";
  if (moduleType === "godown") return "suppliers";
  return "company";
}

function getTypeLabelFromModule(moduleType) {
  if (moduleType === "home") return "Farmer Purchase";
  if (moduleType === "godown") return "Supplier Purchase";
  return "Company Selling";
}

function getKindLabelFromModule(moduleType) {
  return moduleType === "selling" ? "Selling" : "Buying";
}

function formatModuleLabel(moduleType) {
  if (moduleType === "home") return "Home Purchase";
  if (moduleType === "godown") return "Godown Purchase";
  return "Selling";
}

function formatStatusChip(status) {
  if (status === "settled") return { label: "Settled", className: "success" };
  if (status === "partial") return { label: "Partially Paid", className: "pending" };
  return { label: "Pending", className: "review" };
}

function mapSettingRecord(type, item) {
  if (type === "rice") return { name: item.name };
  if (type === "supplier") {
    return {
      name: item.name,
      mobile: item.mobile || "",
      pan: item.pan_number || "",
      aadhar: item.aadhar_number || "",
      address: item.address || "",
    };
  }
  if (type === "driver") {
    return {
      name: item.name,
      mobile: item.mobile || "",
    };
  }
  return {
    name: item.name,
    mobile: item.mobile || "",
    address: item.address || "",
  };
}

function normalizeReportListItem(item) {
  const moduleKey = item.moduleType || item.module_type;
  const date = item.entryDate || item.entry_date;
  return {
    id: String(item.id),
    moduleKey,
    category: getCategoryFromModule(moduleKey),
    typeLabel: getTypeLabelFromModule(moduleKey),
    kindLabel: getKindLabelFromModule(moduleKey),
    partyName: item.partyName || item.party_name || "-",
    date,
    dateDisplay: formatDateForDisplay(date),
    slipNumber: item.slipNumber || item.slip_number || "-",
    vehicleNumber: item.vehicleNumber || item.vehicle_number || "-",
    totalBags: parseNumber(item.totalBags || item.total_bags),
    totalWeight: parseNumber(item.netWeight || item.net_weight),
    totalAmount: parseNumber(item.reportAmount || item.report_amount || (parseNumber(item.purchaseTotal || item.purchase_total) - parseNumber(item.loadingDiscount || item.loading_discount))),
  };
}

function normalizeSlipDetail(item) {
  const moduleKey = item.module_type || item.moduleType;
  const entries = (item.items || []).map((entry) => ({
    type: entry.rice_type_name_snapshot || entry.riceTypeNameSnapshot || "-",
    bags: parseNumber(entry.bag_count || entry.bagCount),
    weightPerBag: parseNumber(entry.weight_per_bag || entry.weightPerBag),
    weight: parseNumber(entry.total_weight || entry.totalWeight),
    rate: parseNumber(entry.rate_per_kg || entry.ratePerKg),
    amount: parseNumber(entry.total_amount || entry.totalAmount),
  }));

  const normalized = {
    id: item.id,
    moduleKey,
    date: item.entry_date || item.entryDate,
    slipNumber: item.slip_number || item.slipNumber,
    vehicleNumber: item.vehicle_number || item.vehicleNumber || "",
    farmerName: item.farmer_name_snapshot || item.farmerNameSnapshot || "",
    supplierName: item.supplier_name_snapshot || item.supplierNameSnapshot || "",
    companyName: item.company_name_snapshot || item.companyNameSnapshot || "",
    driverName: item.driver_name_snapshot || item.driverNameSnapshot || "",
    grossWeight: parseNumber(item.gross_weight || item.grossWeight),
    dustDeduction: parseNumber(item.dust_deduction || item.dustDeduction),
    moistureDeduction: parseNumber(item.moisture_deduction || item.moistureDeduction),
    finalWeight: parseNumber(item.final_weight || item.finalWeight),
    netWeight: parseNumber(item.net_weight || item.netWeight),
    totalBags: parseNumber(item.total_bags || item.totalBags),
    averageWeight: parseNumber(item.average_weight || item.averageWeight),
    moistureNote: item.moisture_note || item.moistureNote || "",
    loadingDiscount: parseNumber(item.loading_discount || item.loadingDiscount),
    advancePayment: parseNumber(item.advance_payment || item.advancePayment),
    purchaseTotal: parseNumber(item.purchase_total || item.purchaseTotal),
    finalPayable: parseNumber(item.final_payable || item.finalPayable),
    totalWeight: parseNumber(item.net_weight || item.total_weight || item.totalWeight),
    entries,
  };

  return buildReportRecord(moduleKey, normalized);
}

function buildPaymentDetails(ledger) {
  return {
    Party: ledger.partyName,
    Type: ledger.typeLabel,
    Orders: String(ledger.orderCount || 0),
    OpenOrders: String(ledger.openOrderCount || 0),
    TotalBags: String(ledger.totalBags || 0),
    TotalWeight: formatKg(ledger.totalWeight || 0),
    Advance: formatMoney(ledger.advanceAmount || 0),
    LastPayment: ledger.lastPaymentDate ? formatDateForDisplay(ledger.lastPaymentDate) : "No payment yet",
  };
}

function normalizePaymentListItem(item) {
  const moduleType = item.moduleType || item.module_type;
  return {
    id: `${item.partyView || item.party_view}:${item.partyName || item.party_name || "-"}`,
    moduleType,
    partyView: item.partyView || item.party_view,
    typeLabel: moduleType === "home" ? "Farmer Ledger" : moduleType === "godown" ? "Supplier Ledger" : "Company Ledger",
    partyName: item.partyName || item.party_name || "-",
    orderCount: parseNumber(item.orderCount || item.order_count),
    openOrderCount: parseNumber(item.openOrderCount || item.open_order_count),
    totalBags: parseNumber(item.totalBags || item.total_bags),
    totalWeight: parseNumber(item.totalWeight || item.total_weight),
    firstOrderDate: item.firstOrderDate || item.first_order_date,
    lastOrderDate: item.lastOrderDate || item.last_order_date,
    lastPaymentDate: item.lastPaymentDate || item.last_payment_date || "",
    totalAmount: parseNumber(item.totalAmount || item.total_amount),
    paidAmount: parseNumber(item.paidAmount || item.paid_amount),
    balanceAmount: parseNumber(item.balanceAmount || item.balance_amount),
    paymentOnlyAmount: parseNumber(item.paymentOnlyAmount || item.payment_only_amount),
    allocatedPaymentAmount: parseNumber(item.allocatedPaymentAmount || item.allocated_payment_amount),
  };
}

function normalizePaymentDetail(item) {
  const base = normalizePaymentListItem(item);
  const advanceAmount = parseNumber(item.advanceAmount || item.advance_amount);
  const creditAmount = parseNumber(item.creditAmount || item.credit_amount);

  return {
    ...base,
    advanceAmount,
    creditAmount,
    details: buildPaymentDetails({
      ...base,
      advanceAmount,
    }),
    payments: (item.payments || []).map((payment) => ({
      date: payment.payment_date || payment.paymentDate,
      amount: parseNumber(payment.amount),
      bankAccount: payment.bank_account || payment.bankAccount || "-",
      mode: payment.mode,
      reference: payment.reference_code || payment.referenceCode || "",
      remark: payment.remark || "",
      allocatedAmount: parseNumber(payment.allocated_amount || payment.allocatedAmount),
    })),
    slips: (item.slips || []).map((slip) => ({
      id: String(slip.id),
      entryDate: slip.entry_date || slip.entryDate,
      slipNumber: slip.slip_number || slip.slipNumber || "-",
      vehicleNumber: slip.vehicle_number || slip.vehicleNumber || "-",
      totalAmount: parseNumber(slip.total_amount || slip.totalAmount),
      paidAmount: parseNumber(slip.paid_amount || slip.paidAmount),
      balanceAmount: parseNumber(slip.balance_amount || slip.balanceAmount),
      totalBags: parseNumber(slip.total_bags || slip.totalBags),
      netWeight: parseNumber(slip.net_weight || slip.netWeight),
    })),
  };
}

async function loadSettingsData() {
  const [riceResponse, supplierResponse, driverResponse, companyResponse] = await Promise.all([
    apiRequest("/settings/rice-types"),
    apiRequest("/settings/suppliers"),
    apiRequest("/settings/drivers"),
    apiRequest("/settings/companies"),
  ]);

  const riceItems = (riceResponse.items || []).map((item) => mapSettingRecord("rice", item));
  const supplierItems = (supplierResponse.items || []).map((item) => mapSettingRecord("supplier", item));
  const driverItems = (driverResponse.items || []).map((item) => mapSettingRecord("driver", item));
  const companyItems = (companyResponse.items || []).map((item) => mapSettingRecord("company", item));

  paddyTypes = riceItems.map((item) => item.name);
  setStoreItems(settingsStore.rice, riceItems);
  setStoreItems(settingsStore.supplier, supplierItems);
  setStoreItems(settingsStore.driver, driverItems);
  setStoreItems(settingsStore.company, companyItems);
  renderAllSettings();
  refreshMasterDropdowns();
}

async function loadReportsData() {
  const response = await apiRequest("/reports");
  const records = (response.items || []).map(normalizeReportListItem);
  reportStore.splice(0, reportStore.length, ...records);
  if (typeof window.refreshReportsView === "function") {
    window.refreshReportsView();
  }
}

async function loadDashboardData() {
  const [summary, recent] = await Promise.all([
    apiRequest("/dashboard/summary"),
    apiRequest("/dashboard/recent-transactions", { query: { limit: 10 } }),
  ]);

  if (dashboardStatValues.length >= 4) {
    dashboardStatValues[0].textContent = formatMoney(summary.todaysPurchases || 0);
    dashboardStatValues[1].textContent = formatMoney(summary.todaysSales || 0);
    dashboardStatValues[2].textContent = formatMoney(summary.pendingPayments || 0);
    dashboardStatValues[3].textContent = String(summary.totalBagsPurchased || 0);
  }

  if (dashboardStatMeta.length >= 4) {
    dashboardStatMeta[0].textContent = "Live purchase total for today";
    dashboardStatMeta[1].textContent = "Live selling total for today";
    dashboardStatMeta[2].textContent = "Outstanding payable across all slips";
    dashboardStatMeta[3].textContent = "Across godown and home purchase channels";
  }

  const items = recent.items || [];
  if (dashboardRecentBody) {
    dashboardRecentBody.innerHTML = items.length
      ? items
          .map((item) => {
            const status = formatStatusChip(item.status);
            return `
              <tr>
                <td>${escapeHtml(formatDateForDisplay(item.entryDate))}</td>
                <td>${escapeHtml(item.slipNumber)}</td>
                <td>${escapeHtml(formatModuleLabel(item.moduleType))}</td>
                <td>${escapeHtml(item.partyName || "-")}</td>
                <td>${escapeHtml(String(item.totalBags || 0))}</td>
                <td>${formatMoney(item.amount || 0)}</td>
                <td><span class="status-chip ${status.className}">${status.label}</span></td>
              </tr>
            `;
          })
          .join("")
      : `<tr><td colspan="7">No recent transactions found.</td></tr>`;
  }
}

async function persistSlipToApi(moduleKey, data) {
  const path = moduleKey === "godown" ? "/purchases/godown" : moduleKey === "home" ? "/purchases/home" : "/purchases/selling";
  const payload = {
    ...data,
    entryDate: data.date,
  };
  const savedRecord = await apiRequest(path, {
    method: "POST",
    body: payload,
  });
  await Promise.all([loadReportsData(), loadDashboardData()]);
  if (typeof window.refreshPaymentsView === "function") {
    await window.refreshPaymentsView();
  }
  return savedRecord;
}

let toastTimer = null;

function showToast(message, type = "success") {
  const toast = document.getElementById("appToast");
  if (!toast) return;
  toast.textContent = message;
  toast.classList.remove("success", "error", "visible");
  toast.classList.add(type);
  window.clearTimeout(toastTimer);
  requestAnimationFrame(() => {
    toast.classList.add("visible");
  });
  toastTimer = window.setTimeout(() => {
    toast.classList.remove("visible");
  }, 2200);
}

function notifyError(error) {
  console.error(error);
  showToast(error.message || "Something went wrong while connecting to the backend.", "error");
}

function formatKg(value) {
  return `${Number(value || 0).toFixed(2)} Kg`;
}

function formatMoney(value) {
  return `Rs ${Number(value || 0).toFixed(2)}`;
}

function formatDateForDisplay(value) {
  if (!value) return "-";
  const [year, month, day] = value.split("-");
  return `${day}-${month}-${year}`;
}

function formatLongDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(`${value}T00:00:00`));
}

function parseNumber(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getLocalDateString() {
  const now = new Date();
  const timezoneOffset = now.getTimezoneOffset() * 60000;
  return new Date(now.getTime() - timezoneOffset).toISOString().split("T")[0];
}

function buildTypeOptions() {
  return `<option value="">Select type</option>${paddyTypes
    .map((type) => `<option>${type}</option>`)
    .join("")}`;
}

function activateView(viewName) {
  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });

  viewPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.viewPanel === viewName);
    panel.classList.remove("print-active");
  });

  const meta = viewMeta[viewName] || viewMeta.dashboard;
  pageEyebrow.textContent = meta.eyebrow;
  pageTitle.textContent = meta.title;
  pageCopy.textContent = meta.copy;

}

navButtons.forEach((button) => {
  button.addEventListener("click", () => activateView(button.dataset.view));
});

sidebarToggle.addEventListener("click", () => {
  sidebar.classList.toggle("collapsed");
  app.classList.toggle("sidebar-collapsed", sidebar.classList.contains("collapsed"));
});

const reportStore = [];

function sanitizeReportKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
}

function getReportCategory(moduleKey) {
  if (moduleKey === "home") return "farmers";
  if (moduleKey === "godown") return "suppliers";
  return "company";
}

function getReportPartyName(moduleKey, data) {
  if (moduleKey === "home") return data.farmerName || "Unknown Farmer";
  if (moduleKey === "godown") return data.supplierName || "Unknown Supplier";
  return data.companyName || "Unknown Company";
}

function getReportTypeLabel(moduleKey) {
  if (moduleKey === "home") return "Farmer Purchase";
  if (moduleKey === "godown") return "Supplier Purchase";
  return "Company Selling";
}

function getReportKindLabel(moduleKey) {
  return moduleKey === "selling" ? "Selling" : "Buying";
}

function getReportWeight(moduleKey, data) {
  if (moduleKey === "home") return parseNumber(data.totalWeight);
  return parseNumber(data.netWeight ?? data.finalWeight);
}

function buildReportInfoRows(moduleKey, data, partyName) {
  if (moduleKey === "home") {
    return [
      { label: "Farmer", value: partyName },
      { label: "Driver", value: data.driverName || "-" },
      { label: "Vehicle", value: data.vehicleNumber || "-" },
      { label: "Total Bags", value: String(data.totalBags ?? 0) },
      { label: "Total Weight", value: formatKg(data.totalWeight) },
      { label: "Purchase Amount", value: formatMoney(data.purchaseTotal) },
      { label: "Advance", value: formatMoney(data.advancePayment) },
      { label: "Final Payable", value: formatMoney(data.finalPayable) },
    ];
  }

  return [
    { label: moduleKey === "godown" ? "Supplier" : "Company", value: partyName },
    { label: "Gross Weight", value: formatKg(data.grossWeight) },
    { label: "Dust Deduction", value: formatKg(data.dustDeduction) },
    { label: "Moisture Deduction", value: formatKg(data.moistureDeduction) },
    { label: "Final Weight", value: formatKg(data.finalWeight) },
    { label: "Total Bags", value: String(data.totalBags ?? 0) },
    { label: "Average Weight", value: formatKg(data.averageWeight) },
    { label: "Net Weight", value: formatKg(data.netWeight) },
    { label: moduleKey === "godown" ? "Purchase Total" : "Selling Total", value: formatMoney(data.purchaseTotal) },
    { label: "Loading Discount", value: formatMoney(data.loadingDiscount) },
    { label: "Advance", value: formatMoney(data.advancePayment) },
    { label: moduleKey === "godown" ? "Final Payable" : "Final Amount", value: formatMoney(data.finalPayable) },
    { label: "Moisture Note", value: data.moistureNote || "-" },
  ];
}

function buildReportSummary(moduleKey, data, partyName) {
  if (moduleKey === "home") {
    return `${partyName} purchase slip ${data.slipNumber || "-"} recorded for ${formatKg(data.totalWeight)} across ${data.totalBags || 0} bags.`;
  }

  const actionLabel = moduleKey === "godown" ? "purchase" : "selling";
  return `${partyName} ${actionLabel} slip ${data.slipNumber || "-"} recorded for ${formatKg(data.netWeight ?? data.finalWeight)} with final amount ${formatMoney(parseNumber(data.purchaseTotal) - parseNumber(data.loadingDiscount))}.`;
}

function cloneReportEntries(entries) {
  return Array.isArray(entries) ? entries.map((entry) => ({ ...entry })) : [];
}

function buildReportRecord(moduleKey, data) {
  const partyName = getReportPartyName(moduleKey, data);
  const totalWeight = getReportWeight(moduleKey, data);
  const totalBags = parseNumber(data.totalBags);
  const totalAmount = parseNumber(data.purchaseTotal) - parseNumber(data.loadingDiscount);

  return {
    id: data.id || [moduleKey, sanitizeReportKey(data.date), sanitizeReportKey(data.slipNumber), sanitizeReportKey(partyName)].join("::"),
    moduleKey,
    category: getReportCategory(moduleKey),
    typeLabel: getReportTypeLabel(moduleKey),
    kindLabel: getReportKindLabel(moduleKey),
    partyName,
    date: data.date || "",
    dateDisplay: formatDateForDisplay(data.date),
    slipNumber: data.slipNumber || "-",
    vehicleNumber: data.vehicleNumber || "-",
    driverName: data.driverName || "",
    totalBags,
    totalWeight,
    totalAmount,
    grossWeight: parseNumber(data.grossWeight),
    dustDeduction: parseNumber(data.dustDeduction),
    moistureDeduction: parseNumber(data.moistureDeduction),
    finalWeight: parseNumber(data.finalWeight),
    netWeight: parseNumber(data.netWeight),
    averageWeight: parseNumber(data.averageWeight),
    moistureNote: data.moistureNote || "",
    loadingDiscount: parseNumber(data.loadingDiscount),
    advancePayment: parseNumber(data.advancePayment),
    purchaseTotal: parseNumber(data.purchaseTotal),
    finalPayable: parseNumber(data.finalPayable),
    summaryText: buildReportSummary(moduleKey, data, partyName),
    infoRows: buildReportInfoRows(moduleKey, data, partyName),
    entries: cloneReportEntries(data.entries),
    savedAt: new Date().toISOString(),
  };
}

function saveReportRecord(moduleKey, data) {
  if (!data || !String(data.slipNumber || "").trim()) return null;
  return buildReportRecord(moduleKey, data);
}

function createPurchaseModule(config) {
  const form = document.getElementById(config.formId);
  const entriesBody = document.getElementById(config.entriesBodyId);
  const rowTemplate = document.getElementById(config.templateId);
  const printEntriesBody = document.getElementById(config.printEntriesBodyId);
  const actionButtons = [...document.querySelectorAll(`[data-module="${config.key}"]`)];
  const addRowButton = document.querySelector(`[data-add-row="${config.key}"]`);
  const viewPanel = document.querySelector(`[data-view-panel="${config.viewName}"]`);

  const module = {
    config,
    form,
    entriesBody,
    rowTemplate,
    printEntriesBody,
    actionButtons,
    addRowButton,
    viewPanel,
    fields: Object.fromEntries(
      Object.entries(config.fields).map(([key, id]) => [key, document.getElementById(id)])
    ),
    summary: Object.fromEntries(
      Object.entries(config.summary).map(([key, id]) => [key, document.getElementById(id)])
    ),
    printRefs: Object.fromEntries(
      Object.entries(config.printRefs).map(([key, id]) => [key, document.getElementById(id)])
    ),
  };

  function getRows() {
    return [...module.entriesBody.querySelectorAll("tr")];
  }

  function bindRow(row) {
    if (!row || row.dataset.bound === "true") return;

    const typeSelect = row.querySelector(".entry-type");
    if (typeSelect) {
      const currentValue = typeSelect.value;
      typeSelect.innerHTML = buildTypeOptions();
      typeSelect.value = currentValue;
    }

    row.dataset.bound = "true";
  }

  function hydrateRows() {
    getRows().forEach(bindRow);
  }

  function addRow() {
    const row = module.rowTemplate.content.firstElementChild.cloneNode(true);
    module.entriesBody.appendChild(row);
    bindRow(row);
    recalculate();
  }

  function getEntryData() {
    hydrateRows();
    return getRows()
      .map((row) => config.getRowData(row, module.fields, true))
      .filter((entry) => entry.isMeaningful);
  }

  function updatePrintTable(entries) {
    if (!entries.length) {
      module.printEntriesBody.innerHTML = `<tr><td colspan="${config.printColumnCount}">No entries added</td></tr>`;
      return;
    }

    module.printEntriesBody.innerHTML = entries.map(config.renderPrintRow).join("");
  }

  function updateValue(ref, value, formatter) {
    if (!ref) return;
    ref.textContent = formatter ? formatter(value) : value;
  }

  function updateSummary(data) {
    config.summaryBindings.forEach((binding) => {
      const value = typeof binding.value === "function" ? binding.value(data) : data[binding.value];
      const formatter = binding.formatter || ((current) => current);
      updateValue(module.summary[binding.target], value, formatter);
    });

    config.printBindings.forEach((binding) => {
      const value = typeof binding.value === "function" ? binding.value(data) : data[binding.value];
      const formatter = binding.formatter || ((current) => current);
      updateValue(module.printRefs[binding.target], value, formatter);
    });

    if (module.summary.finalPayable) {
      module.summary.finalPayable.classList.toggle("negative", data.finalPayable < 0);
    }
  }

  function collectData() {
    const prepared = config.prepareFields ? config.prepareFields(module.fields) : {};
    const entries = getEntryData();
    return config.collectData(module.fields, entries, prepared);
  }

  function recalculate() {
    const data = collectData();
    if (config.normalizeFields) {
      config.normalizeFields(module.fields, data);
    }
    updateSummary(data);
    updatePrintTable(data.entries);
    return data;
  }

  function hasRequiredValues() {
    const requiredFieldNames = Array.isArray(config.requiredFields)
      ? config.requiredFields
      : [config.requiredField];

    return requiredFieldNames.every((fieldName) => {
      const field = module.fields[fieldName];
      if (!field) return true;
      return String(field.value || "").trim().length > 0;
    });
  }

  function syncActionState() {
    const isReady = hasRequiredValues();
    module.actionButtons.forEach((button) => {
      if (button.dataset.action === "reset") return;
      if (button.dataset.busy === "true") return;
      button.disabled = !isReady;
    });
  }

  function validate() {
    const requiredFieldNames = Array.isArray(config.requiredFields)
      ? config.requiredFields
      : [config.requiredField];

    const firstMissing = requiredFieldNames
      .map((fieldName) => module.fields[fieldName])
      .find((field) => field && !String(field.value || "").trim());

    if (firstMissing) {
      firstMissing.focus();
      firstMissing.reportValidity();
      return false;
    }
    return true;
  }

  function setButtonState(button, label) {
    if (!button) return () => {};
    const previousText = button.textContent;
    button.disabled = true;
    button.dataset.busy = "true";
    button.textContent = label;
    return () => {
      button.dataset.busy = "false";
      button.textContent = previousText;
      syncActionState();
    };
  }

  async function save(button) {
    if (!validate()) return false;
    const restore = setButtonState(button, "Saving...");
    try {
      window.lastSavedPurchase = window.lastSavedPurchase || {};
      const draftData = recalculate();
      const savedRecord = await persistSlipToApi(config.key, draftData);
      const savedData = { ...draftData, id: savedRecord.id };
      window.lastSavedPurchase[config.key] = savedData;
      showToast("Entry saved successfully.");
      reset();
      if (button) {
        button.textContent = "Saved";
        setTimeout(() => {
          restore();
        }, 1200);
        return true;
      }
      restore();
      return true;
    } catch (error) {
      restore();
      notifyError(error);
      return false;
    }
  }

  async function print(button) {
    if (!validate()) return;
    const restore = setButtonState(button, "Saving...");
    try {
      window.lastSavedPurchase = window.lastSavedPurchase || {};
      const draftData = recalculate();
      const savedRecord = await persistSlipToApi(config.key, draftData);
      const savedData = { ...draftData, id: savedRecord.id };
      window.lastSavedPurchase[config.key] = savedData;
      updateSummary(savedData);
      updatePrintTable(savedData.entries || []);
      restore();
      showToast("Entry saved successfully.");
      viewPanels.forEach((panel) => panel.classList.remove("print-active"));
      module.viewPanel.classList.add("print-active");
      window.print();
    } catch (error) {
      restore();
      notifyError(error);
    }
  }

  function reset() {
    form.reset();
    config.resetDefaults(module.fields);
    module.entriesBody.innerHTML = "";
    addRow();
    syncActionState();
  }

  function shouldRecalculate(target) {
    return target instanceof HTMLElement && target.matches("input, select, textarea");
  }

  module.addRow = addRow;
  module.recalculate = recalculate;
  module.save = save;
  module.print = print;
  module.reset = reset;

  form.addEventListener("input", (event) => {
    if (shouldRecalculate(event.target)) {
      recalculate();
      syncActionState();
    }
  });

  form.addEventListener("change", (event) => {
    if (shouldRecalculate(event.target)) {
      recalculate();
      syncActionState();
    }
  });

  form.addEventListener(
    "wheel",
    (event) => {
      if (event.target instanceof HTMLInputElement && event.target.type === "number") {
        event.target.blur();
      }
    },
    { passive: true }
  );

  entriesBody.addEventListener("click", (event) => {
    const button = event.target.closest(".delete-row-btn");
    if (!button) return;

    const row = button.closest("tr");
    if (!row) return;

    row.remove();
    if (!module.entriesBody.children.length) {
      addRow();
      return;
    }
    recalculate();
    syncActionState();
  });

  addRowButton.addEventListener("click", addRow);

  actionButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const action = button.dataset.action;
      if (action === "save") await save(button);
      if (action === "print") await print(button);
      if (action === "reset") reset();
    });
  });

  config.resetDefaults(module.fields);
  if (module.entriesBody.children.length) {
    hydrateRows();
  } else {
    addRow();
  }
  recalculate();
  syncActionState();

  return module;
}

createPurchaseModule({
  key: "godown",
  viewName: "godown-entry",
  formId: "godownForm",
  entriesBodyId: "godownEntriesBody",
  templateId: "godownRowTemplate",
  printEntriesBodyId: "godownPrintEntriesBody",
  requiredField: "slipNumber",
  printColumnCount: 5,
  fields: {
    entryDate: "godownEntryDate",
    slipNumber: "godownSlipNumber",
    vehicleNumber: "godownVehicleNumber",
    supplierName: "godownSupplierName",
    grossWeight: "godownGrossWeight",
    dustDeduction: "godownDustDeduction",
    finalWeight: "godownFinalWeight",
    totalBags: "godownTotalBags",
    averageWeight: "godownAverageWeight",
    moistureDeduction: "godownMoistureDeduction",
    moistureNote: "godownMoistureNote",
    loadingDiscount: "godownLoadingDiscount",
    advancePayment: "godownAdvancePayment",
  },
  summary: {
    date: "godownSummaryDate",
    slip: "godownSummarySlip",
    vehicle: "godownSummaryVehicle",
    party: "godownSummaryParty",
    grossWeight: "godownSummaryGrossWeight",
    dustDeduction: "godownSummaryDustDeduction",
    finalWeight: "godownSummaryFinalWeight",
    totalBags: "godownSummaryTotalBags",
    averageWeight: "godownSummaryAverageWeight",
    moistureDeduction: "godownSummaryMoistureDeduction",
    netWeight: "godownSummaryNetWeight",
    purchaseTotal: "godownSummaryPurchaseTotal",
    loadingDiscount: "godownSummaryLoadingDiscount",
    advance: "godownSummaryAdvance",
    finalPayable: "godownSummaryFinalPayable",
  },
  printRefs: {
    date: "godownPrintDate",
    id: "godownPrintId",
    slip: "godownPrintSlip",
    vehicle: "godownPrintVehicle",
    party: "godownPrintParty",
    grossWeight: "godownPrintGrossWeight",
    dustDeduction: "godownPrintDustDeduction",
    finalWeight: "godownPrintFinalWeight",
    averageWeight: "godownPrintAverageWeight",
    moistureDeduction: "godownPrintMoistureDeduction",
    netWeight: "godownPrintNetWeight",
    note: "godownPrintNote",
    purchaseTotal: "godownPrintPurchaseTotal",
    loadingDiscount: "godownPrintLoadingDiscount",
    advance: "godownPrintAdvance",
    finalPayable: "godownPrintFinalPayable",
  },
  summaryBindings: [
    { target: "date", value: "dateDisplay" },
    { target: "slip", value: (data) => data.slipNumber || "-" },
    { target: "vehicle", value: (data) => data.vehicleNumber || "-" },
    { target: "party", value: (data) => data.supplierName || "-" },
    { target: "grossWeight", value: "grossWeight", formatter: formatKg },
    { target: "dustDeduction", value: "dustDeduction", formatter: formatKg },
    { target: "finalWeight", value: "finalWeight", formatter: formatKg },
    { target: "totalBags", value: (data) => String(data.totalBags) },
    { target: "averageWeight", value: "averageWeight", formatter: formatKg },
    { target: "moistureDeduction", value: "moistureDeduction", formatter: formatKg },
    { target: "netWeight", value: "netWeight", formatter: formatKg },
    { target: "purchaseTotal", value: "purchaseTotal", formatter: formatMoney },
    { target: "loadingDiscount", value: "loadingDiscount", formatter: formatMoney },
    { target: "advance", value: "advancePayment", formatter: formatMoney },
    { target: "finalPayable", value: "finalPayable", formatter: formatMoney },
  ],
  printBindings: [
    { target: "date", value: "dateDisplay" },
    { target: "id", value: (data) => data.id || "-" },
    { target: "slip", value: (data) => data.slipNumber || "-" },
    { target: "vehicle", value: (data) => data.vehicleNumber || "-" },
    { target: "party", value: (data) => data.supplierName || "-" },
    { target: "grossWeight", value: "grossWeight", formatter: formatKg },
    { target: "dustDeduction", value: "dustDeduction", formatter: formatKg },
    { target: "finalWeight", value: "finalWeight", formatter: formatKg },
    { target: "averageWeight", value: "averageWeight", formatter: formatKg },
    { target: "moistureDeduction", value: "moistureDeduction", formatter: formatKg },
    { target: "netWeight", value: "netWeight", formatter: formatKg },
    { target: "note", value: (data) => data.moistureNote || "-" },
    { target: "purchaseTotal", value: "purchaseTotal", formatter: formatMoney },
    { target: "loadingDiscount", value: "loadingDiscount", formatter: formatMoney },
    { target: "advance", value: "advancePayment", formatter: formatMoney },
    { target: "finalPayable", value: "finalPayable", formatter: formatMoney },
  ],
  prepareFields(fields) {
    const grossWeight = parseNumber(fields.grossWeight.value);
    const dustDeduction = parseNumber(fields.dustDeduction.value);
    const moistureDeduction = parseNumber(fields.moistureDeduction.value);
    const totalBags = Math.max(0, Math.trunc(parseNumber(fields.totalBags.value)));
    const finalWeight = Math.max(0, grossWeight - dustDeduction - moistureDeduction);
    const averageWeight = totalBags > 0 ? finalWeight / totalBags : 0;

    fields.finalWeight.value = formatKg(finalWeight);
    fields.averageWeight.value = formatKg(averageWeight);
    fields.averageWeight.dataset.value = String(averageWeight);

    return {
      grossWeight,
      dustDeduction,
      moistureDeduction,
      totalBags,
      finalWeight,
      averageWeight,
    };
  },
  getRowData(row, fields, shouldWrite = true) {
    const averageWeight = parseNumber(fields.averageWeight.dataset.value);
    const bags = parseNumber(row.querySelector(".entry-bags").value);
    const rate = parseNumber(row.querySelector(".entry-rate").value);
    const type = row.querySelector(".entry-type").value;
    const weight = averageWeight * bags;
    const amount = weight * rate;

    if (shouldWrite) {
      row.querySelector(".entry-weight").value = formatKg(weight);
      row.querySelector(".entry-amount").value = formatMoney(amount);
    }

    return {
      type: type || "-",
      bags,
      rate,
      weight,
      amount,
      isMeaningful: Boolean(type) || bags > 0 || rate > 0,
    };
  },
  renderPrintRow(entry) {
    return `
      <tr>
        <td>${entry.type}</td>
        <td>${entry.bags}</td>
        <td>${formatMoney(entry.rate)}</td>
        <td>${formatKg(entry.weight)}</td>
        <td>${formatMoney(entry.amount)}</td>
      </tr>
    `;
  },
  normalizeFields(fields, data) {
    fields.vehicleNumber.value = data.vehicleNumber;
  },
  collectData(fields, entries, prepared) {
    const purchaseTotal = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const netWeight = prepared.finalWeight;
    const loadingDiscount = parseNumber(fields.loadingDiscount.value);
    const advancePayment = parseNumber(fields.advancePayment.value);
    const finalPayable = purchaseTotal - loadingDiscount - advancePayment;

    return {
      date: fields.entryDate.value,
      dateDisplay: formatDateForDisplay(fields.entryDate.value),
      slipNumber: fields.slipNumber.value.trim(),
      vehicleNumber: fields.vehicleNumber.value.trim().toUpperCase(),
      supplierName: fields.supplierName.value,
      grossWeight: prepared.grossWeight,
      dustDeduction: prepared.dustDeduction,
      finalWeight: prepared.finalWeight,
      totalBags: prepared.totalBags,
      averageWeight: prepared.averageWeight,
      entries,
      moistureDeduction: prepared.moistureDeduction,
      moistureNote: fields.moistureNote.value.trim(),
      netWeight,
      purchaseTotal,
      loadingDiscount,
      advancePayment,
      finalPayable,
    };
  },
  resetDefaults(fields) {
    fields.entryDate.value = getLocalDateString();
    fields.dustDeduction.value = "";
    fields.moistureDeduction.value = "";
    fields.loadingDiscount.value = "";
    fields.advancePayment.value = "";
    fields.finalWeight.value = formatKg(0);
    fields.averageWeight.value = formatKg(0);
    fields.averageWeight.dataset.value = "0";
  },
});

createPurchaseModule({
  key: "selling",
  viewName: "selling",
  formId: "sellingForm",
  entriesBodyId: "sellingEntriesBody",
  templateId: "godownRowTemplate",
  printEntriesBodyId: "sellingPrintEntriesBody",
  requiredField: "slipNumber",
  printColumnCount: 5,
  fields: {
    entryDate: "sellingEntryDate",
    slipNumber: "sellingSlipNumber",
    vehicleNumber: "sellingVehicleNumber",
    companyName: "sellingCompanyName",
    grossWeight: "sellingGrossWeight",
    dustDeduction: "sellingDustDeduction",
    finalWeight: "sellingFinalWeight",
    totalBags: "sellingTotalBags",
    averageWeight: "sellingAverageWeight",
    moistureDeduction: "sellingMoistureDeduction",
    moistureNote: "sellingMoistureNote",
    loadingDiscount: "sellingLoadingDiscount",
    advancePayment: "sellingAdvancePayment",
  },
  summary: {
    date: "sellingSummaryDate",
    slip: "sellingSummarySlip",
    vehicle: "sellingSummaryVehicle",
    party: "sellingSummaryParty",
    grossWeight: "sellingSummaryGrossWeight",
    dustDeduction: "sellingSummaryDustDeduction",
    finalWeight: "sellingSummaryFinalWeight",
    totalBags: "sellingSummaryTotalBags",
    averageWeight: "sellingSummaryAverageWeight",
    moistureDeduction: "sellingSummaryMoistureDeduction",
    netWeight: "sellingSummaryNetWeight",
    purchaseTotal: "sellingSummaryPurchaseTotal",
    loadingDiscount: "sellingSummaryLoadingDiscount",
    advance: "sellingSummaryAdvance",
    finalPayable: "sellingSummaryFinalPayable",
  },
  printRefs: {
    date: "sellingPrintDate",
    id: "sellingPrintId",
    slip: "sellingPrintSlip",
    vehicle: "sellingPrintVehicle",
    party: "sellingPrintParty",
    grossWeight: "sellingPrintGrossWeight",
    dustDeduction: "sellingPrintDustDeduction",
    finalWeight: "sellingPrintFinalWeight",
    averageWeight: "sellingPrintAverageWeight",
    moistureDeduction: "sellingPrintMoistureDeduction",
    netWeight: "sellingPrintNetWeight",
    note: "sellingPrintNote",
    purchaseTotal: "sellingPrintPurchaseTotal",
    loadingDiscount: "sellingPrintLoadingDiscount",
    advance: "sellingPrintAdvance",
    finalPayable: "sellingPrintFinalPayable",
  },
  summaryBindings: [
    { target: "date", value: "dateDisplay" },
    { target: "slip", value: (data) => data.slipNumber || "-" },
    { target: "vehicle", value: (data) => data.vehicleNumber || "-" },
    { target: "party", value: (data) => data.companyName || "-" },
    { target: "grossWeight", value: "grossWeight", formatter: formatKg },
    { target: "dustDeduction", value: "dustDeduction", formatter: formatKg },
    { target: "finalWeight", value: "finalWeight", formatter: formatKg },
    { target: "totalBags", value: (data) => String(data.totalBags) },
    { target: "averageWeight", value: "averageWeight", formatter: formatKg },
    { target: "moistureDeduction", value: "moistureDeduction", formatter: formatKg },
    { target: "netWeight", value: "netWeight", formatter: formatKg },
    { target: "purchaseTotal", value: "purchaseTotal", formatter: formatMoney },
    { target: "loadingDiscount", value: "loadingDiscount", formatter: formatMoney },
    { target: "advance", value: "advancePayment", formatter: formatMoney },
    { target: "finalPayable", value: "finalPayable", formatter: formatMoney },
  ],
  printBindings: [
    { target: "date", value: "dateDisplay" },
    { target: "id", value: (data) => data.id || "-" },
    { target: "slip", value: (data) => data.slipNumber || "-" },
    { target: "vehicle", value: (data) => data.vehicleNumber || "-" },
    { target: "party", value: (data) => data.companyName || "-" },
    { target: "grossWeight", value: "grossWeight", formatter: formatKg },
    { target: "dustDeduction", value: "dustDeduction", formatter: formatKg },
    { target: "finalWeight", value: "finalWeight", formatter: formatKg },
    { target: "averageWeight", value: "averageWeight", formatter: formatKg },
    { target: "moistureDeduction", value: "moistureDeduction", formatter: formatKg },
    { target: "netWeight", value: "netWeight", formatter: formatKg },
    { target: "note", value: (data) => data.moistureNote || "-" },
    { target: "purchaseTotal", value: "purchaseTotal", formatter: formatMoney },
    { target: "loadingDiscount", value: "loadingDiscount", formatter: formatMoney },
    { target: "advance", value: "advancePayment", formatter: formatMoney },
    { target: "finalPayable", value: "finalPayable", formatter: formatMoney },
  ],
  prepareFields(fields) {
    const grossWeight = parseNumber(fields.grossWeight.value);
    const dustDeduction = parseNumber(fields.dustDeduction.value);
    const moistureDeduction = parseNumber(fields.moistureDeduction.value);
    const totalBags = Math.max(0, Math.trunc(parseNumber(fields.totalBags.value)));
    const finalWeight = Math.max(0, grossWeight - dustDeduction - moistureDeduction);
    const averageWeight = totalBags > 0 ? finalWeight / totalBags : 0;

    fields.finalWeight.value = formatKg(finalWeight);
    fields.averageWeight.value = formatKg(averageWeight);
    fields.averageWeight.dataset.value = String(averageWeight);

    return {
      grossWeight,
      dustDeduction,
      moistureDeduction,
      totalBags,
      finalWeight,
      averageWeight,
    };
  },
  getRowData(row, fields, shouldWrite = true) {
    const averageWeight = parseNumber(fields.averageWeight.dataset.value);
    const bags = parseNumber(row.querySelector(".entry-bags").value);
    const rate = parseNumber(row.querySelector(".entry-rate").value);
    const type = row.querySelector(".entry-type").value;
    const weight = averageWeight * bags;
    const amount = weight * rate;

    if (shouldWrite) {
      row.querySelector(".entry-weight").value = formatKg(weight);
      row.querySelector(".entry-amount").value = formatMoney(amount);
    }

    return {
      type: type || "-",
      bags,
      rate,
      weight,
      amount,
      isMeaningful: Boolean(type) || bags > 0 || rate > 0,
    };
  },
  renderPrintRow(entry) {
    return `
      <tr>
        <td>${entry.type}</td>
        <td>${entry.bags}</td>
        <td>${formatMoney(entry.rate)}</td>
        <td>${formatKg(entry.weight)}</td>
        <td>${formatMoney(entry.amount)}</td>
      </tr>
    `;
  },
  normalizeFields(fields, data) {
    fields.vehicleNumber.value = data.vehicleNumber;
  },
  collectData(fields, entries, prepared) {
    const purchaseTotal = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const netWeight = prepared.finalWeight;
    const loadingDiscount = parseNumber(fields.loadingDiscount.value);
    const advancePayment = parseNumber(fields.advancePayment.value);
    const finalPayable = purchaseTotal - loadingDiscount - advancePayment;

    return {
      date: fields.entryDate.value,
      dateDisplay: formatDateForDisplay(fields.entryDate.value),
      slipNumber: fields.slipNumber.value.trim(),
      vehicleNumber: fields.vehicleNumber.value.trim().toUpperCase(),
      companyName: fields.companyName.value,
      grossWeight: prepared.grossWeight,
      dustDeduction: prepared.dustDeduction,
      finalWeight: prepared.finalWeight,
      totalBags: prepared.totalBags,
      averageWeight: prepared.averageWeight,
      entries,
      moistureDeduction: prepared.moistureDeduction,
      moistureNote: fields.moistureNote.value.trim(),
      netWeight,
      purchaseTotal,
      loadingDiscount,
      advancePayment,
      finalPayable,
    };
  },
  resetDefaults(fields) {
    fields.entryDate.value = getLocalDateString();
    fields.dustDeduction.value = "";
    fields.moistureDeduction.value = "";
    fields.loadingDiscount.value = "";
    fields.advancePayment.value = "";
    fields.finalWeight.value = formatKg(0);
    fields.averageWeight.value = formatKg(0);
    fields.averageWeight.dataset.value = "0";
  },
});

createPurchaseModule({
  key: "home",
  viewName: "home-entry",
  formId: "homeForm",
  entriesBodyId: "homeEntriesBody",
  templateId: "homeRowTemplate",
  printEntriesBodyId: "homePrintEntriesBody",
  requiredField: "slipNumber",
  printColumnCount: 6,
  fields: {
    entryDate: "homeEntryDate",
    slipNumber: "homeSlipNumber",
    farmerName: "homeFarmerName",
    driverName: "homeDriverName",
    vehicleNumber: "homeVehicleNumber",
    advancePayment: "homeAdvancePayment",
  },
  summary: {
    date: "homeSummaryDate",
    slip: "homeSummarySlip",
    party: "homeSummaryParty",
    driver: "homeSummaryDriver",
    vehicle: "homeSummaryVehicle",
    totalBags: "homeSummaryTotalBags",
    totalWeight: "homeSummaryTotalWeight",
    purchaseTotal: "homeSummaryPurchaseTotal",
    advance: "homeSummaryAdvance",
    finalPayable: "homeSummaryFinalPayable",
  },
  printRefs: {
    date: "homePrintDate",
    id: "homePrintId",
    slip: "homePrintSlip",
    party: "homePrintParty",
    driver: "homePrintDriver",
    vehicle: "homePrintVehicle",
    totalBags: "homePrintTotalBags",
    totalWeight: "homePrintTotalWeight",
    advance: "homePrintAdvance",
    purchaseTotal: "homePrintPurchaseTotal",
    advanceTotal: "homePrintAdvanceTotal",
    finalPayable: "homePrintFinalPayable",
  },
  summaryBindings: [
    { target: "date", value: "dateDisplay" },
    { target: "slip", value: (data) => data.slipNumber || "-" },
    { target: "party", value: (data) => data.farmerName || "-" },
    { target: "driver", value: (data) => data.driverName || "-" },
    { target: "vehicle", value: (data) => data.vehicleNumber || "-" },
    { target: "totalBags", value: (data) => String(data.totalBags) },
    { target: "totalWeight", value: "totalWeight", formatter: formatKg },
    { target: "purchaseTotal", value: "purchaseTotal", formatter: formatMoney },
    { target: "advance", value: "advancePayment", formatter: formatMoney },
    { target: "finalPayable", value: "finalPayable", formatter: formatMoney },
  ],
  printBindings: [
    { target: "date", value: "dateDisplay" },
    { target: "id", value: (data) => data.id || "-" },
    { target: "slip", value: (data) => data.slipNumber || "-" },
    { target: "party", value: (data) => data.farmerName || "-" },
    { target: "driver", value: (data) => data.driverName || "-" },
    { target: "vehicle", value: (data) => data.vehicleNumber || "-" },
    { target: "totalBags", value: (data) => String(data.totalBags) },
    { target: "totalWeight", value: "totalWeight", formatter: formatKg },
    { target: "advance", value: "advancePayment", formatter: formatMoney },
    { target: "purchaseTotal", value: "purchaseTotal", formatter: formatMoney },
    { target: "advanceTotal", value: "advancePayment", formatter: formatMoney },
    { target: "finalPayable", value: "finalPayable", formatter: formatMoney },
  ],
  getRowData(row) {
    const bags = parseNumber(row.querySelector(".entry-bags").value);
    const weightPerBag = parseNumber(row.querySelector(".entry-weight-per-bag").value);
    const rate = parseNumber(row.querySelector(".entry-rate").value);
    const type = row.querySelector(".entry-type").value;
    const weight = bags * weightPerBag;
    const amount = weight * rate;

    row.querySelector(".entry-weight").value = formatKg(weight);
    row.querySelector(".entry-amount").value = formatMoney(amount);

    return {
      type: type || "-",
      bags,
      weightPerBag,
      weight,
      rate,
      amount,
      isMeaningful: Boolean(type) || bags > 0 || weightPerBag > 0 || rate > 0,
    };
  },
  renderPrintRow(entry) {
    return `
      <tr>
        <td>${entry.type}</td>
        <td>${entry.bags}</td>
        <td>${formatKg(entry.weightPerBag)}</td>
        <td>${formatKg(entry.weight)}</td>
        <td>${formatMoney(entry.rate)}</td>
        <td>${formatMoney(entry.amount)}</td>
      </tr>
    `;
  },
  normalizeFields(fields, data) {
    fields.vehicleNumber.value = data.vehicleNumber;
  },
  collectData(fields, entries) {
    const totalBags = entries.reduce((sum, entry) => sum + entry.bags, 0);
    const totalWeight = entries.reduce((sum, entry) => sum + entry.weight, 0);
    const purchaseTotal = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const advancePayment = parseNumber(fields.advancePayment.value);
    const finalPayable = purchaseTotal - advancePayment;

    return {
      date: fields.entryDate.value,
      dateDisplay: formatDateForDisplay(fields.entryDate.value),
      slipNumber: fields.slipNumber.value.trim(),
      farmerName: fields.farmerName.value,
      driverName: fields.driverName.value,
      vehicleNumber: fields.vehicleNumber.value.trim().toUpperCase(),
      entries,
      totalBags,
      totalWeight,
      purchaseTotal,
      advancePayment,
      finalPayable,
    };
  },
  resetDefaults(fields) {
    fields.entryDate.value = getLocalDateString();
    fields.advancePayment.value = "";
  },
});

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function renderSettingsChips(items, containerId, countId, emptyLabel) {
  const container = document.getElementById(containerId);
  const count = document.getElementById(countId);
  if (!container || !count) return;

  count.textContent = `${items.length} Item${items.length === 1 ? "" : "s"}`;
  if (!items.length) {
    container.innerHTML = `<span class="settings-empty">${emptyLabel}</span>`;
    return;
  }

  container.innerHTML = items
    .map((item) => `<span class="settings-chip">${escapeHtml(item.name)}</span>`)
    .join("");
}

function renderSettingsRecords(items, containerId, countId, emptyLabel, formatter) {
  const container = document.getElementById(containerId);
  const count = document.getElementById(countId);
  if (!container || !count) return;

  count.textContent = `${items.length} Item${items.length === 1 ? "" : "s"}`;
  if (!items.length) {
    container.innerHTML = `<span class="settings-empty">${emptyLabel}</span>`;
    return;
  }

  container.innerHTML = items.map(formatter).join("");
}

function renderAllSettings() {
  renderSettingsChips(settingsStore.rice, "riceSettingsList", "riceCount", "No rice types added yet");
  renderSettingsRecords(
    settingsStore.supplier,
    "supplierSettingsList",
    "supplierCount",
    "No suppliers added yet",
    (item) => `
      <article class="settings-record">
        <strong>${escapeHtml(item.name)}</strong>
        <span>Mob: ${escapeHtml(item.mobile)}</span>
        <span>PAN: ${escapeHtml(item.pan || "-")}</span>
        <span>Aadhar: ${escapeHtml(item.aadhar || "-")}</span>
        <p>${escapeHtml(item.address || "-")}</p>
      </article>
    `
  );
  renderSettingsRecords(
    settingsStore.driver,
    "driverSettingsList",
    "driverCount",
    "No drivers added yet",
    (item) => `
      <article class="settings-record compact">
        <strong>${escapeHtml(item.name)}</strong>
        <span>${escapeHtml(item.mobile)}</span>
      </article>
    `
  );
  renderSettingsRecords(
    settingsStore.company,
    "companySettingsList",
    "companyCount",
    "No companies added yet",
    (item) => `
      <article class="settings-record">
        <strong>${escapeHtml(item.name)}</strong>
        <span>Mob: ${escapeHtml(item.mobile)}</span>
        <p>${escapeHtml(item.address || "-")}</p>
      </article>
    `
  );
}

function initializeSettingsModule() {
  const riceForm = document.getElementById("riceSettingsForm");
  const supplierForm = document.getElementById("supplierSettingsForm");
  const driverForm = document.getElementById("driverSettingsForm");
  const companyForm = document.getElementById("companySettingsForm");
  const switchButtons = [...document.querySelectorAll("[data-settings-target]")];
  const panels = [...document.querySelectorAll("[data-settings-panel]")];

  if (!riceForm || !supplierForm || !driverForm || !companyForm) return;

  function activateSettingsPanel(target) {
    switchButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.settingsTarget === target);
    });

    panels.forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.settingsPanel === target);
    });
  }

  async function submitSetting(event, path, bodyBuilder) {
    event.preventDefault();
    try {
      await apiRequest(path, {
        method: "POST",
        body: bodyBuilder(),
      });
      event.target.reset();
      await loadSettingsData();
    } catch (error) {
      notifyError(error);
    }
  }

  switchButtons.forEach((button) => {
    button.addEventListener("click", () => activateSettingsPanel(button.dataset.settingsTarget));
  });

  activateSettingsPanel("rice");

  riceForm.addEventListener("submit", (event) => submitSetting(event, "/settings/rice-types", () => ({
    name: document.getElementById("riceNameInput").value.trim(),
  })));

  supplierForm.addEventListener("submit", (event) => submitSetting(event, "/settings/suppliers", () => ({
    name: document.getElementById("supplierNameInput").value.trim(),
    mobile: document.getElementById("supplierMobileInput").value.trim(),
    panNumber: document.getElementById("supplierPanInput").value.trim(),
    aadharNumber: document.getElementById("supplierAadharInput").value.trim(),
    address: document.getElementById("supplierAddressInput").value.trim(),
  })));

  driverForm.addEventListener("submit", (event) => submitSetting(event, "/settings/drivers", () => ({
    name: document.getElementById("driverNameInput").value.trim(),
    mobile: document.getElementById("driverMobileInput").value.trim(),
  })));

  companyForm.addEventListener("submit", (event) => submitSetting(event, "/settings/companies", () => ({
    name: document.getElementById("companyNameInput").value.trim(),
    address: document.getElementById("companyAddressInput").value.trim(),
    mobile: document.getElementById("companyMobileInput").value.trim(),
  })));

  window.refreshSettingsView = renderAllSettings;
  renderAllSettings();
}

function initializeReportsModule() {
  const viewButtons = [...document.querySelectorAll("[data-report-view]")];
  const searchInput = document.getElementById("reportsSearchInput");
  const partyFilter = document.getElementById("reportsPartyFilter");
  const dateFromInput = document.getElementById("reportsDateFrom");
  const dateToInput = document.getElementById("reportsDateTo");
  const clearFiltersButton = document.getElementById("reportsClearFiltersButton");
  const exportStatementButton = document.getElementById("reportsExportStatementButton");
  const listLabel = document.getElementById("reportsListLabel");
  const listCount = document.getElementById("reportsListCount");
  const cardGrid = document.getElementById("reportsCardGrid");
  const modalBackdrop = document.getElementById("reportsModalBackdrop");
  const modalClose = document.getElementById("reportsModalClose");
  const reportsPanel = document.querySelector('[data-view-panel="reports"]');

  if (!viewButtons.length || !searchInput || !partyFilter || !dateFromInput || !dateToInput || !clearFiltersButton || !cardGrid || !modalBackdrop || !modalClose || !reportsPanel) {
    return;
  }

  const detailRefs = {
    type: document.getElementById("reportDetailType"),
    name: document.getElementById("reportDetailName"),
    meta: document.getElementById("reportDetailMeta"),
    total: document.getElementById("reportDetailTotal"),
    info: document.getElementById("reportDetailInfo"),
    items: document.getElementById("reportItemsList"),
    itemsTotal: document.getElementById("reportItemsTotal"),
    printButton: document.getElementById("reportPrintButton"),
  };

  const printRefs = {
    singleBlock: document.getElementById("reportSinglePrintBlock"),
    title: document.getElementById("reportPrintTitle"),
    subtitle: document.getElementById("reportPrintSubtitle"),
    name: document.getElementById("reportPrintName"),
    id: document.getElementById("reportPrintId"),
    kind: document.getElementById("reportPrintKind"),
    date: document.getElementById("reportPrintDate"),
    summary: document.getElementById("reportPrintSummary"),
    summaryTableBody: document.getElementById("reportPrintSummaryTableBody"),
    itemsBody: document.getElementById("reportPrintItemsBody"),
    total: document.getElementById("reportPrintTotal"),
  };

  const statementRefs = {
    block: document.getElementById("reportStatementPrintBlock"),
    title: document.getElementById("statementPrintTitle"),
    subtitle: document.getElementById("statementPrintSubtitle"),
    name: document.getElementById("statementPrintName"),
    kind: document.getElementById("statementPrintKind"),
    period: document.getElementById("statementPrintPeriod"),
    totalBuy: document.getElementById("statementTotalCredit"),
    totalPaid: document.getElementById("statementTotalPaid"),
    totalPending: document.getElementById("statementTotalPending"),
    body: document.getElementById("statementPrintBody"),
    totalAmount: document.getElementById("statementPrintTotalAmount"),
    paymentsBody: document.getElementById("statementPaymentsPrintBody"),
    totalPayments: document.getElementById("statementPrintTotalPayments"),
  };

  let activeView = "farmers";
  let selectedReportId = null;

  function getViewLabel(view) {
    if (view === "farmers") return "Farmer Reports";
    if (view === "suppliers") return "Supplier Reports";
    return "Company Reports";
  }

  function getPartyPlaceholder(view) {
    if (view === "farmers") return "All Farmers";
    if (view === "suppliers") return "All Suppliers";
    return "All Companies";
  }

  function getActiveRecords() {
    return reportStore
      .filter((record) => record.category === activeView)
      .sort((left, right) => {
        const dateCompare = String(right.date || "").localeCompare(String(left.date || ""));
        if (dateCompare !== 0) return dateCompare;
        return String(right.slipNumber || "").localeCompare(String(left.slipNumber || ""));
      });
  }

  function isInDateRange(record) {
    if (dateFromInput.value && String(record.date || "") < dateFromInput.value) return false;
    if (dateToInput.value && String(record.date || "") > dateToInput.value) return false;
    return true;
  }

  function getFilteredReports() {
    const query = searchInput.value.trim().toLowerCase();
    const party = partyFilter.value;

    return getActiveRecords().filter((record) => {
      if (party && record.partyName !== party) return false;
      if (!isInDateRange(record)) return false;
      if (!query) return true;

      return [record.partyName, record.slipNumber, record.vehicleNumber, record.typeLabel, record.kindLabel]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }

  function toggleModal(open) {
    modalBackdrop.classList.toggle("hidden", !open);
    document.body.classList.toggle("reports-modal-open", open);
  }

  function closeModal() {
    selectedReportId = null;
    currentReportDetail = null;
    toggleModal(false);
  }

  function getEntryRateLabel(record, entry) {
    if (record.moduleKey === "home") {
      return `${formatKg(entry.weightPerBag)} / bag • ${formatMoney(entry.rate)} / Kg`;
    }
    return `${formatMoney(entry.rate)} / Kg`;
  }

  function buildReportPrintSummaryRows(record) {
    const finalAmount = parseNumber(record.purchaseTotal) - parseNumber(record.loadingDiscount);

    if (record.moduleKey === "home") {
      return [
        ["Farmer Name", record.partyName || "-"],
        ["Driver Name", record.driverName || "-"],
        ["Vehicle Number", record.vehicleNumber || "-"],
        ["Total Weight", formatKg(record.totalWeight)],
        ["Total Bags", String(record.totalBags || 0)],
        ["Purchase Total", formatMoney(record.purchaseTotal)],
        ["Advance Payment", formatMoney(record.advancePayment)],
        ["Final Payable", formatMoney(record.finalPayable)],
        ["Final Amount", formatMoney(finalAmount)],
      ];
    }

    return [
      [record.moduleKey === "godown" ? "Supplier Name" : "Company Name", record.partyName || "-"],
      ["Gross Weight", formatKg(record.grossWeight)],
      ["Dust Deduction", formatKg(record.dustDeduction)],
      ["Moisture Deduction", formatKg(record.moistureDeduction)],
      ["Final Weight", formatKg(record.finalWeight)],
      ["Net Weight", formatKg(record.netWeight)],
      ["Total Bags", String(record.totalBags || 0)],
      ["Average Weight", formatKg(record.averageWeight)],
      [record.moduleKey === "godown" ? "Purchase Total" : "Selling Total", formatMoney(record.purchaseTotal)],
      ["Loading Discount", formatMoney(record.loadingDiscount)],
      ["Advance Payment", formatMoney(record.advancePayment)],
      ["Final Payable", formatMoney(record.finalPayable)],
      ["Final Amount", formatMoney(finalAmount)],
    ];
  }

  function renderReportSummaryTable(record) {
    const rows = buildReportPrintSummaryRows(record);
    printRefs.summaryTableBody.innerHTML = rows
      .map(([label, value]) => `
        <tr>
          <th>${escapeHtml(label)}</th>
          <td>${escapeHtml(value)}</td>
        </tr>
      `)
      .join("");
  }

  function renderPartyOptions() {
    const currentValue = partyFilter.value;
    const parties = [...new Set(getActiveRecords().map((record) => record.partyName).filter(Boolean))].sort((left, right) => left.localeCompare(right));
    partyFilter.innerHTML = [`<option value="">${getPartyPlaceholder(activeView)}</option>`]
      .concat(parties.map((party) => `<option value="${escapeHtml(party)}">${escapeHtml(party)}</option>`))
      .join("");
    if (parties.includes(currentValue)) {
      partyFilter.value = currentValue;
    }
  }

  function renderModal(record) {
    detailRefs.type.textContent = record.typeLabel;
    detailRefs.name.textContent = record.partyName;
    detailRefs.meta.textContent = record.dateDisplay;
    detailRefs.total.textContent = formatMoney(record.totalAmount);

    detailRefs.info.innerHTML = record.infoRows.length
      ? record.infoRows
          .map((row) => `
            <tr>
              <th>${escapeHtml(row.label)}</th>
              <td>${escapeHtml(row.value)}</td>
            </tr>
          `)
          .join("")
      : `<tr><td colspan="2" class="reports-empty inline">No transaction details available.</td></tr>`;

    detailRefs.items.innerHTML = record.entries.length
      ? record.entries
          .map((entry) => `
            <tr>
              <td>${escapeHtml(entry.type || "-")}</td>
              <td>${escapeHtml(String(entry.bags || 0))}</td>
              <td>${formatKg(entry.weight)}</td>
              <td>${escapeHtml(getEntryRateLabel(record, entry))}</td>
              <td class="tally-amount-col">${formatMoney(entry.amount)}</td>
            </tr>
          `)
          .join("")
      : `<tr><td colspan="5" class="reports-empty inline">No line items recorded for this slip.</td></tr>`;

    detailRefs.itemsTotal.textContent = formatMoney(record.totalAmount);
  }

  async function openModal(reportId) {
    try {
      selectedReportId = reportId;
      const detail = await apiRequest(`/reports/${reportId}`);
      currentReportDetail = normalizeSlipDetail(detail);
      renderModal(currentReportDetail);
      toggleModal(true);
    } catch (error) {
      notifyError(error);
    }
  }

  function renderCards() {
    renderPartyOptions();
    const records = getFilteredReports();
    listLabel.textContent = getViewLabel(activeView);
    listCount.textContent = `${records.length} Result${records.length === 1 ? "" : "s"}`;

    if (!records.length) {
      cardGrid.innerHTML = `<div class="reports-empty">No saved reports found for these filters.</div>`;
      return;
    }

    cardGrid.innerHTML = records
      .map((record) => `
        <button class="reports-record-card" type="button" data-report-id="${escapeHtml(record.id)}">
          <div class="reports-card-top">
            <div>
              <strong>${escapeHtml(record.partyName)}</strong>
              <span class="reports-card-tag">${escapeHtml(record.typeLabel)}</span>
            </div>
            <span>${escapeHtml(record.slipNumber)}</span>
          </div>
          <div class="reports-card-meta">
            <span>${escapeHtml(record.dateDisplay)}</span>
            <span>${escapeHtml(record.vehicleNumber || "-")}</span>
          </div>
          <div class="reports-card-grid">
            <div>
              <span>Total Weight</span>
              <strong>${formatKg(record.totalWeight)}</strong>
            </div>
            <div>
              <span>Total Amount</span>
              <strong>${formatMoney(record.totalAmount)}</strong>
            </div>
          </div>
          <span class="reports-card-link">Open details and download PDF</span>
        </button>
      `)
      .join("");

    cardGrid.querySelectorAll("[data-report-id]").forEach((button) => {
      button.addEventListener("click", () => openModal(button.dataset.reportId));
    });
  }

  function runPrintJob(title) {
    viewPanels.forEach((panel) => panel.classList.remove("print-active"));
    reportsPanel.classList.add("print-active");
    const previousTitle = document.title;
    const restoreTitle = () => {
      document.title = previousTitle;
      window.removeEventListener("afterprint", restoreTitle);
    };
    document.title = title;
    window.addEventListener("afterprint", restoreTitle);
    window.print();
  }

  function renderSinglePrint(record) {
    const finalAmount = parseNumber(record.purchaseTotal) - parseNumber(record.loadingDiscount);
    printRefs.singleBlock.classList.remove("hidden");
    printRefs.title.textContent = record.typeLabel;
    printRefs.subtitle.textContent = `${record.kindLabel} slip report`;
    printRefs.name.textContent = record.partyName;
    printRefs.id.textContent = record.id || "-";
    printRefs.kind.textContent = record.typeLabel;
    printRefs.date.textContent = record.dateDisplay;
    printRefs.summary.textContent = record.moistureNote || "-";
    renderReportSummaryTable(record);
    printRefs.total.textContent = formatMoney(finalAmount);
    printRefs.itemsBody.innerHTML = record.entries.length
      ? record.entries
          .map((entry) => `
            <tr>
              <td>${escapeHtml(entry.type || "-")}</td>
              <td>${escapeHtml(String(entry.bags || 0))}</td>
              <td>${formatKg(entry.weight)}</td>
              <td>${escapeHtml(getEntryRateLabel(record, entry))}</td>
              <td>${formatMoney(entry.amount)}</td>
            </tr>
          `)
          .join("")
      : `<tr><td colspan="5">No materials recorded</td></tr>`;
  }

  function downloadSingleReport() {
    if (!currentReportDetail) return;
    if (statementRefs.block) statementRefs.block.classList.add("hidden");
    renderSinglePrint(currentReportDetail);
    toggleModal(false);
    runPrintJob(`${currentReportDetail.partyName} - ${currentReportDetail.slipNumber}`);
  }

  function getPartyKindLabel(view) {
    if (view === "farmers") return "Farmer";
    if (view === "suppliers") return "Supplier";
    return "Company";
  }

  function renderStatementPrint(data, meta) {
    if (printRefs.singleBlock) printRefs.singleBlock.classList.add("hidden");
    statementRefs.block.classList.remove("hidden");

    statementRefs.title.textContent = "MAA LAXMI TRADERS";
    statementRefs.subtitle.textContent = `${getPartyKindLabel(meta.partyView)} Ledger Report`;
    statementRefs.name.textContent = meta.partyName;
    statementRefs.kind.textContent = getPartyKindLabel(meta.partyView);
    statementRefs.period.textContent =
      meta.dateFrom || meta.dateTo
        ? `${meta.dateFrom ? formatDateForDisplay(meta.dateFrom) : "Start"} to ${meta.dateTo ? formatDateForDisplay(meta.dateTo) : "Today"}`
        : "All Time";

    statementRefs.totalBuy.textContent = formatMoney(data.totals.totalBuyAmount);
    statementRefs.totalPaid.textContent = formatMoney(data.totals.totalPaidAmount);
    statementRefs.totalPending.textContent = formatMoney(data.totals.totalPendingAmount);

    const rows = data.rows || [];
    statementRefs.body.innerHTML = rows.length
      ? rows
          .map(
            (row) => `
            <tr>
              <td>${row.slNo}</td>
              <td>${escapeHtml(formatDateForDisplay(row.date))}</td>
              <td>${escapeHtml(row.reference || "-")}</td>
              <td>${escapeHtml(row.particulars || "-")}</td>
              <td>${formatMoney(row.amount)}</td>
            </tr>
          `
          )
          .join("")
      : `<tr><td colspan="5">No transactions found for the selected filters.</td></tr>`;
    statementRefs.totalAmount.textContent = formatMoney(
      rows.reduce((sum, row) => sum + parseNumber(row.amount), 0)
    );

    const payments = data.payments || [];
    statementRefs.paymentsBody.innerHTML = payments.length
      ? payments
          .map(
            (payment) => `
            <tr>
              <td>${payment.slNo}</td>
              <td>${escapeHtml(formatDateForDisplay(payment.date))}</td>
              <td>${escapeHtml(payment.mode || "-")}</td>
              <td>${escapeHtml(payment.reference || "-")}</td>
              <td>${formatMoney(payment.amount)}</td>
            </tr>
          `
          )
          .join("")
      : `<tr><td colspan="5">No payments recorded for the selected filters.</td></tr>`;
    statementRefs.totalPayments.textContent = formatMoney(
      payments.reduce((sum, payment) => sum + parseNumber(payment.amount), 0)
    );
  }

  async function downloadPartyStatement() {
    const partyName = partyFilter.value;
    if (!partyName) {
      notifyError(new Error("Select a party from the filter above to export a statement."));
      return;
    }

    try {
      const data = await apiRequest("/reports/party-statement", {
        query: {
          partyView: activeView,
          partyName,
          dateFrom: dateFromInput.value,
          dateTo: dateToInput.value,
        },
      });
      renderStatementPrint(data, {
        partyName,
        partyView: activeView,
        dateFrom: dateFromInput.value,
        dateTo: dateToInput.value,
      });
      closeModal();
      runPrintJob(`${partyName} - Account Statement`);
    } catch (error) {
      notifyError(error);
    }
  }

  function clearFilters() {
    searchInput.value = "";
    partyFilter.value = "";
    dateFromInput.value = "";
    dateToInput.value = "";
    closeModal();
    renderCards();
  }

  function switchView(view) {
    activeView = view;
    closeModal();
    viewButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.reportView === view);
    });
    renderCards();
  }

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.reportView));
  });
  searchInput.addEventListener("input", renderCards);
  partyFilter.addEventListener("change", renderCards);
  dateFromInput.addEventListener("change", renderCards);
  dateToInput.addEventListener("change", renderCards);
  clearFiltersButton.addEventListener("click", clearFilters);
  if (exportStatementButton) exportStatementButton.addEventListener("click", downloadPartyStatement);
  detailRefs.printButton.addEventListener("click", downloadSingleReport);
  modalClose.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", (event) => {
    if (event.target === modalBackdrop) closeModal();
  });

  window.refreshReportsView = renderCards;
  renderCards();
}

function initializePaymentsModule() {
  const viewButtons = [...document.querySelectorAll("[data-payment-view]")];
  const searchInput = document.getElementById("paymentsSearchInput");
  const listLabel = document.getElementById("paymentsListLabel");
  const listCount = document.getElementById("paymentsListCount");
  const cardGrid = document.getElementById("paymentsCardGrid");
  const modalBackdrop = document.getElementById("paymentsModalBackdrop");
  const modalClose = document.getElementById("paymentsModalClose");
  const paymentForm = document.getElementById("paymentEntryForm");

  if (!viewButtons.length || !searchInput || !cardGrid || !modalBackdrop || !modalClose || !paymentForm) return;

  const detailRefs = {
    type: document.getElementById("paymentDetailType"),
    name: document.getElementById("paymentDetailName"),
    meta: document.getElementById("paymentDetailMeta"),
    balance: document.getElementById("paymentDetailBalance"),
    orderCount: document.getElementById("paymentDetailOrderCount"),
    openCount: document.getElementById("paymentDetailOpenCount"),
    total: document.getElementById("paymentDetailTotal"),
    paid: document.getElementById("paymentDetailPaid"),
    info: document.getElementById("paymentDetailInfo"),
    history: document.getElementById("paymentHistoryList"),
    allocations: document.getElementById("paymentAllocationList"),
  };

  let activeView = "farmers";
  let selectedPartyName = null;

  function getViewLabel(view) {
    if (view === "farmers") return "Farmer Ledgers";
    if (view === "suppliers") return "Supplier Ledgers";
    return "Company Ledgers";
  }

  function getFilteredOrders() {
    const query = searchInput.value.trim().toLowerCase();
    return paymentsStore[activeView].filter((order) => {
      if (!query) return true;
      return [order.partyName, order.lastPaymentDate]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }

  function toggleModal(open) {
    modalBackdrop.classList.toggle("hidden", !open);
    document.body.classList.toggle("payments-modal-open", open);
  }

  function closeModal() {
    toggleModal(false);
    selectedPartyName = null;
    currentPaymentDetail = null;
  }

  function renderModal(order) {
    detailRefs.type.textContent = order.typeLabel;
    detailRefs.name.textContent = order.partyName;
    detailRefs.meta.textContent = `${order.orderCount} orders • ${order.lastOrderDate ? formatDateForDisplay(order.lastOrderDate) : "No order date"}`;
    detailRefs.balance.textContent = formatMoney(order.balanceAmount);
    detailRefs.orderCount.textContent = String(order.orderCount || 0);
    detailRefs.openCount.textContent = String(order.openOrderCount || 0);
    detailRefs.total.textContent = formatMoney(order.totalAmount);
    detailRefs.paid.textContent = formatMoney(order.paidAmount);

    detailRefs.info.innerHTML = Object.entries(order.details)
      .map(([label, value]) => `
        <div class="payments-info-row">
          <span>${escapeHtml(label)}</span>
          <strong>${escapeHtml(value)}</strong>
        </div>
      `)
      .join("");

    detailRefs.history.innerHTML = order.payments.length
      ? order.payments
          .map((payment) => `
            <article class="payments-history-item">
              <div class="payments-history-top">
                <strong>${formatMoney(payment.amount)}</strong>
                <span>${escapeHtml(payment.mode)}</span>
              </div>
              <div class="payments-history-meta">
                <span>${formatDateForDisplay(payment.date)}</span>
                <span>${escapeHtml(payment.reference || "No reference")}</span>
              </div>
              <div class="payments-history-meta">
                <span>${escapeHtml(payment.bankAccount || "No bank account")}</span>
                <span>Allocated ${formatMoney(payment.allocatedAmount || 0)}</span>
              </div>
              <p>${escapeHtml(payment.remark || "No remark added")}</p>
            </article>
          `)
          .join("")
      : `<div class="payments-empty inline">No payments recorded yet.</div>`;

    detailRefs.allocations.innerHTML = order.slips.length
      ? order.slips
          .map((slip) => `
            <article class="payments-history-item">
              <div class="payments-history-top">
                <strong>${escapeHtml(slip.slipNumber)}</strong>
                <span>${escapeHtml(formatDateForDisplay(slip.entryDate))}</span>
              </div>
              <div class="payments-history-meta">
                <span>${escapeHtml(slip.vehicleNumber || "No vehicle")}</span>
                <span>${escapeHtml(String(slip.totalBags || 0))} bags • ${formatKg(slip.netWeight || 0)}</span>
              </div>
              <div class="payments-card-grid">
                <div>
                  <span>Total</span>
                  <strong>${formatMoney(slip.totalAmount)}</strong>
                </div>
                <div>
                  <span>Paid</span>
                  <strong>${formatMoney(slip.paidAmount)}</strong>
                </div>
                <div>
                  <span>Pending</span>
                  <strong>${formatMoney(slip.balanceAmount)}</strong>
                </div>
              </div>
            </article>
          `)
          .join("")
      : `<div class="payments-empty inline">No orders found for this party.</div>`;
  }

  async function loadPaymentOrders() {
    const response = await apiRequest("/payments", {
      query: {
        partyView: activeView,
        search: searchInput.value.trim(),
      },
    });
    const items = (response.items || []).map(normalizePaymentListItem);
    setStoreItems(paymentsStore[activeView], items);
  }

  async function openModal(partyName) {
    try {
      selectedPartyName = partyName;
      const detail = await apiRequest("/payments/detail", {
        query: {
          partyView: activeView,
          partyName,
        },
      });
      currentPaymentDetail = normalizePaymentDetail(detail);
      renderModal(currentPaymentDetail);
      document.getElementById("paymentEntryDate").value = getLocalDateString();
      toggleModal(true);
    } catch (error) {
      notifyError(error);
    }
  }

  async function renderCards() {
    try {
      await loadPaymentOrders();
      const orders = getFilteredOrders();
      listLabel.textContent = getViewLabel(activeView);
      listCount.textContent = `${orders.length} Result${orders.length === 1 ? "" : "s"}`;

      if (!orders.length) {
        cardGrid.innerHTML = `<div class="payments-empty">No matching records found.</div>`;
        return;
      }

      cardGrid.innerHTML = orders
        .map((order) => `
          <button class="payments-record-card" type="button" data-payment-party="${escapeHtml(order.partyName)}">
            <div class="payments-card-top">
              <strong>${escapeHtml(order.partyName)}</strong>
              <span>${escapeHtml(String(order.orderCount || 0))} orders</span>
            </div>
            <div class="payments-card-meta">
              <span>${order.lastOrderDate ? formatDateForDisplay(order.lastOrderDate) : "No order date"}</span>
              <span>${order.lastPaymentDate ? `Last payment ${formatDateForDisplay(order.lastPaymentDate)}` : "No payment yet"}</span>
            </div>
            <div class="payments-card-grid">
              <div>
                <span>Total</span>
                <strong>${formatMoney(order.totalAmount)}</strong>
              </div>
              <div>
                <span>Paid</span>
                <strong>${formatMoney(order.paidAmount)}</strong>
              </div>
              <div>
                <span>Pending</span>
                <strong>${formatMoney(order.balanceAmount)}</strong>
              </div>
              <div>
                <span>Open Orders</span>
                <strong>${escapeHtml(String(order.openOrderCount || 0))}</strong>
              </div>
            </div>
          </button>
        `)
        .join("");

      cardGrid.querySelectorAll("[data-payment-party]").forEach((button) => {
        button.addEventListener("click", () => openModal(button.dataset.paymentParty));
      });
    } catch (error) {
      notifyError(error);
    }
  }

  function switchView(view) {
    activeView = view;
    selectedPartyName = null;
    viewButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.paymentView === view);
    });
    renderCards();
  }

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      closeModal();
      switchView(button.dataset.paymentView);
    });
  });

  searchInput.addEventListener("input", () => {
    closeModal();
    renderCards();
  });

  modalClose.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", (event) => {
    if (event.target === modalBackdrop) {
      closeModal();
    }
  });

  paymentForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!selectedPartyName) return;

    const date = document.getElementById("paymentEntryDate").value;
    const amount = parseNumber(document.getElementById("paymentEntryAmount").value);
    const bankAccount = document.getElementById("paymentEntryBankAccount").value.trim();
    const mode = document.getElementById("paymentEntryMode").value;
    const reference = document.getElementById("paymentEntryReference").value.trim();
    const remark = document.getElementById("paymentEntryRemark").value.trim();

    if (!date || amount <= 0 || !bankAccount || !mode || !reference) return;

    try {
      const detail = await apiRequest("/payments", {
        method: "POST",
        body: {
          partyView: activeView,
          partyName: selectedPartyName,
          paymentDate: date,
          amount,
          bankAccount,
          mode,
          referenceCode: reference,
          remark,
        },
      });
      currentPaymentDetail = normalizePaymentDetail(detail);
      paymentForm.reset();
      document.getElementById("paymentEntryDate").value = getLocalDateString();
      await Promise.all([renderCards(), loadDashboardData()]);
      renderModal(currentPaymentDetail);
    } catch (error) {
      notifyError(error);
    }
  });

  window.refreshPaymentsView = renderCards;
  switchView(activeView);
}

window.addEventListener("afterprint", () => {
  viewPanels.forEach((panel) => panel.classList.remove("print-active"));
});

initializeSettingsModule();
initializeReportsModule();
initializePaymentsModule();
activateView("dashboard");

(async function initializeAppData() {
  try {
    await Promise.all([
      loadSettingsData(),
      loadReportsData(),
      loadDashboardData(),
    ]);
    if (typeof window.refreshPaymentsView === "function") {
      await window.refreshPaymentsView();
    }
  } catch (error) {
    notifyError(error);
  }
})();
