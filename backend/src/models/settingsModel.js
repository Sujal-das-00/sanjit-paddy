const { query } = require('../config/database');

async function listRiceTypes() {
  return query('SELECT * FROM rice_types WHERE is_active = 1 ORDER BY name ASC');
}

async function createRiceType(payload) {
  const result = await query('INSERT INTO rice_types (name) VALUES (?)', [payload.name.trim()]);
  return { id: result.insertId, name: payload.name.trim() };
}

async function listFarmers() {
  return query('SELECT * FROM farmers WHERE is_active = 1 ORDER BY name ASC');
}

async function createFarmer(payload) {
  const result = await query(
    'INSERT INTO farmers (name, mobile, village, address, aadhar_number) VALUES (?, ?, ?, ?, ?)',
    [payload.name.trim(), payload.mobile || null, payload.village || null, payload.address || null, payload.aadharNumber || null]
  );
  return { id: result.insertId, ...payload };
}

async function listSuppliers() {
  return query('SELECT * FROM suppliers WHERE is_active = 1 ORDER BY name ASC');
}

async function createSupplier(payload) {
  const result = await query(
    'INSERT INTO suppliers (name, mobile, pan_number, aadhar_number, address) VALUES (?, ?, ?, ?, ?)',
    [payload.name.trim(), payload.mobile || null, payload.panNumber || null, payload.aadharNumber || null, payload.address || null]
  );
  return { id: result.insertId, ...payload };
}

async function listDrivers() {
  return query('SELECT * FROM drivers WHERE is_active = 1 ORDER BY name ASC');
}

async function createDriver(payload) {
  const result = await query(
    'INSERT INTO drivers (name, mobile, license_number) VALUES (?, ?, ?)',
    [payload.name.trim(), payload.mobile || null, payload.licenseNumber || null]
  );
  return { id: result.insertId, ...payload };
}

async function listCompanies() {
  return query('SELECT * FROM companies WHERE is_active = 1 ORDER BY name ASC');
}

async function createCompany(payload) {
  const result = await query(
    'INSERT INTO companies (name, mobile, contact_person, address, gst_number) VALUES (?, ?, ?, ?, ?)',
    [payload.name.trim(), payload.mobile || null, payload.contactPerson || null, payload.address || null, payload.gstNumber || null]
  );
  return { id: result.insertId, ...payload };
}

module.exports = {
  listRiceTypes,
  createRiceType,
  listFarmers,
  createFarmer,
  listSuppliers,
  createSupplier,
  listDrivers,
  createDriver,
  listCompanies,
  createCompany,
};
