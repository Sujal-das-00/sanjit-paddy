CREATE DATABASE IF NOT EXISTS paddy_management;
USE toolszil_paddy;

CREATE TABLE IF NOT EXISTS rice_types (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL UNIQUE,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS farmers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  mobile VARCHAR(20),
  village VARCHAR(160),
  address TEXT,
  aadhar_number VARCHAR(32),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_farmer_name_mobile (name, mobile)
);

CREATE TABLE IF NOT EXISTS suppliers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  mobile VARCHAR(20),
  pan_number VARCHAR(32),
  aadhar_number VARCHAR(32),
  address TEXT,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_supplier_name_mobile (name, mobile)
);

CREATE TABLE IF NOT EXISTS supplier_account_numbers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  supplier_id BIGINT NOT NULL,
  account_number VARCHAR(160) NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_supplier_account_numbers_supplier (supplier_id),
  UNIQUE KEY uniq_supplier_account_number (supplier_id, account_number),
  CONSTRAINT fk_supplier_account_numbers_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS drivers (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(160) NOT NULL,
  mobile VARCHAR(20),
  license_number VARCHAR(40),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_driver_name_mobile (name, mobile)
);

CREATE TABLE IF NOT EXISTS companies (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(180) NOT NULL,
  mobile VARCHAR(20),
  contact_person VARCHAR(160),
  address TEXT,
  gst_number VARCHAR(40),
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_company_name_mobile (name, mobile)
);

CREATE TABLE IF NOT EXISTS users (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  username VARCHAR(60) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  password_salt VARCHAR(64) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

INSERT INTO users (username, password_hash, password_salt)
SELECT 'admin', 'a9f64d7e0c2a4e719871de46c4d73f6684728ccf42cfe2db7b6a767415c571808b3e4631d24f082f5c579b7e6b2a9e28bae7bd3733b8ff521040fda18ec8726a', '9b5d7e3a1c4f6a8b'
WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'admin');

CREATE TABLE IF NOT EXISTS slips (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  module_type ENUM('godown','home','selling') NOT NULL,
  slip_number VARCHAR(60) NOT NULL,
  entry_date DATE NOT NULL,
  vehicle_number VARCHAR(40),
  farmer_id BIGINT NULL,
  supplier_id BIGINT NULL,
  company_id BIGINT NULL,
  driver_id BIGINT NULL,
  farmer_name_snapshot VARCHAR(160),
  supplier_name_snapshot VARCHAR(160),
  company_name_snapshot VARCHAR(180),
  driver_name_snapshot VARCHAR(160),
  gross_weight DECIMAL(12,2) NOT NULL DEFAULT 0,
  dust_deduction DECIMAL(12,2) NOT NULL DEFAULT 0,
  moisture_deduction DECIMAL(12,2) NOT NULL DEFAULT 0,
  final_weight DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_weight DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_bags INT NOT NULL DEFAULT 0,
  average_weight DECIMAL(12,2) NOT NULL DEFAULT 0,
  moisture_note TEXT,
  loading_discount DECIMAL(12,2) NOT NULL DEFAULT 0,
  advance_payment DECIMAL(12,2) NOT NULL DEFAULT 0,
  purchase_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  final_payable DECIMAL(12,2) NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uniq_module_slip (module_type, slip_number),
  KEY idx_slips_entry_date (entry_date),
  KEY idx_slips_farmer (farmer_id),
  KEY idx_slips_supplier (supplier_id),
  KEY idx_slips_company (company_id),
  KEY idx_slips_driver (driver_id),
  CONSTRAINT fk_slips_farmer FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE SET NULL,
  CONSTRAINT fk_slips_supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL,
  CONSTRAINT fk_slips_company FOREIGN KEY (company_id) REFERENCES companies(id) ON DELETE SET NULL,
  CONSTRAINT fk_slips_driver FOREIGN KEY (driver_id) REFERENCES drivers(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS slip_items (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  slip_id BIGINT NOT NULL,
  rice_type_id BIGINT NULL,
  rice_type_name_snapshot VARCHAR(120) NOT NULL,
  bag_count INT NOT NULL DEFAULT 0,
  weight_per_bag DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_weight DECIMAL(12,2) NOT NULL DEFAULT 0,
  rate_per_kg DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_slip_items_slip (slip_id),
  KEY idx_slip_items_rice_type (rice_type_id),
  CONSTRAINT fk_slip_items_slip FOREIGN KEY (slip_id) REFERENCES slips(id) ON DELETE CASCADE,
  CONSTRAINT fk_slip_items_rice_type FOREIGN KEY (rice_type_id) REFERENCES rice_types(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  slip_id BIGINT NULL,
  party_view ENUM('farmers','suppliers','company') NULL,
  party_name VARCHAR(180) NULL,
  payment_date DATE NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  bank_account VARCHAR(160),
  mode ENUM('Cash','UPI','Bank Transfer','Cheque','Other') NOT NULL DEFAULT 'Cash',
  reference_code VARCHAR(120),
  remark TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_payments_slip (slip_id),
  KEY idx_payments_date (payment_date),
  KEY idx_payments_party (party_view, party_name),
  KEY idx_payments_bank_account (bank_account),
  KEY idx_payments_reference_code (reference_code),
  CONSTRAINT fk_payments_slip FOREIGN KEY (slip_id) REFERENCES slips(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payment_allocations (
  id BIGINT PRIMARY KEY AUTO_INCREMENT,
  payment_id BIGINT NOT NULL,
  slip_id BIGINT NOT NULL,
  allocated_amount DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_payment_allocations_payment (payment_id),
  KEY idx_payment_allocations_slip (slip_id),
  CONSTRAINT fk_payment_allocations_payment FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE CASCADE,
  CONSTRAINT fk_payment_allocations_slip FOREIGN KEY (slip_id) REFERENCES slips(id) ON DELETE CASCADE
);

CREATE OR REPLACE VIEW vw_slip_payment_summary AS
SELECT
  s.id AS slip_id,
  COALESCE(s.advance_payment, 0) + COALESCE(SUM(pa.allocated_amount), 0) AS paid_amount,
  GREATEST(COALESCE(s.final_payable, 0) - COALESCE(SUM(pa.allocated_amount), 0), 0) AS balance_amount
FROM slips s
LEFT JOIN payment_allocations pa ON pa.slip_id = s.id
GROUP BY s.id, s.final_payable, s.advance_payment;
