const paddyTypes = ["Basmati", "Swarna", "IR64", "PR126"];
const settingsStore = {
  rice: [],
  supplier: [],
  driver: [],
  company: [],
};

const paymentsStore = {
  farmers: [
    {
      id: "farmer-1",
      typeLabel: "Farmer Order",
      partyName: "Farmer B",
      slipNumber: "HM-207",
      vehicleNumber: "JH05AB1234",
      orderDate: "2026-06-18",
      totalAmount: 24710,
      paidAmount: 12000,
      balanceAmount: 12710,
      details: {
        Farmer: "Farmer B",
        Driver: "Driver B",
        Village: "Bokaro Rural",
        Bags: "36",
        Weight: "422.50 Kg",
      },
      payments: [
        {
          date: "2026-06-18",
          amount: 12000,
          mode: "Cash",
          reference: "ADV-120",
          remark: "Initial advance paid at unloading",
        },
      ],
    },
    {
      id: "farmer-2",
      typeLabel: "Farmer Order",
      partyName: "Farmer C",
      slipNumber: "HM-211",
      vehicleNumber: "JH09CD4521",
      orderDate: "2026-06-17",
      totalAmount: 19840,
      paidAmount: 8000,
      balanceAmount: 11840,
      details: {
        Farmer: "Farmer C",
        Driver: "Driver A",
        Village: "Chas Sector",
        Bags: "28",
        Weight: "336.00 Kg",
      },
      payments: [
        {
          date: "2026-06-17",
          amount: 8000,
          mode: "UPI",
          reference: "UPI-7782",
          remark: "Advance settled on pickup",
        },
      ],
    },
  ],
  suppliers: [
    {
      id: "supplier-1",
      typeLabel: "Supplier Order",
      partyName: "ABC Traders",
      slipNumber: "GD-1042",
      vehicleNumber: "JH01PQ1102",
      orderDate: "2026-06-18",
      totalAmount: 68340,
      paidAmount: 40000,
      balanceAmount: 28340,
      details: {
        Supplier: "ABC Traders",
        Mobile: "9876543210",
        PAN: "ABCDE1234F",
        Bags: "84",
        NetWeight: "1005.25 Kg",
      },
      payments: [
        {
          date: "2026-06-18",
          amount: 25000,
          mode: "Bank Transfer",
          reference: "UTR-225510",
          remark: "Morning transfer",
        },
        {
          date: "2026-06-18",
          amount: 15000,
          mode: "Cash",
          reference: "CASH-19",
          remark: "Cash adjustment",
        },
      ],
    },
    {
      id: "supplier-2",
      typeLabel: "Supplier Order",
      partyName: "Farmer Group A",
      slipNumber: "GD-1043",
      vehicleNumber: "JH10MN9033",
      orderDate: "2026-06-18",
      totalAmount: 47250,
      paidAmount: 15000,
      balanceAmount: 32250,
      details: {
        Supplier: "Farmer Group A",
        Mobile: "9765432101",
        PAN: "FGAPA4432D",
        Bags: "60",
        NetWeight: "735.00 Kg",
      },
      payments: [
        {
          date: "2026-06-18",
          amount: 15000,
          mode: "Cheque",
          reference: "CHQ-55381",
          remark: "Cheque collected by representative",
        },
      ],
    },
  ],
  company: [
    {
      id: "company-1",
      typeLabel: "Company Order",
      partyName: "Eastern Rice Mill",
      slipNumber: "SL-519",
      vehicleNumber: "WB17T5520",
      orderDate: "2026-06-18",
      totalAmount: 42000,
      paidAmount: 18000,
      balanceAmount: 24000,
      details: {
        Company: "Eastern Rice Mill",
        Contact: "Accounts Desk",
        Address: "Howrah Industrial Estate",
        Bags: "50",
        NetWeight: "500.00 Kg",
      },
      payments: [
        {
          date: "2026-06-18",
          amount: 18000,
          mode: "Bank Transfer",
          reference: "UTR-90321",
          remark: "Partial release against invoice",
        },
      ],
    },
    {
      id: "company-2",
      typeLabel: "Company Order",
      partyName: "Lakshmi Agro Traders",
      slipNumber: "SL-521",
      vehicleNumber: "JH12AK6620",
      orderDate: "2026-06-17",
      totalAmount: 38600,
      paidAmount: 10000,
      balanceAmount: 28600,
      details: {
        Company: "Lakshmi Agro Traders",
        Contact: "Purchase Head",
        Address: "Dhanbad Market Road",
        Bags: "44",
        NetWeight: "462.00 Kg",
      },
      payments: [
        {
          date: "2026-06-17",
          amount: 10000,
          mode: "UPI",
          reference: "UPI-66290",
          remark: "Initial part payment",
        },
      ],
    },
  ],
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
    copy: "Search party records, open any order, review balance details, and add payments through a clean settlement workflow.",
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

  function validate() {
    const requiredField = module.fields[config.requiredField];
    if (!requiredField.value.trim()) {
      requiredField.focus();
      requiredField.reportValidity();
      return false;
    }
    return true;
  }

  function save(button) {
    if (!validate()) return;
    window.lastSavedPurchase = window.lastSavedPurchase || {};
    window.lastSavedPurchase[config.key] = recalculate();
    if (button) {
      const previousText = button.textContent;
      button.textContent = "Saved";
      setTimeout(() => {
        button.textContent = previousText;
      }, 1200);
    }
  }

  function print() {
    if (!validate()) return;
    window.lastSavedPurchase = window.lastSavedPurchase || {};
    window.lastSavedPurchase[config.key] = recalculate();
    viewPanels.forEach((panel) => panel.classList.remove("print-active"));
    module.viewPanel.classList.add("print-active");
    window.print();
  }

  function reset() {
    form.reset();
    config.resetDefaults(module.fields);
    module.entriesBody.innerHTML = "";
    addRow();
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
    }
  });

  form.addEventListener("change", (event) => {
    if (shouldRecalculate(event.target)) {
      recalculate();
    }
  });

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
  });

  addRowButton.addEventListener("click", addRow);

  actionButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "save") save(button);
      if (action === "print") print();
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

    return {
      grossWeight,
      dustDeduction,
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
    const moistureDeduction = parseNumber(fields.moistureDeduction.value);
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
    fields.dustDeduction.value = "0";
    fields.moistureDeduction.value = "0";
    fields.loadingDiscount.value = "0";
    fields.advancePayment.value = "0";
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

    return {
      grossWeight,
      dustDeduction,
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
    const moistureDeduction = parseNumber(fields.moistureDeduction.value);
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
    fields.dustDeduction.value = "0";
    fields.moistureDeduction.value = "0";
    fields.loadingDiscount.value = "0";
    fields.advancePayment.value = "0";
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
    fields.advancePayment.value = "0";
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

  switchButtons.forEach((button) => {
    button.addEventListener("click", () => activateSettingsPanel(button.dataset.settingsTarget));
  });

  activateSettingsPanel("rice");

  riceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const input = document.getElementById("riceNameInput");
    const name = input.value.trim();
    if (!name) return;
    settingsStore.rice.unshift({ name });
    riceForm.reset();
    renderAllSettings();
  });

  supplierForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.getElementById("supplierNameInput").value.trim();
    const mobile = document.getElementById("supplierMobileInput").value.trim();
    const pan = document.getElementById("supplierPanInput").value.trim();
    const aadhar = document.getElementById("supplierAadharInput").value.trim();
    const address = document.getElementById("supplierAddressInput").value.trim();
    if (!name || !mobile) return;
    settingsStore.supplier.unshift({ name, mobile, pan, aadhar, address });
    supplierForm.reset();
    renderAllSettings();
  });

  driverForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.getElementById("driverNameInput").value.trim();
    const mobile = document.getElementById("driverMobileInput").value.trim();
    if (!name || !mobile) return;
    settingsStore.driver.unshift({ name, mobile });
    driverForm.reset();
    renderAllSettings();
  });

  companyForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const name = document.getElementById("companyNameInput").value.trim();
    const address = document.getElementById("companyAddressInput").value.trim();
    const mobile = document.getElementById("companyMobileInput").value.trim();
    if (!name || !mobile) return;
    settingsStore.company.unshift({ name, address, mobile });
    companyForm.reset();
    renderAllSettings();
  });

  renderAllSettings();
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
    slip: document.getElementById("paymentDetailSlip"),
    vehicle: document.getElementById("paymentDetailVehicle"),
    total: document.getElementById("paymentDetailTotal"),
    paid: document.getElementById("paymentDetailPaid"),
    info: document.getElementById("paymentDetailInfo"),
    history: document.getElementById("paymentHistoryList"),
  };

  let activeView = "farmers";
  let selectedOrderId = null;

  function recalculateOrder(order) {
    order.paidAmount = order.payments.reduce((sum, item) => sum + parseNumber(item.amount), 0);
    order.balanceAmount = Math.max(0, order.totalAmount - order.paidAmount);
  }

  function getViewLabel(view) {
    if (view === "farmers") return "Farmer Orders";
    if (view === "suppliers") return "Supplier Orders";
    return "Company Orders";
  }

  function getFilteredOrders() {
    const query = searchInput.value.trim().toLowerCase();
    return paymentsStore[activeView].filter((order) => {
      if (!query) return true;
      return [order.partyName, order.slipNumber, order.vehicleNumber]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }

  function getSelectedOrder() {
    return paymentsStore[activeView].find((order) => order.id === selectedOrderId) || null;
  }

  function toggleModal(open) {
    modalBackdrop.classList.toggle("hidden", !open);
    document.body.classList.toggle("payments-modal-open", open);
  }

  function closeModal() {
    toggleModal(false);
    selectedOrderId = null;
  }

  function renderModal(order) {
    detailRefs.type.textContent = order.typeLabel;
    detailRefs.name.textContent = order.partyName;
    detailRefs.meta.textContent = `${formatDateForDisplay(order.orderDate)} • ${order.slipNumber} • ${order.vehicleNumber}`;
    detailRefs.balance.textContent = formatMoney(order.balanceAmount);
    detailRefs.slip.textContent = order.slipNumber;
    detailRefs.vehicle.textContent = order.vehicleNumber;
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
              <p>${escapeHtml(payment.remark || "No remark added")}</p>
            </article>
          `)
          .join("")
      : `<div class="payments-empty inline">No payments recorded yet.</div>`;
  }

  function openModal(orderId) {
    selectedOrderId = orderId;
    const order = getSelectedOrder();
    if (!order) return;
    renderModal(order);
    document.getElementById("paymentEntryDate").value = getLocalDateString();
    toggleModal(true);
  }

  function renderCards() {
    const orders = getFilteredOrders();
    listLabel.textContent = getViewLabel(activeView);
    listCount.textContent = `${orders.length} Result${orders.length === 1 ? "" : "s"}`;

    if (!orders.length) {
      cardGrid.innerHTML = `<div class="payments-empty">No matching records found.</div>`;
      return;
    }

    cardGrid.innerHTML = orders
      .map((order) => `
        <button class="payments-record-card" type="button" data-payment-order="${order.id}">
          <div class="payments-card-top">
            <strong>${escapeHtml(order.partyName)}</strong>
            <span>${escapeHtml(order.slipNumber)}</span>
          </div>
          <div class="payments-card-meta">
            <span>${formatDateForDisplay(order.orderDate)}</span>
            <span>${escapeHtml(order.vehicleNumber)}</span>
          </div>
          <div class="payments-card-grid">
            <div>
              <span>Total</span>
              <strong>${formatMoney(order.totalAmount)}</strong>
            </div>
            <div>
              <span>Pending</span>
              <strong>${formatMoney(order.balanceAmount)}</strong>
            </div>
          </div>
        </button>
      `)
      .join("");

    cardGrid.querySelectorAll("[data-payment-order]").forEach((button) => {
      button.addEventListener("click", () => openModal(button.dataset.paymentOrder));
    });
  }

  function switchView(view) {
    activeView = view;
    selectedOrderId = null;
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

  paymentForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const order = getSelectedOrder();
    if (!order) return;

    const date = document.getElementById("paymentEntryDate").value;
    const amount = parseNumber(document.getElementById("paymentEntryAmount").value);
    const mode = document.getElementById("paymentEntryMode").value;
    const reference = document.getElementById("paymentEntryReference").value.trim();
    const remark = document.getElementById("paymentEntryRemark").value.trim();

    if (!date || amount <= 0 || !mode) return;

    order.payments.unshift({ date, amount, mode, reference, remark });
    recalculateOrder(order);
    paymentForm.reset();
    document.getElementById("paymentEntryDate").value = getLocalDateString();
    renderCards();
    renderModal(order);
  });

  Object.values(paymentsStore).forEach((orders) => orders.forEach(recalculateOrder));
  switchView(activeView);
}

window.addEventListener("afterprint", () => {
  viewPanels.forEach((panel) => panel.classList.remove("print-active"));
});

initializeSettingsModule();
initializePaymentsModule();
activateView("dashboard");
