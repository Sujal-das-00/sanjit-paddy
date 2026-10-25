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
    eyebrow: "Overview",
    title: "Dashboard",
    copy: "Today's purchase and sales activity, pending balances and the latest slips at a glance.",
  },
  "godown-entry": {
    eyebrow: "Purchase",
    title: "Godown Purchase Entry",
    copy: "Record paddy received at the godown from a supplier, then save or print the bill.",
  },
  "home-entry": {
    eyebrow: "Purchase",
    title: "Home Purchase Entry",
    copy: "Record paddy bought directly from a farmer.",
  },
  selling: {
    eyebrow: "Sales",
    title: "Sales Entry",
    copy: "Record paddy sold and dispatched to a company.",
  },
  reports: {
    eyebrow: "Records",
    title: "Reports",
    copy: "Purchase and sales records kept separately. Open any slip to view, print, edit or export a party statement.",
  },
  payments: {
    eyebrow: "Records",
    title: "Payments",
    copy: "Payables to farmers and suppliers, and receivables from companies.",
  },
  settings: {
    eyebrow: "System",
    title: "Settings",
    copy: "Master data, staff accounts and permissions.",
  },
};

// Staff see a narrower version of some screens, so they get their own wording.
const staffViewMeta = {
  reports: {
    eyebrow: "My Work",
    title: "My Entries",
    copy: "Godown entries you have recorded. Open one to view or print its bill.",
  },
  settings: {
    eyebrow: "Account",
    title: "My Account",
    copy: "Change your password.",
  },
};

const session = {
  user: null,
  permissions: null,
};

function isAdmin() {
  return session.permissions?.role === "admin";
}

function canAccessView(viewName) {
  return Boolean(session.permissions?.views?.includes(viewName));
}

function canEditEntries() {
  return Boolean(session.permissions?.canEditEntries);
}

const app = document.getElementById("dashboardApp");
const sidebar = document.getElementById("sidebar");
const sidebarToggle = document.getElementById("sidebarToggle");
const navButtons = [...document.querySelectorAll(".nav-item")];
const viewPanels = [...document.querySelectorAll("[data-view-panel]")];
const pageEyebrow = document.getElementById("pageEyebrow");
const pageTitle = document.getElementById("pageTitle");
const pageCopy = document.getElementById("pageCopy");
const dashboardPurchaseBody = document.getElementById("dashboardPurchaseBody");
const dashboardSalesBody = document.getElementById("dashboardSalesBody");
const backendStatusOverlay = document.getElementById("backendStatusOverlay");
const backendStatusTitle = document.getElementById("backendStatusTitle");
const backendStatusMessage = document.getElementById("backendStatusMessage");
const backendRetryButton = document.getElementById("backendRetryButton");
const backendStatusPill = document.getElementById("backendStatusPill");
const backendStatusSpinner = document.getElementById("backendStatusSpinner");
const loginOverlay = document.getElementById("loginOverlay");
const loginForm = document.getElementById("loginForm");
const loginUsernameInput = document.getElementById("loginUsernameInput");
const loginPasswordInput = document.getElementById("loginPasswordInput");
const loginError = document.getElementById("loginError");
const loginSubmitButton = document.getElementById("loginSubmitButton");
const logoutButton = document.getElementById("logoutButton");
const API_BASE = window.APP_CONFIG?.API_BASE_URL || "/api";
let currentReportDetail = null;
let currentPaymentDetail = null;
let backendConnected = false;

function buildApiUrl(path, query = {}) {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

async function apiRequest(path, options = {}) {
  const { method = "GET", query, body, timeoutMs = 20000 } = options;
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), timeoutMs);

  let response;
  try {
    response = await fetch(buildApiUrl(path, query), {
      method,
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
      signal: controller.signal,
    });
  } catch (error) {
    window.clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      const timeoutError = new Error("Request timed out. Please try again.");
      timeoutError.status = 408;
      throw timeoutError;
    }
    throw error;
  }

  window.clearTimeout(timeoutId);
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.message || `Request failed with status ${response.status}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  return payload;
}

function setStoreItems(target, items) {
  target.splice(0, target.length, ...items);
}


function setBackendStatus(state, message) {
  backendConnected = state === "connected";
  if (backendStatusPill) {
    backendStatusPill.classList.remove("loading", "connected", "disconnected");
    backendStatusPill.classList.add(state);
    backendStatusPill.textContent =
      state === "connected" ? "Backend connected" : state === "disconnected" ? "Backend disconnected" : "Checking backend...";
  }

  if (!backendStatusOverlay || !backendStatusTitle || !backendStatusMessage || !backendRetryButton || !backendStatusSpinner) {
    return;
  }

  if (state === "connected") {
    backendStatusOverlay.classList.add("hidden");
    backendRetryButton.classList.add("hidden");
    backendStatusSpinner.classList.remove("hidden");
    return;
  }

  backendStatusOverlay.classList.remove("hidden");
  backendStatusTitle.textContent = state === "disconnected" ? "Backend not connected" : "Connecting to backend";
  backendStatusMessage.textContent = message || (state === "disconnected"
    ? "Backend is not reachable. Fresh data could not be loaded, so stale screen data is hidden until the connection returns."
    : "Loading fresh data from the backend. The app will open after the connection is confirmed.");
  backendRetryButton.classList.toggle("hidden", state !== "disconnected");
  backendStatusSpinner.classList.toggle("hidden", state === "disconnected");
}

function showLoginOverlay() {
  loginOverlay?.classList.remove("hidden");
  loginUsernameInput?.focus();
}

function hideLoginOverlay() {
  loginOverlay?.classList.add("hidden");
  if (loginForm) loginForm.reset();
  loginError?.classList.add("hidden");
}

function initializeAuthModule() {
  if (!loginForm) return;

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    loginError?.classList.add("hidden");
    loginSubmitButton.disabled = true;
    try {
      const response = await apiRequest("/auth/login", {
        method: "POST",
        body: {
          username: loginUsernameInput.value,
          password: loginPasswordInput.value,
        },
      });
      applySession(response);
      hideLoginOverlay();
      await initializeAppData();
    } catch (error) {
      if (loginError) {
        loginError.textContent = error.message || "Invalid username or password.";
        loginError.classList.remove("hidden");
      }
    } finally {
      loginSubmitButton.disabled = false;
    }
  });

  logoutButton?.addEventListener("click", async () => {
    try {
      await apiRequest("/auth/logout", { method: "POST" });
    } catch (error) {
      console.error(error);
    }
    // Reload so nothing from this user's session stays in memory for the next login.
    window.location.reload();
  });
}

function getUserDisplayName(user) {
  return user?.fullName || user?.username || "-";
}

function applySession(payload) {
  session.user = payload?.user || null;
  session.permissions = payload?.permissions || null;
  applyRoleUI();
}

function applyRoleUI() {
  const admin = isAdmin();
  document.body.classList.toggle("role-admin", admin);
  document.body.classList.toggle("role-staff", Boolean(session.user) && !admin);

  navButtons.forEach((button) => {
    button.classList.toggle("hidden", !canAccessView(button.dataset.view));
  });
  document.querySelectorAll(".nav-group").forEach((group) => {
    const hasVisibleItem = [...group.querySelectorAll(".nav-item")].some((item) => !item.classList.contains("hidden"));
    group.classList.toggle("hidden", !hasVisibleItem);
  });
  document.querySelectorAll("[data-admin-only]").forEach((element) => {
    element.classList.toggle("hidden", !admin);
  });

  const navLabels = {
    reports: admin ? "Reports" : "My Entries",
    settings: admin ? "Settings" : "My Account",
  };
  Object.entries(navLabels).forEach(([view, label]) => {
    const labelElement = document.querySelector(`.nav-item[data-view="${view}"] .nav-label`);
    if (labelElement) labelElement.textContent = label;
  });

  const name = getUserDisplayName(session.user);
  const nameElement = document.getElementById("sidebarUserName");
  const avatarElement = document.getElementById("sidebarUserAvatar");
  const roleElement = document.getElementById("sidebarUserRole");
  if (nameElement) nameElement.textContent = name;
  if (avatarElement) avatarElement.textContent = name.charAt(0).toUpperCase() || "?";
  if (roleElement) {
    roleElement.textContent = admin ? "Admin" : "Staff";
    roleElement.classList.toggle("admin", admin);
    roleElement.classList.toggle("staff", !admin);
  }

  if (typeof window.applyReportsRole === "function") window.applyReportsRole();
  if (typeof window.applySettingsRole === "function") window.applySettingsRole();

  const activeView = navButtons.find((button) => button.classList.contains("active"))?.dataset.view;
  activateView(canAccessView(activeView) ? activeView : getDefaultView());
}

function getDefaultView() {
  return isAdmin() ? "dashboard" : "godown-entry";
}

async function bootstrapSession() {
  try {
    const response = await apiRequest("/auth/me");
    applySession(response);
    hideLoginOverlay();
    await initializeAppData();
  } catch (error) {
    if (error.status === 401) {
      setBackendStatus("connected");
      showLoginOverlay();
    } else {
      setBackendStatus("disconnected", error.message || "Backend is not reachable.");
    }
  }
}

function parseAccountNumbers(value) {
  return String(value || "")
    .split(/\n|,/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function renderSupplierAccountOptions(accounts = []) {
  const select = document.getElementById("paymentEntrySupplierAccount");
  if (!select) return;
  const currentValue = select.value;
  select.innerHTML = [`<option value="">Select supplier account</option>`]
    .concat(accounts.map((item) => `<option>${escapeHtml(item)}</option>`))
    .join("");
  if (accounts.includes(currentValue)) {
    select.value = currentValue;
  }
  refreshSearchableSelect(select);
}

function getSelectPlaceholder(select) {
  return [...select.options].find((option) => option.value === "")?.textContent || "Select option";
}

function closeAllSearchableSelects(exceptSelect = null) {
  document.querySelectorAll('[data-searchable-select="true"]').forEach((select) => {
    if (select === exceptSelect || !select._searchableRefs) return;
    select._searchableRefs.wrapper.classList.remove("open");
    select._searchableRefs.panel.classList.add("hidden");
    select._searchableRefs.search.value = "";
  });
}

function renderSearchableSelectOptions(select) {
  if (!select?._searchableRefs) return;
  const { options, search } = select._searchableRefs;
  const query = search.value.trim().toLowerCase();
  const records = [...select.options]
    .filter((option) => !option.disabled)
    .filter((option) => !query || option.textContent.toLowerCase().includes(query));

  options.innerHTML = records.length
    ? records
        .map((option) => `
          <button
            class="search-select-option${select.value === option.value ? " active" : ""}${option.value === "" ? " placeholder" : ""}"
            type="button"
            data-option-value="${escapeHtml(option.value)}"
          >
            ${escapeHtml(option.textContent)}
          </button>
        `)
        .join("")
    : `<div class="search-select-empty">No matching option found.</div>`;

  options.querySelectorAll("[data-option-value]").forEach((button) => {
    button.addEventListener("click", () => {
      select.value = button.dataset.optionValue;
      refreshSearchableSelect(select);
      closeAllSearchableSelects();
      select.dispatchEvent(new Event("change", { bubbles: true }));
      select.dispatchEvent(new Event("input", { bubbles: true }));
    });
  });
}

function refreshSearchableSelect(select) {
  if (!select || select.dataset.searchableSelect !== "true") return;
  if (!select._searchableRefs) {
    ensureSearchableSelect(select);
    return;
  }

  const selectedOption = [...select.options].find((option) => option.value === select.value);
  const label = selectedOption?.textContent || getSelectPlaceholder(select);
  select._searchableRefs.label.textContent = label;
  select._searchableRefs.trigger.classList.toggle("placeholder", !select.value);
  renderSearchableSelectOptions(select);
}

function ensureSearchableSelect(select) {
  if (!select || select.dataset.searchableSelect !== "true") return;
  if (select._searchableRefs) {
    refreshSearchableSelect(select);
    return;
  }

  select.classList.add("native-search-select");

  const wrapper = document.createElement("div");
  wrapper.className = "search-select";
  wrapper.innerHTML = `
    <button class="search-select-trigger placeholder" type="button">
      <span class="search-select-trigger-label"></span>
      <span class="search-select-trigger-icon">▾</span>
    </button>
    <div class="search-select-panel hidden">
      <input class="search-select-input" type="search" placeholder="Search option" />
      <div class="search-select-options"></div>
    </div>
  `;

  select.insertAdjacentElement("afterend", wrapper);
  const refs = {
    wrapper,
    trigger: wrapper.querySelector(".search-select-trigger"),
    label: wrapper.querySelector(".search-select-trigger-label"),
    panel: wrapper.querySelector(".search-select-panel"),
    search: wrapper.querySelector(".search-select-input"),
    options: wrapper.querySelector(".search-select-options"),
  };
  select._searchableRefs = refs;

  refs.trigger.addEventListener("click", () => {
    const open = refs.wrapper.classList.contains("open");
    closeAllSearchableSelects(open ? null : select);
    refs.wrapper.classList.toggle("open", !open);
    refs.panel.classList.toggle("hidden", open);
    refs.search.value = "";
    renderSearchableSelectOptions(select);
    if (!open) refs.search.focus();
  });

  refs.search.addEventListener("input", () => {
    renderSearchableSelectOptions(select);
  });

  refs.search.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeAllSearchableSelects();
      refs.trigger.focus();
    }
  });

  select.addEventListener("change", () => refreshSearchableSelect(select));
  refreshSearchableSelect(select);
}

function getEntryTypeValue(row) {
  const select = row.querySelector(".entry-type");
  const otherInput = row.querySelector(".entry-type-other");
  if (!select) return "";
  if (select.value === "__other__") {
    return otherInput?.value.trim() || "";
  }
  return select.value || "";
}

function syncEntryTypeOtherField(row) {
  const select = row.querySelector(".entry-type");
  if (!select || select.dataset.allowOthers !== "true") return;

  let container = select.parentElement;
  if (!container.classList.contains("entry-type-stack")) {
    container = document.createElement("div");
    container.className = "entry-type-stack";
    select.parentNode.insertBefore(container, select);
    container.appendChild(select);
  }

  let otherInput = container.querySelector(".entry-type-other");
  if (!otherInput) {
    otherInput = document.createElement("input");
    otherInput.type = "text";
    otherInput.className = "entry-type-other hidden";
    otherInput.placeholder = "Enter paddy name";
    container.appendChild(otherInput);
  }

  const show = select.value === "__other__";
  otherInput.classList.toggle("hidden", !show);
  if (!show) {
    otherInput.value = "";
  }
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
  refreshSearchableSelect(select);
}

function refreshRiceTypeOptions() {
  document.querySelectorAll(".entry-type").forEach((select) => {
    const row = select.closest("tr");
    const currentValue = getEntryTypeValue(row);
    select.innerHTML = buildTypeOptions();
    if (currentValue && !paddyTypes.includes(currentValue)) {
      select.value = "__other__";
      syncEntryTypeOtherField(row);
      const otherInput = row.querySelector(".entry-type-other");
      if (otherInput) otherInput.value = currentValue;
    } else {
      select.value = paddyTypes.includes(currentValue) ? currentValue : "";
      syncEntryTypeOtherField(row);
    }
    refreshSearchableSelect(select);
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
  if (type === "rice") return { id: item.id, name: item.name };
  if (type === "supplier") {
    return {
      id: item.id,
      name: item.name,
      mobile: item.mobile || "",
      pan: item.pan_number || "",
      aadhar: item.aadhar_number || "",
      address: item.address || "",
      accountNumbers: item.account_numbers || [],
    };
  }
  if (type === "driver") {
    return {
      id: item.id,
      name: item.name,
      mobile: item.mobile || "",
    };
  }
  return {
    id: item.id,
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
    createdByName: item.createdByName || "",
  };
}

function normalizeSlipDetail(item) {
  const moduleKey = item.module_type || item.moduleType;
  const entries = (item.items || []).map((entry) => {
    const weight = parseNumber(entry.total_weight || entry.totalWeight);
    const moistureDeduction = parseNumber(entry.moisture_deduction || entry.moistureDeduction);
    const netWeight = parseNumber(entry.net_weight || entry.netWeight || Math.max(0, weight - moistureDeduction));

    return {
      type: entry.rice_type_name_snapshot || entry.riceTypeNameSnapshot || "-",
      bags: parseNumber(entry.bag_count || entry.bagCount),
      weightPerBag: parseNumber(entry.weight_per_bag || entry.weightPerBag),
      weight,
      moisturePer1000: parseNumber(entry.moisture_per_1000 || entry.moisturePer1000),
      moistureDeduction,
      netWeight,
      rate: parseNumber(entry.rate_per_kg || entry.ratePerKg),
      amount: parseNumber(entry.total_amount || entry.totalAmount),
    };
  });

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
    createdByName: item.created_by_name || "",
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
    supplierAccountNumbers: item.supplierAccountNumbers || item.supplier_account_numbers || [],
    details: buildPaymentDetails({
      ...base,
      advanceAmount,
    }),
    payments: (item.payments || []).map((payment) => ({
      id: payment.id != null ? String(payment.id) : "",
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
  // Staff only fill the godown form, so they only receive rice types and supplier names.
  const emptyResponse = Promise.resolve({ items: [] });
  const [riceResponse, supplierResponse, driverResponse, companyResponse] = await Promise.all([
    apiRequest("/settings/rice-types"),
    apiRequest("/settings/suppliers"),
    isAdmin() ? apiRequest("/settings/drivers") : emptyResponse,
    isAdmin() ? apiRequest("/settings/companies") : emptyResponse,
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

function renderDashboardRows(body, items, emptyLabel) {
  if (!body) return;
  body.innerHTML = items.length
    ? items
        .map((item) => {
          const status = formatStatusChip(item.status);
          return `
            <tr>
              <td>${escapeHtml(formatDateForDisplay(item.entryDate))}</td>
              <td class="cell-strong">${escapeHtml(item.slipNumber)}</td>
              <td>${escapeHtml(formatModuleLabel(item.moduleType))}</td>
              <td>${escapeHtml(item.partyName || "-")}</td>
              <td class="num">${escapeHtml(String(item.totalBags || 0))}</td>
              <td class="num cell-strong">${formatMoney(item.amount || 0)}</td>
              <td><span class="status-chip ${status.className}">${status.label}</span></td>
            </tr>
          `;
        })
        .join("")
    : `<tr><td colspan="7" class="table-empty">${emptyLabel}</td></tr>`;
}

async function loadDashboardData() {
  if (!canAccessView("dashboard")) return;

  const [summary, recent] = await Promise.all([
    apiRequest("/dashboard/summary"),
    apiRequest("/dashboard/recent-transactions", { query: { limit: 40 } }),
  ]);

  const setText = (id, value) => {
    const element = document.getElementById(id);
    if (element) element.textContent = value;
  };
  const partyCountLabel = (count, singular, plural) => `${count} ${count === 1 ? singular : plural} pending`;

  setText("statTodaysPurchases", formatMoney(summary.todaysPurchases || 0));
  setText("statTodaysSales", formatMoney(summary.todaysSales || 0));
  setText("statTotalBags", String(summary.totalBagsPurchased || 0));
  setText("statPayableAmount", formatMoney(summary.payableAmount || 0));
  setText("statPayableMeta", partyCountLabel(summary.payablePartyCount || 0, "party", "parties"));
  setText("statReceivableAmount", formatMoney(summary.receivableAmount || 0));
  setText("statReceivableMeta", partyCountLabel(summary.receivablePartyCount || 0, "company", "companies"));

  const items = recent.items || [];
  renderDashboardRows(
    dashboardPurchaseBody,
    items.filter((item) => item.moduleType !== "selling").slice(0, 8),
    "No purchase entries yet."
  );
  renderDashboardRows(
    dashboardSalesBody,
    items.filter((item) => item.moduleType === "selling").slice(0, 8),
    "No sales entries yet."
  );
}

async function persistSlipToApi(moduleKey, data, editingId = null) {
  const payload = {
    ...data,
    entryDate: data.date,
  };
  let savedRecord;
  if (editingId) {
    savedRecord = await apiRequest(`/purchases/slips/${editingId}`, {
      method: "PUT",
      body: payload,
    });
  } else {
    const path = moduleKey === "godown" ? "/purchases/godown" : moduleKey === "home" ? "/purchases/home" : "/purchases/selling";
    savedRecord = await apiRequest(path, {
      method: "POST",
      body: payload,
    });
  }
  await Promise.all([loadReportsData(), loadDashboardData()]);
  if (canAccessView("payments") && typeof window.refreshPaymentsView === "function") {
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
    .join("")}<option value="__other__">Others</option>`;
}

function calculateMoistureAdjustedWeight(weight, moisturePer1000) {
  const grossEntryWeight = Math.max(0, parseNumber(weight));
  const moistureRate = Math.max(0, parseNumber(moisturePer1000));
  const moistureDeduction = (grossEntryWeight / 100) * moistureRate;
  const netWeight = Math.max(0, grossEntryWeight - moistureDeduction);

  return {
    grossEntryWeight,
    moisturePer1000: moistureRate,
    moistureDeduction,
    netWeight,
  };
}

function writeMoistureAdjustedRow(row, result) {
  row.querySelector(".entry-weight").value = formatKg(result.grossEntryWeight);
  row.querySelector(".entry-moisture-deduction").value = formatKg(result.moistureDeduction);
  row.querySelector(".entry-net-weight").value = formatKg(result.netWeight);
}

function sumEntryMoistureDeduction(entries) {
  return entries.reduce((sum, entry) => sum + parseNumber(entry.moistureDeduction), 0);
}

document.addEventListener("click", (event) => {
  if (!(event.target instanceof HTMLElement) || event.target.closest(".search-select")) return;
  closeAllSearchableSelects();
});

function initializeSearchableSelects() {
  document.querySelectorAll('[data-searchable-select="true"]').forEach((select) => {
    ensureSearchableSelect(select);
  });
}

function activateView(viewName) {
  if (session.permissions && !canAccessView(viewName)) {
    viewName = getDefaultView();
  }

  navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.view === viewName);
  });

  viewPanels.forEach((panel) => {
    panel.classList.toggle("active", panel.dataset.viewPanel === viewName);
    panel.classList.remove("print-active");
  });

  const meta = (!isAdmin() && staffViewMeta[viewName]) || viewMeta[viewName] || viewMeta.dashboard;
  pageEyebrow.textContent = meta.eyebrow;
  pageTitle.textContent = meta.title;
  pageCopy.textContent = meta.copy || "";

}

navButtons.forEach((button) => {
  button.addEventListener("click", () => activateView(button.dataset.view));
});

document.querySelectorAll("[data-finance-open]").forEach((card) => {
  card.addEventListener("click", () => {
    activateView("payments");
    if (typeof window.openPaymentsGroup === "function") window.openPaymentsGroup(card.dataset.financeOpen);
  });
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
  const rows = buildSlipInfoRows(moduleKey, data, partyName);
  if (isAdmin() && data.createdByName) {
    rows.push({ label: "Entered By", value: data.createdByName });
  }
  return rows;
}

function buildSlipInfoRows(moduleKey, data, partyName) {
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
    createdByName: data.createdByName || "",
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
      syncEntryTypeOtherField(row);
      ensureSearchableSelect(typeSelect);
      typeSelect.addEventListener("change", () => {
        syncEntryTypeOtherField(row);
      });
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
    const data = config.collectData(module.fields, entries, prepared);
    if (module.fields.moistureDeduction && data.moistureDeduction !== undefined) {
      module.fields.moistureDeduction.value = formatKg(data.moistureDeduction);
    }
    return data;
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
      const editingId = module.editingSlipId;
      const draftData = recalculate();
      const savedRecord = await persistSlipToApi(config.key, draftData, editingId);
      const savedData = { ...draftData, id: savedRecord.id };
      window.lastSavedPurchase[config.key] = savedData;
      showToast(editingId ? "Entry updated successfully." : "Entry saved successfully.");
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
      const editingId = module.editingSlipId;
      const draftData = recalculate();
      const savedRecord = await persistSlipToApi(config.key, draftData, editingId);
      const savedData = { ...draftData, id: savedRecord.id };
      window.lastSavedPurchase[config.key] = savedData;
      updateSummary(savedData);
      updatePrintTable(savedData.entries || []);
      setEditing(null);
      restore();
      showToast(editingId ? "Entry updated successfully." : "Entry saved successfully.");
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
    setEditing(null);
    syncActionState();
  }

  function updateEditingUI() {
    const editing = Boolean(module.editingSlipId);
    editBanner.classList.toggle("hidden", !editing);
    if (editing) {
      editBannerLabel.textContent = `Editing slip ${module.editingSlipId} — saving will overwrite the existing entry.`;
    }
    module.actionButtons.forEach((button) => {
      if (button.dataset.action === "save") {
        button.textContent = editing ? "Update Entry" : (button.dataset.defaultLabel || "Save Entry");
      }
    });
  }

  function setEditing(id) {
    module.editingSlipId = id || null;
    updateEditingUI();
  }

  function fillEntryRow(row, entry) {
    const typeSelect = row.querySelector(".entry-type");
    if (typeSelect) {
      const typeValue = entry.type && entry.type !== "-" ? entry.type : "";
      if (typeValue && Array.isArray(paddyTypes) && paddyTypes.includes(typeValue)) {
        typeSelect.value = typeValue;
        syncEntryTypeOtherField(row);
      } else if (typeValue) {
        typeSelect.value = "__other__";
        syncEntryTypeOtherField(row);
        const otherInput = row.querySelector(".entry-type-other");
        if (otherInput) otherInput.value = typeValue;
      }
      refreshSearchableSelect(typeSelect);
    }

    const setInput = (selector, value) => {
      const input = row.querySelector(selector);
      if (input) input.value = value ? String(value) : "";
    };
    setInput(".entry-bags", entry.bags);
    setInput(".entry-weight-per-bag", entry.weightPerBag);
    setInput(".entry-rate", entry.rate);
    setInput(".entry-moisture-per-1000", entry.moisturePer1000);
  }

  function loadForEdit(record) {
    reset();

    const partyByModule = {
      godown: record.supplierName || record.partyName,
      selling: record.companyName || record.partyName,
      home: record.farmerName || record.partyName,
    };

    const fieldValues = {
      entryDate: record.date || "",
      slipNumber: record.slipNumber === "-" ? "" : (record.slipNumber || ""),
      vehicleNumber: record.vehicleNumber === "-" ? "" : (record.vehicleNumber || ""),
      supplierName: partyByModule.godown,
      companyName: partyByModule.selling,
      farmerName: partyByModule.home,
      driverName: record.driverName || "",
      grossWeight: record.grossWeight || "",
      dustDeduction: record.dustDeduction || "",
      totalBags: record.totalBags || "",
      moistureNote: record.moistureNote || "",
      loadingDiscount: record.loadingDiscount || "",
      advancePayment: record.advancePayment || "",
    };

    Object.entries(module.fields).forEach(([key, element]) => {
      if (!element || !(key in fieldValues)) return;
      const value = fieldValues[key] == null ? "" : String(fieldValues[key]);
      if (element.tagName === "SELECT") {
        const hasOption = [...element.options].some((option) => option.value === value);
        if (value && !hasOption) {
          element.add(new Option(value, value));
        }
        element.value = value;
        refreshSearchableSelect(element);
      } else {
        element.value = value;
      }
    });

    const entries = Array.isArray(record.entries) ? record.entries : [];
    module.entriesBody.innerHTML = "";
    if (entries.length) {
      entries.forEach((entry) => {
        const row = module.rowTemplate.content.firstElementChild.cloneNode(true);
        module.entriesBody.appendChild(row);
        bindRow(row);
        fillEntryRow(row, entry);
      });
    } else {
      addRow();
    }

    setEditing(record.id);
    recalculate();
    syncActionState();
    activateView(config.viewName);
    form.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function shouldRecalculate(target) {
    return target instanceof HTMLElement && target.matches("input, select, textarea");
  }

  const editBanner = document.createElement("div");
  editBanner.className = "form-edit-banner hidden";
  const editBannerLabel = document.createElement("span");
  const editCancelButton = document.createElement("button");
  editCancelButton.type = "button";
  editCancelButton.className = "form-edit-cancel";
  editCancelButton.textContent = "Cancel edit";
  editBanner.appendChild(editBannerLabel);
  editBanner.appendChild(editCancelButton);
  form.prepend(editBanner);
  editCancelButton.addEventListener("click", () => reset());

  module.actionButtons.forEach((button) => {
    if (button.dataset.action === "save") {
      button.dataset.defaultLabel = button.textContent;
    }
  });

  module.addRow = addRow;
  module.recalculate = recalculate;
  module.save = save;
  module.print = print;
  module.reset = reset;
  module.loadForEdit = loadForEdit;
  setEditing(null);

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

window.purchaseModules = window.purchaseModules || {};

window.purchaseModules.godown = createPurchaseModule({
  key: "godown",
  viewName: "godown-entry",
  formId: "godownForm",
  entriesBodyId: "godownEntriesBody",
  templateId: "godownRowTemplate",
  printEntriesBodyId: "godownPrintEntriesBody",
  requiredField: "slipNumber",
  printColumnCount: 8,
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
    const totalBags = Math.max(0, Math.trunc(parseNumber(fields.totalBags.value)));
    const finalWeight = Math.max(0, grossWeight - dustDeduction);
    const averageWeight = totalBags > 0 ? finalWeight / totalBags : 0;

    fields.finalWeight.value = formatKg(finalWeight);
    fields.averageWeight.value = formatKg(averageWeight);
    fields.averageWeight.dataset.value = String(averageWeight);
    fields.moistureDeduction.value = formatKg(0);

    return {
      grossWeight,
      dustDeduction,
      moistureDeduction: 0,
      totalBags,
      finalWeight,
      averageWeight,
    };
  },
  getRowData(row, fields, shouldWrite = true) {
    const averageWeight = parseNumber(fields.averageWeight.dataset.value);
    const bags = parseNumber(row.querySelector(".entry-bags").value);
    const rate = parseNumber(row.querySelector(".entry-rate").value);
    const moisturePer1000 = parseNumber(row.querySelector(".entry-moisture-per-1000").value);
    const type = getEntryTypeValue(row);
    const result = calculateMoistureAdjustedWeight(averageWeight * bags, moisturePer1000);
    const amount = (result.netWeight / 100) * rate;

    if (shouldWrite) {
      writeMoistureAdjustedRow(row, result);
      row.querySelector(".entry-amount").value = formatMoney(amount);
    }

    return {
      type: type || "-",
      bags,
      rate,
      weight: result.grossEntryWeight,
      moisturePer1000: result.moisturePer1000,
      moistureDeduction: result.moistureDeduction,
      netWeight: result.netWeight,
      amount,
      isMeaningful: Boolean(type) || bags > 0 || rate > 0 || moisturePer1000 > 0,
    };
  },
  renderPrintRow(entry) {
    return `
      <tr>
        <td>${entry.type}</td>
        <td>${entry.bags}</td>
        <td>${formatKg(entry.weight)}</td>
        <td>${formatKg(entry.moisturePer1000)}</td>
        <td>${formatKg(entry.moistureDeduction)}</td>
        <td>${formatKg(entry.netWeight)}</td>
        <td>${formatMoney(entry.rate)}</td>
        <td>${formatMoney(entry.amount)}</td>
      </tr>
    `;
  },
  normalizeFields(fields, data) {
    fields.vehicleNumber.value = data.vehicleNumber;
  },
  collectData(fields, entries, prepared) {
    const purchaseTotal = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const moistureDeduction = sumEntryMoistureDeduction(entries);
    const netWeight = Math.max(0, prepared.finalWeight - moistureDeduction);
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
      moistureDeduction,
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
    fields.moistureDeduction.value = formatKg(0);
    fields.loadingDiscount.value = "";
    fields.advancePayment.value = "";
    fields.finalWeight.value = formatKg(0);
    fields.averageWeight.value = formatKg(0);
    fields.averageWeight.dataset.value = "0";
  },
});

window.purchaseModules.selling = createPurchaseModule({
  key: "selling",
  viewName: "selling",
  formId: "sellingForm",
  entriesBodyId: "sellingEntriesBody",
  templateId: "godownRowTemplate",
  printEntriesBodyId: "sellingPrintEntriesBody",
  requiredField: "slipNumber",
  printColumnCount: 8,
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
    const totalBags = Math.max(0, Math.trunc(parseNumber(fields.totalBags.value)));
    const finalWeight = Math.max(0, grossWeight - dustDeduction);
    const averageWeight = totalBags > 0 ? finalWeight / totalBags : 0;

    fields.finalWeight.value = formatKg(finalWeight);
    fields.averageWeight.value = formatKg(averageWeight);
    fields.averageWeight.dataset.value = String(averageWeight);
    fields.moistureDeduction.value = formatKg(0);

    return {
      grossWeight,
      dustDeduction,
      moistureDeduction: 0,
      totalBags,
      finalWeight,
      averageWeight,
    };
  },
  getRowData(row, fields, shouldWrite = true) {
    const averageWeight = parseNumber(fields.averageWeight.dataset.value);
    const bags = parseNumber(row.querySelector(".entry-bags").value);
    const rate = parseNumber(row.querySelector(".entry-rate").value);
    const moisturePer1000 = parseNumber(row.querySelector(".entry-moisture-per-1000").value);
    const type = getEntryTypeValue(row);
    const result = calculateMoistureAdjustedWeight(averageWeight * bags, moisturePer1000);
    const amount = (result.netWeight / 100) * rate;

    if (shouldWrite) {
      writeMoistureAdjustedRow(row, result);
      row.querySelector(".entry-amount").value = formatMoney(amount);
    }

    return {
      type: type || "-",
      bags,
      rate,
      weight: result.grossEntryWeight,
      moisturePer1000: result.moisturePer1000,
      moistureDeduction: result.moistureDeduction,
      netWeight: result.netWeight,
      amount,
      isMeaningful: Boolean(type) || bags > 0 || rate > 0 || moisturePer1000 > 0,
    };
  },
  renderPrintRow(entry) {
    return `
      <tr>
        <td>${entry.type}</td>
        <td>${entry.bags}</td>
        <td>${formatKg(entry.weight)}</td>
        <td>${formatKg(entry.moisturePer1000)}</td>
        <td>${formatKg(entry.moistureDeduction)}</td>
        <td>${formatKg(entry.netWeight)}</td>
        <td>${formatMoney(entry.rate)}</td>
        <td>${formatMoney(entry.amount)}</td>
      </tr>
    `;
  },
  normalizeFields(fields, data) {
    fields.vehicleNumber.value = data.vehicleNumber;
  },
  collectData(fields, entries, prepared) {
    const purchaseTotal = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const moistureDeduction = sumEntryMoistureDeduction(entries);
    const netWeight = Math.max(0, prepared.finalWeight - moistureDeduction);
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
      moistureDeduction,
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
    fields.moistureDeduction.value = formatKg(0);
    fields.loadingDiscount.value = "";
    fields.advancePayment.value = "";
    fields.finalWeight.value = formatKg(0);
    fields.averageWeight.value = formatKg(0);
    fields.averageWeight.dataset.value = "0";
  },
});

window.purchaseModules.home = createPurchaseModule({
  key: "home",
  viewName: "home-entry",
  formId: "homeForm",
  entriesBodyId: "homeEntriesBody",
  templateId: "homeRowTemplate",
  printEntriesBodyId: "homePrintEntriesBody",
  requiredField: "slipNumber",
  printColumnCount: 9,
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
    moistureDeduction: "homeSummaryMoistureDeduction",
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
    moistureDeduction: "homePrintMoistureDeduction",
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
    { target: "moistureDeduction", value: "moistureDeduction", formatter: formatKg },
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
    { target: "moistureDeduction", value: "moistureDeduction", formatter: formatKg },
    { target: "advance", value: "advancePayment", formatter: formatMoney },
    { target: "purchaseTotal", value: "purchaseTotal", formatter: formatMoney },
    { target: "advanceTotal", value: "advancePayment", formatter: formatMoney },
    { target: "finalPayable", value: "finalPayable", formatter: formatMoney },
  ],
  getRowData(row) {
    const bags = parseNumber(row.querySelector(".entry-bags").value);
    const weightPerBag = parseNumber(row.querySelector(".entry-weight-per-bag").value);
    const rate = parseNumber(row.querySelector(".entry-rate").value);
    const moisturePer1000 = parseNumber(row.querySelector(".entry-moisture-per-1000").value);
    const type = getEntryTypeValue(row);
    const result = calculateMoistureAdjustedWeight(bags * weightPerBag, moisturePer1000);
    const amount = (result.netWeight / 100) * rate;

    writeMoistureAdjustedRow(row, result);
    row.querySelector(".entry-amount").value = formatMoney(amount);

    return {
      type: type || "-",
      bags,
      weightPerBag,
      weight: result.grossEntryWeight,
      moisturePer1000: result.moisturePer1000,
      moistureDeduction: result.moistureDeduction,
      netWeight: result.netWeight,
      rate,
      amount,
      isMeaningful: Boolean(type) || bags > 0 || weightPerBag > 0 || rate > 0 || moisturePer1000 > 0,
    };
  },
  renderPrintRow(entry) {
    return `
      <tr>
        <td>${entry.type}</td>
        <td>${entry.bags}</td>
        <td>${formatKg(entry.weightPerBag)}</td>
        <td>${formatKg(entry.weight)}</td>
        <td>${formatKg(entry.moisturePer1000)}</td>
        <td>${formatKg(entry.moistureDeduction)}</td>
        <td>${formatKg(entry.netWeight)}</td>
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
    const totalWeight = entries.reduce((sum, entry) => sum + entry.netWeight, 0);
    const moistureDeduction = sumEntryMoistureDeduction(entries);
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
      grossWeight: totalWeight + moistureDeduction,
      dustDeduction: 0,
      moistureDeduction,
      finalWeight: totalWeight + moistureDeduction,
      netWeight: totalWeight,
      averageWeight: totalBags > 0 ? totalWeight / totalBags : 0,
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

window.editReportSlip = function editReportSlip(record) {
  const modules = window.purchaseModules || {};
  const target = record && modules[record.moduleKey];
  if (!target || typeof target.loadForEdit !== "function") {
    showToast("This entry cannot be edited.", "error");
    return false;
  }
  target.loadForEdit(record);
  return true;
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function getSettingsPath(type) {
  if (type === "rice") return "/settings/rice-types";
  if (type === "supplier") return "/settings/suppliers";
  if (type === "driver") return "/settings/drivers";
  return "/settings/companies";
}

function buildSettingsActionButtons(type, item) {
  return `
    <div class="settings-action-group">
      <button class="settings-edit-btn" type="button" data-settings-edit="${escapeHtml(type)}" data-settings-id="${escapeHtml(String(item.id))}">Edit</button>
      <button class="settings-delete-btn" type="button" data-settings-delete="${escapeHtml(type)}" data-settings-id="${escapeHtml(String(item.id))}">Delete</button>
    </div>
  `;
}

function attachSettingsDeleteHandlers(onEdit) {
  document.querySelectorAll('[data-settings-delete]').forEach((button) => {
    button.addEventListener('click', async () => {
      const type = button.dataset.settingsDelete;
      const id = button.dataset.settingsId;
      try {
        await apiRequest(`${getSettingsPath(type)}/${id}`, {
          method: 'DELETE',
        });
        await loadSettingsData();
        showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} deleted from active dropdowns.`);
      } catch (error) {
        notifyError(error);
      }
    });
  });

  document.querySelectorAll('[data-settings-edit]').forEach((button) => {
    button.addEventListener('click', () => {
      const type = button.dataset.settingsEdit;
      const id = button.dataset.settingsId;
      onEdit(type, id);
    });
  });
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
    .map((item) => `
      <span class="settings-chip">
        <span>${escapeHtml(item.name)}</span>
        ${buildSettingsActionButtons('rice', item)}
      </span>
    `)
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
        <div class="settings-record-head">
          <strong>${escapeHtml(item.name)}</strong>
          ${buildSettingsActionButtons('supplier', item)}
        </div>
        <span>Mob: ${escapeHtml(item.mobile || "-")}</span>
        <span>PAN: ${escapeHtml(item.pan || "-")}</span>
        <span>Aadhar: ${escapeHtml(item.aadhar || "-")}</span>
        <span>Accounts: ${escapeHtml((item.accountNumbers || []).join(", ") || "-")}</span>
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
        <div class="settings-record-head">
          <span>${escapeHtml(item.mobile || "-")}</span>
          ${buildSettingsActionButtons('driver', item)}
        </div>
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
        <div class="settings-record-head">
          <strong>${escapeHtml(item.name)}</strong>
          ${buildSettingsActionButtons('company', item)}
        </div>
        <span>Mob: ${escapeHtml(item.mobile || "-")}</span>
        <p>${escapeHtml(item.address || "-")}</p>
      </article>
    `
  );
  attachSettingsDeleteHandlers(window.startSettingsEdit || (() => {}));
}

function initializeSettingsModule() {
  const riceForm = document.getElementById("riceSettingsForm");
  const supplierForm = document.getElementById("supplierSettingsForm");
  const driverForm = document.getElementById("driverSettingsForm");
  const companyForm = document.getElementById("companySettingsForm");
  const switchButtons = [...document.querySelectorAll("[data-settings-target]")];
  const panels = [...document.querySelectorAll("[data-settings-panel]")];

  if (!riceForm || !supplierForm || !driverForm || !companyForm) return;

  const forms = {
    rice: {
      form: riceForm,
      path: "/settings/rice-types",
      submitButton: document.getElementById("riceSubmitButton"),
      cancelButton: document.getElementById("riceCancelButton"),
      getBody: () => ({
        name: document.getElementById("riceNameInput").value.trim(),
      }),
      fill: (item) => {
        document.getElementById("riceNameInput").value = item.name || "";
      },
    },
    supplier: {
      form: supplierForm,
      path: "/settings/suppliers",
      submitButton: document.getElementById("supplierSubmitButton"),
      cancelButton: document.getElementById("supplierCancelButton"),
      getBody: () => ({
        name: document.getElementById("supplierNameInput").value.trim(),
        mobile: document.getElementById("supplierMobileInput").value.trim(),
        panNumber: document.getElementById("supplierPanInput").value.trim(),
        aadharNumber: document.getElementById("supplierAadharInput").value.trim(),
        address: document.getElementById("supplierAddressInput").value.trim(),
        accountNumbers: parseAccountNumbers(document.getElementById("supplierAccountNumbersInput").value),
      }),
      fill: (item) => {
        document.getElementById("supplierNameInput").value = item.name || "";
        document.getElementById("supplierMobileInput").value = item.mobile || "";
        document.getElementById("supplierPanInput").value = item.pan || "";
        document.getElementById("supplierAadharInput").value = item.aadhar || "";
        document.getElementById("supplierAddressInput").value = item.address || "";
        document.getElementById("supplierAccountNumbersInput").value = (item.accountNumbers || []).join("\n");
      },
    },
    driver: {
      form: driverForm,
      path: "/settings/drivers",
      submitButton: document.getElementById("driverSubmitButton"),
      cancelButton: document.getElementById("driverCancelButton"),
      getBody: () => ({
        name: document.getElementById("driverNameInput").value.trim(),
        mobile: document.getElementById("driverMobileInput").value.trim(),
      }),
      fill: (item) => {
        document.getElementById("driverNameInput").value = item.name || "";
        document.getElementById("driverMobileInput").value = item.mobile || "";
      },
    },
    company: {
      form: companyForm,
      path: "/settings/companies",
      submitButton: document.getElementById("companySubmitButton"),
      cancelButton: document.getElementById("companyCancelButton"),
      getBody: () => ({
        name: document.getElementById("companyNameInput").value.trim(),
        address: document.getElementById("companyAddressInput").value.trim(),
        mobile: document.getElementById("companyMobileInput").value.trim(),
      }),
      fill: (item) => {
        document.getElementById("companyNameInput").value = item.name || "";
        document.getElementById("companyAddressInput").value = item.address || "";
        document.getElementById("companyMobileInput").value = item.mobile || "";
      },
    },
  };

  const editingState = {
    rice: null,
    supplier: null,
    driver: null,
    company: null,
  };

  function activateSettingsPanel(target) {
    switchButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.settingsTarget === target);
    });

    panels.forEach((panel) => {
      panel.classList.toggle("active", panel.dataset.settingsPanel === target);
    });
  }

  function resetEditState(type) {
    const config = forms[type];
    editingState[type] = null;
    config.form.reset();
    config.submitButton.textContent =
      type === "rice" ? "Add Rice" : type === "supplier" ? "Add Supplier" : type === "driver" ? "Add Driver" : "Add Company";
    config.cancelButton.classList.add("hidden");
  }

  async function submitSetting(type) {
    const config = forms[type];
    const editingId = editingState[type];
    try {
      await apiRequest(editingId ? `${config.path}/${editingId}` : config.path, {
        method: editingId ? "PUT" : "POST",
        body: config.getBody(),
      });
      resetEditState(type);
      await loadSettingsData();
      showToast(editingId ? `${type.charAt(0).toUpperCase() + type.slice(1)} updated.` : `${type.charAt(0).toUpperCase() + type.slice(1)} added.`);
    } catch (error) {
      notifyError(error);
    }
  }

  function startEdit(type, id) {
    const item = settingsStore[type].find((entry) => String(entry.id) === String(id));
    if (!item) return;
    const config = forms[type];
    editingState[type] = String(id);
    config.fill(item);
    config.submitButton.textContent =
      type === "rice" ? "Save Rice" : type === "supplier" ? "Save Supplier" : type === "driver" ? "Save Driver" : "Save Company";
    config.cancelButton.classList.remove("hidden");
    activateSettingsPanel(type);
  }

  switchButtons.forEach((button) => {
    button.addEventListener("click", () => activateSettingsPanel(button.dataset.settingsTarget));
  });

  Object.entries(forms).forEach(([type, config]) => {
    config.form.addEventListener("submit", (event) => {
      event.preventDefault();
      submitSetting(type);
    });
    config.cancelButton?.addEventListener("click", () => resetEditState(type));
  });

  activateSettingsPanel("rice");

  window.activateSettingsPanel = activateSettingsPanel;
  window.applySettingsRole = () => {
    const activeButton = switchButtons.find((button) => button.classList.contains("active"));
    if (!activeButton || activeButton.classList.contains("hidden")) {
      activateSettingsPanel(isAdmin() ? "rice" : "account");
    }
  };
  window.startSettingsEdit = startEdit;
  window.refreshSettingsView = () => {
    renderAllSettings();
    attachSettingsDeleteHandlers(startEdit);
  };
  window.refreshSettingsView();
}

function initializeAccountSettings() {
  const form = document.getElementById("accountPasswordForm");
  const currentPasswordInput = document.getElementById("accountCurrentPassword");
  const newPasswordInput = document.getElementById("accountNewPassword");
  const confirmPasswordInput = document.getElementById("accountConfirmPassword");
  const errorText = document.getElementById("accountPasswordError");
  const submitButton = document.getElementById("accountPasswordSubmitButton");

  if (!form) return;

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorText.classList.add("hidden");

    if (newPasswordInput.value !== confirmPasswordInput.value) {
      errorText.textContent = "New password and confirmation do not match.";
      errorText.classList.remove("hidden");
      return;
    }

    submitButton.disabled = true;
    try {
      await apiRequest("/auth/password", {
        method: "POST",
        body: {
          currentPassword: currentPasswordInput.value,
          newPassword: newPasswordInput.value,
        },
      });
      form.reset();
      showToast("Password updated.");
    } catch (error) {
      errorText.textContent = error.message || "Could not update password.";
      errorText.classList.remove("hidden");
    } finally {
      submitButton.disabled = false;
    }
  });
}

function initializeAccessModule() {
  const toggle = document.getElementById("accessStaffCanEdit");
  const toggleLabel = document.getElementById("accessStaffCanEditLabel");
  const form = document.getElementById("accessUserForm");
  const list = document.getElementById("accessUserList");
  const count = document.getElementById("accessUserCount");
  const submitButton = document.getElementById("accessUserSubmitButton");
  if (!toggle || !form || !list) return;

  let users = [];

  function renderToggle(enabled) {
    toggle.checked = Boolean(enabled);
    if (toggleLabel) toggleLabel.textContent = enabled ? "On" : "Off";
  }

  function renderUsers() {
    if (count) count.textContent = `${users.length} User${users.length === 1 ? "" : "s"}`;
    if (!users.length) {
      list.innerHTML = `<span class="settings-empty">No users found.</span>`;
      return;
    }

    list.innerHTML = users
      .map((user) => {
        const isSelf = Number(user.id) === Number(session.user?.id);
        const name = getUserDisplayName(user);
        const actions = isSelf
          ? `<span class="access-self-note">This is you</span>`
          : `
            <button class="settings-edit-btn" type="button" data-user-action="password" data-user-id="${user.id}">Reset Password</button>
            <button class="settings-edit-btn" type="button" data-user-action="role" data-user-id="${user.id}">Make ${user.role === "admin" ? "Staff" : "Admin"}</button>
            <button class="settings-edit-btn" type="button" data-user-action="active" data-user-id="${user.id}">${user.isActive ? "Deactivate" : "Activate"}</button>
            <button class="settings-delete-btn" type="button" data-user-action="delete" data-user-id="${user.id}">Delete</button>
          `;
        return `
          <article class="access-user-row${user.isActive ? "" : " is-inactive"}">
            <div class="access-user-main">
              <div class="user-avatar">${escapeHtml(name.charAt(0).toUpperCase())}</div>
              <div class="access-user-copy">
                <strong>${escapeHtml(name)}</strong>
                <span>@${escapeHtml(user.username)} · ${escapeHtml(String(user.entryCount || 0))} entries</span>
              </div>
              <span class="role-badge ${user.role}">${user.role === "admin" ? "Admin" : "Staff"}</span>
              ${user.isActive ? "" : `<span class="status-chip review">Inactive</span>`}
            </div>
            <div class="settings-action-group">${actions}</div>
          </article>
        `;
      })
      .join("");
  }

  async function refreshAccessView() {
    if (!isAdmin()) return;
    const [settings, response] = await Promise.all([
      apiRequest("/access/settings"),
      apiRequest("/access/users"),
    ]);
    renderToggle(settings.staffCanEdit);
    users = response.items || [];
    renderUsers();
  }

  async function runUserAction(action, userId) {
    const user = users.find((item) => String(item.id) === String(userId));
    if (!user) return;
    const name = getUserDisplayName(user);

    try {
      if (action === "password") {
        const password = window.prompt(`New password for ${name} (minimum 4 characters):`);
        if (!password) return;
        await apiRequest(`/access/users/${user.id}/password`, { method: "PUT", body: { password } });
        showToast(`Password reset for ${name}.`);
        return;
      }
      if (action === "role") {
        const role = user.role === "admin" ? "staff" : "admin";
        if (!window.confirm(`Change ${name} to ${role}?`)) return;
        await apiRequest(`/access/users/${user.id}`, { method: "PUT", body: { role } });
        showToast(`${name} is now ${role}.`);
      }
      if (action === "active") {
        await apiRequest(`/access/users/${user.id}`, { method: "PUT", body: { isActive: !user.isActive } });
        showToast(user.isActive ? `${name} can no longer sign in.` : `${name} can sign in again.`);
      }
      if (action === "delete") {
        if (!window.confirm(`Delete user ${name}? Entries they made are kept.`)) return;
        await apiRequest(`/access/users/${user.id}`, { method: "DELETE" });
        showToast(`${name} deleted.`);
      }
      await refreshAccessView();
    } catch (error) {
      notifyError(error);
    }
  }

  toggle.addEventListener("change", async () => {
    const enabled = toggle.checked;
    toggle.disabled = true;
    try {
      const settings = await apiRequest("/access/settings", { method: "PUT", body: { staffCanEdit: enabled } });
      renderToggle(settings.staffCanEdit);
      if (session.permissions) session.permissions.staffCanEdit = settings.staffCanEdit;
      showToast(settings.staffCanEdit ? "Staff can now edit their own entries." : "Staff editing turned off.");
    } catch (error) {
      renderToggle(!enabled);
      notifyError(error);
    } finally {
      toggle.disabled = false;
    }
  });

  list.addEventListener("click", (event) => {
    const button = event.target.closest("[data-user-action]");
    if (button) runUserAction(button.dataset.userAction, button.dataset.userId);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const body = {
      fullName: document.getElementById("accessFullNameInput").value.trim(),
      username: document.getElementById("accessUsernameInput").value.trim(),
      password: document.getElementById("accessPasswordInput").value,
      role: document.getElementById("accessRoleInput").value,
    };
    if (!body.username || !body.password) {
      showToast("Username and password are required.", "error");
      return;
    }

    submitButton.disabled = true;
    try {
      await apiRequest("/access/users", { method: "POST", body });
      form.reset();
      showToast(`${body.role === "admin" ? "Admin" : "Staff"} account created for ${body.fullName || body.username}.`);
      await refreshAccessView();
    } catch (error) {
      notifyError(error);
    } finally {
      submitButton.disabled = false;
    }
  });

  window.refreshAccessView = refreshAccessView;
}

function getFlowFromModule(moduleKey) {
  return moduleKey === "selling" ? "sales" : "purchase";
}

function getFlowFromPartyView(view) {
  return view === "company" ? "sales" : "purchase";
}

function initializeReportsModule() {
  const viewButtons = [...document.querySelectorAll("[data-report-view]")];
  const groupButtons = [...document.querySelectorAll("[data-report-group]")];
  const searchInput = document.getElementById("reportsSearchInput");
  const slipSearchInput = document.getElementById("reportsSlipSearchInput");
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

  if (!viewButtons.length || !searchInput || !slipSearchInput || !partyFilter || !dateFromInput || !dateToInput || !clearFiltersButton || !cardGrid || !modalBackdrop || !modalClose || !reportsPanel) {
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
    editButton: document.getElementById("reportEditButton"),
    deleteButton: document.getElementById("reportDeleteButton"),
    editLockedNote: document.getElementById("reportEditLockedNote"),
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
    statementHeading: document.getElementById("statementPrintHeading"),
    generatedAt: document.getElementById("statementPrintGeneratedAt"),
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
    if (!isAdmin()) return "My Godown Entries";
    if (view === "farmers") return "Purchase · Farmer Reports";
    if (view === "suppliers") return "Purchase · Supplier Reports";
    return "Sales · Company Reports";
  }

  function renderGroupCounts() {
    const counts = { purchase: 0, sales: 0 };
    reportStore.forEach((record) => {
      counts[getFlowFromModule(record.moduleKey)] += 1;
    });
    document.querySelectorAll("[data-group-count]").forEach((element) => {
      const count = counts[element.dataset.groupCount] || 0;
      element.textContent = `${count} entr${count === 1 ? "y" : "ies"}`;
    });
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
    const slipQuery = slipSearchInput.value.trim().toLowerCase();
    const party = partyFilter.value;

    return getActiveRecords().filter((record) => {
      if (party && record.partyName !== party) return false;
      if (!isInDateRange(record)) return false;
      if (slipQuery) {
        if (String(record.id || "") !== slipQuery) return false;
      }
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
      return `${formatKg(entry.weightPerBag)} / bag | ${formatMoney(entry.rate)} / 100 Kg`;
    }
    return `${formatMoney(entry.rate)} / 100 Kg`;
  }

  function buildReportPrintSummaryRows(record) {
    const finalAmount = parseNumber(record.purchaseTotal) - parseNumber(record.loadingDiscount);

    if (record.moduleKey === "home") {
      return [
        ["Farmer Name", record.partyName || "-"],
        ["Driver Name", record.driverName || "-"],
        ["Vehicle Number", record.vehicleNumber || "-"],
        ["Total Weight", formatKg(record.totalWeight)],
        ["Moisture Deduction", formatKg(record.moistureDeduction)],
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
    refreshSearchableSelect(partyFilter);
  }

  function canEditRecord(record) {
    if (!canEditEntries()) return false;
    return isAdmin() || record.moduleKey === "godown";
  }

  function renderModal(record) {
    const editable = canEditRecord(record);
    detailRefs.editButton?.classList.toggle("hidden", !editable);
    detailRefs.editLockedNote?.classList.toggle("hidden", editable || isAdmin());
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
              <td>${formatKg(entry.moistureDeduction)}</td>
              <td>${formatKg(entry.netWeight)}</td>
              <td>${escapeHtml(getEntryRateLabel(record, entry))}</td>
              <td class="tally-amount-col">${formatMoney(entry.amount)}</td>
            </tr>
          `)
          .join("")
      : `<tr><td colspan="7" class="reports-empty inline">No line items recorded for this slip.</td></tr>`;

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
    renderGroupCounts();
    const records = getFilteredReports();
    listLabel.textContent = getViewLabel(activeView);
    listCount.textContent = `${records.length} Result${records.length === 1 ? "" : "s"}`;

    if (!records.length) {
      cardGrid.innerHTML = `<div class="reports-empty">No saved reports found for these filters.</div>`;
      return;
    }

    const actionHint = isAdmin() ? "View, print or edit" : canEditEntries() ? "View, print or edit bill" : "View & print bill";
    cardGrid.innerHTML = records
      .map((record) => `
        <button class="reports-record-card is-${getFlowFromModule(record.moduleKey)}" type="button" data-report-id="${escapeHtml(record.id)}">
          <div class="reports-card-top">
            <div>
              <strong>${escapeHtml(record.partyName)}</strong>
              <span class="reports-card-tag">${escapeHtml(record.typeLabel)}</span>
            </div>
            <span class="reports-card-slip">${escapeHtml(record.slipNumber)}</span>
          </div>
          <div class="reports-card-meta">
            <span>${escapeHtml(record.dateDisplay)}</span>
            <span>${escapeHtml(record.vehicleNumber || "-")}</span>
            ${isAdmin() && record.createdByName ? `<span>By ${escapeHtml(record.createdByName)}</span>` : ""}
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
          <span class="reports-card-link">${actionHint} &rarr;</span>
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
    printRefs.title.textContent = "MAA LAXMI TRADERS";
    printRefs.subtitle.textContent = `${record.typeLabel} - ${record.kindLabel} slip report`;
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
              <td>${formatKg(entry.moistureDeduction)}</td>
              <td>${formatKg(entry.netWeight)}</td>
              <td>${escapeHtml(getEntryRateLabel(record, entry))}</td>
              <td>${formatMoney(entry.amount)}</td>
            </tr>
          `)
          .join("")
      : `<tr><td colspan="7">No materials recorded</td></tr>`;
  }

  function downloadSingleReport() {
    if (!currentReportDetail) return;
    if (statementRefs.block) statementRefs.block.classList.add("hidden");
    renderSinglePrint(currentReportDetail);
    toggleModal(false);
    runPrintJob(`${currentReportDetail.partyName} - ${currentReportDetail.slipNumber}`);
  }

  function editSelectedReport() {
    if (!currentReportDetail) return;
    const record = currentReportDetail;
    closeModal();
    window.editReportSlip(record);
  }

  async function deleteSelectedReport() {
    if (!currentReportDetail) return;
    const record = currentReportDetail;
    const confirmed = window.confirm(
      `Delete slip ${record.slipNumber} for ${record.partyName}? This permanently removes the entry and cannot be undone.`
    );
    if (!confirmed) return;

    const previousLabel = detailRefs.deleteButton.textContent;
    detailRefs.deleteButton.disabled = true;
    detailRefs.deleteButton.textContent = "Deleting...";
    try {
      await apiRequest(`/purchases/slips/${record.id}`, { method: "DELETE" });
      showToast("Entry deleted.");
      closeModal();
      await Promise.all([loadReportsData(), loadDashboardData()]);
      if (typeof window.refreshPaymentsView === "function") {
        await window.refreshPaymentsView();
      }
      renderCards();
    } catch (error) {
      notifyError(error);
    } finally {
      detailRefs.deleteButton.disabled = false;
      detailRefs.deleteButton.textContent = previousLabel;
    }
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
    statementRefs.statementHeading.textContent = `${meta.partyName} - Account Statement`;
    statementRefs.generatedAt.textContent = `${formatDateForDisplay(new Date().toISOString().slice(0, 10))}, ${new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false })}`;
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
              <td>${escapeHtml(payment.accountNo || "-")}</td>
              <td>${escapeHtml(payment.reference || "-")}</td>
              <td>${escapeHtml(payment.remarks || "-")}</td>
              <td>${formatMoney(payment.amount)}</td>
            </tr>
          `
          )
          .join("")
      : `<tr><td colspan="7">No payments recorded for the selected filters.</td></tr>`;
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
    slipSearchInput.value = "";
    partyFilter.value = "";
    dateFromInput.value = "";
    dateToInput.value = "";
    closeModal();
    renderCards();
  }

  function switchView(view) {
    activeView = view;
    closeModal();
    const group = getFlowFromPartyView(view);
    groupButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.reportGroup === group);
    });
    viewButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.reportView === view);
      button.classList.toggle("hidden", button.dataset.group !== group);
    });
    renderCards();
  }

  function switchGroup(group) {
    if (getFlowFromPartyView(activeView) === group) return;
    const firstView = viewButtons.find((button) => button.dataset.group === group);
    if (firstView) switchView(firstView.dataset.reportView);
  }

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => switchView(button.dataset.reportView));
  });
  groupButtons.forEach((button) => {
    button.addEventListener("click", () => switchGroup(button.dataset.reportGroup));
  });
  searchInput.addEventListener("input", renderCards);
  slipSearchInput.addEventListener("input", renderCards);
  partyFilter.addEventListener("change", renderCards);
  dateFromInput.addEventListener("change", renderCards);
  dateToInput.addEventListener("change", renderCards);
  clearFiltersButton.addEventListener("click", clearFilters);
  if (exportStatementButton) exportStatementButton.addEventListener("click", downloadPartyStatement);
  detailRefs.printButton.addEventListener("click", downloadSingleReport);
  if (detailRefs.editButton) detailRefs.editButton.addEventListener("click", editSelectedReport);
  if (detailRefs.deleteButton) detailRefs.deleteButton.addEventListener("click", deleteSelectedReport);
  modalClose.addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", (event) => {
    if (event.target === modalBackdrop) closeModal();
  });

  window.refreshReportsView = renderCards;
  window.applyReportsRole = () => {
    // Staff only ever have godown (supplier) entries of their own.
    if (!isAdmin()) {
      activeView = "suppliers";
    }
    const heading = document.getElementById("reportsHeading");
    const kicker = document.getElementById("reportsKicker");
    if (heading) heading.textContent = isAdmin() ? "Reports" : "My Godown Entries";
    if (kicker) kicker.textContent = isAdmin() ? "Records Desk" : "Your Bills";
    switchView(activeView);
  };
  renderCards();
}

function initializePaymentsModule() {
  const viewButtons = [...document.querySelectorAll("[data-payment-view]")];
  const groupButtons = [...document.querySelectorAll("[data-payment-group]")];
  const searchInput = document.getElementById("paymentsSearchInput");
  const slipSearchInput = document.getElementById("paymentsSlipSearchInput");
  const listLabel = document.getElementById("paymentsListLabel");
  const listCount = document.getElementById("paymentsListCount");
  const cardGrid = document.getElementById("paymentsCardGrid");
  const modalBackdrop = document.getElementById("paymentsModalBackdrop");
  const modalClose = document.getElementById("paymentsModalClose");
  const paymentForm = document.getElementById("paymentEntryForm");
  const paymentEntryBankAccount = document.getElementById("paymentEntryBankAccount");
  const paymentEntryBankAccountWrap = document.getElementById("paymentEntryBankAccountWrap");
  const paymentEntrySupplierAccount = document.getElementById("paymentEntrySupplierAccount");
  const paymentEntrySupplierAccountWrap = document.getElementById("paymentEntrySupplierAccountWrap");
  const paymentSubmitButton = paymentForm.querySelector('button[type="submit"]');
  const paymentCancelEditButton = document.getElementById("paymentEntryCancelEdit");

  if (!viewButtons.length || !searchInput || !slipSearchInput || !cardGrid || !modalBackdrop || !modalClose || !paymentForm) return;

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
  let isSavingPayment = false;
  let editingPaymentId = null;

  function getViewLabel(view) {
    if (view === "farmers") return "Payables · Farmer Ledgers";
    if (view === "suppliers") return "Payables · Supplier Ledgers";
    return "Receivables · Company Ledgers";
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

  function syncPaymentAccountField(order) {
    const supplierAccounts = order?.supplierAccountNumbers || [];
    const isSupplier = activeView === "suppliers" && supplierAccounts.length > 0;

    paymentEntrySupplierAccountWrap?.classList.toggle("hidden", !isSupplier);
    paymentEntryBankAccountWrap?.classList.toggle("hidden", isSupplier);

    if (paymentEntrySupplierAccount) {
      paymentEntrySupplierAccount.required = isSupplier;
      renderSupplierAccountOptions(supplierAccounts);
    }
    if (paymentEntryBankAccount) {
      paymentEntryBankAccount.required = !isSupplier;
    }
  }

  function setPaymentEditing(id) {
    editingPaymentId = id || null;
    const editing = Boolean(editingPaymentId);
    if (paymentSubmitButton) {
      paymentSubmitButton.textContent = editing ? "Update Payment" : "Add Payment";
    }
    if (paymentCancelEditButton) {
      paymentCancelEditButton.classList.toggle("hidden", !editing);
    }
  }

  function resetPaymentForm() {
    paymentForm.reset();
    refreshSearchableSelect(document.getElementById("paymentEntryMode"));
    document.getElementById("paymentEntryDate").value = getLocalDateString();
    setPaymentEditing(null);
    if (currentPaymentDetail) syncPaymentAccountField(currentPaymentDetail);
  }

  function closeModal() {
    toggleModal(false);
    selectedPartyName = null;
    currentPaymentDetail = null;
    setPaymentEditing(null);
    syncPaymentAccountField(null);
  }

  function startPaymentEdit(paymentId) {
    if (!currentPaymentDetail) return;
    const payment = (currentPaymentDetail.payments || []).find((item) => item.id === String(paymentId));
    if (!payment) return;

    if (String(payment.mode || "").toLowerCase() === "advance") {
      showToast("Advance payments are edited on the purchase slip.", "error");
      return;
    }

    setPaymentEditing(String(paymentId));
    syncPaymentAccountField(currentPaymentDetail);

    document.getElementById("paymentEntryDate").value = payment.date || getLocalDateString();
    document.getElementById("paymentEntryAmount").value = payment.amount || "";
    document.getElementById("paymentEntryMode").value = payment.mode || "";
    refreshSearchableSelect(document.getElementById("paymentEntryMode"));
    document.getElementById("paymentEntryReference").value = payment.reference || "";
    document.getElementById("paymentEntryRemark").value = payment.remark === "No remark added" ? "" : (payment.remark || "");

    const bankValue = payment.bankAccount && payment.bankAccount !== "-" ? payment.bankAccount : "";
    if (paymentEntrySupplierAccountWrap && !paymentEntrySupplierAccountWrap.classList.contains("hidden")) {
      paymentEntrySupplierAccount.value = bankValue;
      refreshSearchableSelect(paymentEntrySupplierAccount);
    } else {
      document.getElementById("paymentEntryBankAccount").value = bankValue;
    }

    paymentForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  async function deletePayment(paymentId) {
    if (!currentPaymentDetail) return;
    const payment = (currentPaymentDetail.payments || []).find((item) => item.id === String(paymentId));
    const label = payment ? `${formatMoney(payment.amount)} on ${formatDateForDisplay(payment.date)}` : "this payment";
    if (!window.confirm(`Delete payment of ${label}? This cannot be undone.`)) return;

    try {
      const detail = await apiRequest(`/payments/${paymentId}`, { method: "DELETE" });
      currentPaymentDetail = normalizePaymentDetail(detail);
      if (editingPaymentId === String(paymentId)) resetPaymentForm();
      await Promise.all([renderCards(), loadDashboardData()]);
      renderModal(currentPaymentDetail);
      syncPaymentAccountField(currentPaymentDetail);
      showToast("Payment deleted.");
    } catch (error) {
      notifyError(error);
    }
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
              ${payment.id ? `
              <div class="payments-history-actions">
                <button type="button" class="link-btn" data-payment-edit="${escapeHtml(payment.id)}">Edit</button>
                <button type="button" class="link-btn danger" data-payment-delete="${escapeHtml(payment.id)}">Delete</button>
              </div>` : ""}
            </article>
          `)
          .join("")
      : `<div class="payments-empty inline">No payments recorded yet.</div>`;

    detailRefs.history.querySelectorAll("[data-payment-edit]").forEach((button) => {
      button.addEventListener("click", () => startPaymentEdit(button.dataset.paymentEdit));
    });
    detailRefs.history.querySelectorAll("[data-payment-delete]").forEach((button) => {
      button.addEventListener("click", () => deletePayment(button.dataset.paymentDelete));
    });

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
        slipId: slipSearchInput.value.trim(),
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
      setPaymentEditing(null);
      renderModal(currentPaymentDetail);
      syncPaymentAccountField(currentPaymentDetail);
      document.getElementById("paymentEntryDate").value = getLocalDateString();
      toggleModal(true);
    } catch (error) {
      notifyError(error);
    }
  }

  async function renderCards() {
    if (!canAccessView("payments")) return;
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
          <button class="payments-record-card is-${getFlowFromPartyView(activeView)}" type="button" data-payment-party="${escapeHtml(order.partyName)}">
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
    const group = getFlowFromPartyView(view);
    groupButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.paymentGroup === group);
    });
    viewButtons.forEach((button) => {
      button.classList.toggle("active", button.dataset.paymentView === view);
      button.classList.toggle("hidden", button.dataset.group !== group);
    });
    renderCards();
  }

  viewButtons.forEach((button) => {
    button.addEventListener("click", () => {
      closeModal();
      switchView(button.dataset.paymentView);
    });
  });
  groupButtons.forEach((button) => {
    button.addEventListener("click", () => {
      if (getFlowFromPartyView(activeView) === button.dataset.paymentGroup) return;
      const firstView = viewButtons.find((item) => item.dataset.group === button.dataset.paymentGroup);
      if (!firstView) return;
      closeModal();
      switchView(firstView.dataset.paymentView);
    });
  });

  searchInput.addEventListener("input", () => {
    closeModal();
    renderCards();
  });
  slipSearchInput.addEventListener("input", () => {
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
    if (!selectedPartyName || isSavingPayment) return;

    const date = document.getElementById("paymentEntryDate").value;
    const amount = parseNumber(document.getElementById("paymentEntryAmount").value);
    const bankAccount = (activeView === "suppliers" && paymentEntrySupplierAccountWrap && !paymentEntrySupplierAccountWrap.classList.contains("hidden")
      ? paymentEntrySupplierAccount.value
      : document.getElementById("paymentEntryBankAccount").value.trim());
    const mode = document.getElementById("paymentEntryMode").value;
    const reference = document.getElementById("paymentEntryReference").value.trim();
    const remark = document.getElementById("paymentEntryRemark").value.trim();

    if (!date || amount <= 0 || !bankAccount || !mode || !reference) {
      showToast("Fill date, amount, account, mode and reference before saving.", "error");
      return;
    }

    isSavingPayment = true;
    const savingEditId = editingPaymentId;
    if (paymentSubmitButton) {
      paymentSubmitButton.disabled = true;
      paymentSubmitButton.textContent = "Saving...";
    }

    try {
      const body = {
        partyView: activeView,
        partyName: selectedPartyName,
        paymentDate: date,
        amount,
        bankAccount,
        mode,
        referenceCode: reference,
        remark,
      };
      const detail = savingEditId
        ? await apiRequest(`/payments/${savingEditId}`, { method: "PUT", timeoutMs: 30000, body })
        : await apiRequest("/payments", { method: "POST", timeoutMs: 30000, body });
      currentPaymentDetail = normalizePaymentDetail(detail);
      paymentForm.reset();
      // form.reset() fires no change event, so the custom dropdown label must be resynced
      refreshSearchableSelect(document.getElementById("paymentEntryMode"));
      document.getElementById("paymentEntryDate").value = getLocalDateString();
      setPaymentEditing(null);
      await Promise.all([renderCards(), loadDashboardData()]);
      renderModal(currentPaymentDetail);
      syncPaymentAccountField(currentPaymentDetail);
      showToast(savingEditId ? "Payment updated successfully." : "Payment recorded successfully.");
    } catch (error) {
      notifyError(error);
    } finally {
      isSavingPayment = false;
      if (paymentSubmitButton) {
        paymentSubmitButton.disabled = false;
        paymentSubmitButton.textContent = editingPaymentId ? "Update Payment" : "Add Payment";
      }
    }
  });

  if (paymentCancelEditButton) {
    paymentCancelEditButton.addEventListener("click", resetPaymentForm);
  }

  window.refreshPaymentsView = renderCards;
  window.openPaymentsGroup = (group) => {
    const firstView = viewButtons.find((item) => item.dataset.group === group);
    if (firstView) switchView(firstView.dataset.paymentView);
  };
  switchView(activeView);
}

window.addEventListener("afterprint", () => {
  viewPanels.forEach((panel) => panel.classList.remove("print-active"));
});

initializeSearchableSelects();
initializeSettingsModule();
initializeAccountSettings();
initializeReportsModule();
initializePaymentsModule();
initializeAccessModule();
initializeAuthModule();
activateView("dashboard");
setBackendStatus("loading");

async function initializeAppData() {
  setBackendStatus("loading");
  try {
    await Promise.all([
      loadSettingsData(),
      loadReportsData(),
      loadDashboardData(),
      isAdmin() && typeof window.refreshAccessView === "function" ? window.refreshAccessView() : null,
    ]);
    if (canAccessView("payments") && typeof window.refreshPaymentsView === "function") {
      await window.refreshPaymentsView();
    }
    setBackendStatus("connected");
  } catch (error) {
    setBackendStatus("disconnected", error.message || "Backend is not reachable.");
    notifyError(error);
  }
}

backendRetryButton?.addEventListener("click", () => {
  bootstrapSession();
});

bootstrapSession();
