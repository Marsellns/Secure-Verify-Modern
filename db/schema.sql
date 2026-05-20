-- Admins table
CREATE TABLE IF NOT EXISTS Admin (
    admin_id INT PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    role VARCHAR(50) NOT NULL CHECK(role IN ('admin', 'supplier', 'customer')),
    status VARCHAR(50) DEFAULT 'approved',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Suppliers table
CREATE TABLE IF NOT EXISTS Supplier (
    supplier_id INT PRIMARY KEY AUTO_INCREMENT,
    supplier_name VARCHAR(255) NOT NULL,
    contact_info TEXT,
    address TEXT
);

-- Products table
CREATE TABLE IF NOT EXISTS Product (
    product_id VARCHAR(50) PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    description TEXT,
    production_date DATE NOT NULL,
    status VARCHAR(50) DEFAULT 'manufactured',
    supplier_id INT,
    admin_id INT,
    batch_number VARCHAR(100),
    signature VARCHAR(255),
    qr_code LONGTEXT,
    image_url LONGTEXT,
    is_suspicious TINYINT(1) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (supplier_id) REFERENCES Supplier(supplier_id) ON DELETE SET NULL,
    FOREIGN KEY (admin_id) REFERENCES Admin(admin_id) ON DELETE SET NULL
);

-- Verification Record table
CREATE TABLE IF NOT EXISTS Verification_Record (
    verification_id INT PRIMARY KEY AUTO_INCREMENT,
    product_id VARCHAR(50) NOT NULL,
    verification_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    verification_result VARCHAR(50) NOT NULL,
    checked_by VARCHAR(255),
    ip_address VARCHAR(100),
    FOREIGN KEY (product_id) REFERENCES Product(product_id) ON DELETE CASCADE
);

-- Supply chain table (adjusted for new relations)
CREATE TABLE IF NOT EXISTS supply_chain (
    record_id INT PRIMARY KEY AUTO_INCREMENT,
    product_id VARCHAR(50) NOT NULL,
    actor VARCHAR(255) NOT NULL,
    actor_id INT,
    status VARCHAR(50) NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES Product(product_id) ON DELETE CASCADE,
    FOREIGN KEY (actor_id) REFERENCES Admin(admin_id) ON DELETE SET NULL
);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    log_id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT,
    action VARCHAR(255) NOT NULL,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    ip_address VARCHAR(100),
    FOREIGN KEY (user_id) REFERENCES Admin(admin_id) ON DELETE SET NULL
);

-- Alter tables to support large base64 strings if they were created with TEXT previously
ALTER TABLE Product MODIFY image_url LONGTEXT;
ALTER TABLE Product MODIFY qr_code LONGTEXT;
