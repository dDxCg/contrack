-- LichHD — PostgreSQL schema (status dùng ENUM native)

CREATE TYPE customer_segment AS ENUM ('regular', 'vip');
CREATE TYPE employee_status AS ENUM ('active', 'terminated');
CREATE TYPE contract_status AS ENUM ('active', 'expiring_soon', 'expired', 'cancelled', 'renewed');
CREATE TYPE shift_status AS ENUM ('scheduled', 'late', 'completed', 'disputed');
CREATE TYPE photo_type AS ENUM ('before', 'after');
CREATE TYPE statement_status AS ENUM ('draft', 'issued', 'sent');

-- Vai trò
CREATE TABLE roles (
    id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name    VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO roles (name) VALUES ('giam_doc');
INSERT INTO roles (name) VALUES ('ke_toan');
INSERT INTO roles (name) VALUES ('quan_ly');
INSERT INTO roles (name) VALUES ('to_truong');
INSERT INTO roles (name) VALUES ('nhan_vien');

-- Khách
CREATE TABLE customers (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    company_name    VARCHAR(255),
    contact         VARCHAR(255),
    address         VARCHAR(500),
    segment         customer_segment NOT NULL DEFAULT 'regular',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Nhân viên
CREATE TABLE employees (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    contact         VARCHAR(255),
    username        VARCHAR(100) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    role_id         INTEGER NOT NULL,
    manager_id      INTEGER,
    status          employee_status NOT NULL DEFAULT 'active',
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_employees_role FOREIGN KEY (role_id) REFERENCES roles(id),
    CONSTRAINT fk_employees_manager FOREIGN KEY (manager_id) REFERENCES employees(id)
);

CREATE INDEX idx_employees_manager ON employees(manager_id);

-- Hợp đồng
CREATE TABLE contracts (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    signed_at   DATE NOT NULL,
    expires_at  DATE NOT NULL,
    status      contract_status NOT NULL DEFAULT 'active',
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_contracts_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE INDEX idx_contracts_customer ON contracts(customer_id);
CREATE INDEX idx_contracts_expires_at ON contracts(expires_at);

-- Địa điểm hợp đồng
CREATE TABLE contract_sites (
    id                  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    contract_id         INTEGER NOT NULL,
    name                VARCHAR(255) NOT NULL,
    work_requirements   VARCHAR(2000),
    notes               VARCHAR(2000),
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_contract_sites_contract FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE
);

CREATE INDEX idx_contract_sites_contract ON contract_sites(contract_id);

-- Hạng mục hợp đồng
CREATE TABLE contract_items (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    site_id     INTEGER NOT NULL,
    name        VARCHAR(255) NOT NULL,
    frequency   VARCHAR(100) NOT NULL,
    unit_price  NUMERIC(14, 2) NOT NULL,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_contract_items_site FOREIGN KEY (site_id) REFERENCES contract_sites(id) ON DELETE CASCADE
);

CREATE INDEX idx_contract_items_site ON contract_items(site_id);

-- Ca làm
CREATE TABLE shifts (
    id                      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    contract_item_id        INTEGER NOT NULL,
    assignee_id             INTEGER NOT NULL,
    scheduled_date          DATE NOT NULL,
    completed_at            TIMESTAMP,
    status                  shift_status NOT NULL DEFAULT 'scheduled',
    customer_signature      VARCHAR(2000),
    latitude                NUMERIC(9, 6),
    longitude               NUMERIC(9, 6),
    captured_at             TIMESTAMP,
    confirmation_doc_url    VARCHAR(500),
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_shifts_contract_item FOREIGN KEY (contract_item_id) REFERENCES contract_items(id) ON DELETE CASCADE,
    CONSTRAINT fk_shifts_assignee FOREIGN KEY (assignee_id) REFERENCES employees(id)
);

CREATE INDEX idx_shifts_contract_item ON shifts(contract_item_id);
CREATE INDEX idx_shifts_assignee ON shifts(assignee_id);
CREATE INDEX idx_shifts_scheduled_date ON shifts(scheduled_date);

-- Ảnh ca làm
CREATE TABLE shift_photos (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    shift_id    INTEGER NOT NULL,
    type        photo_type NOT NULL,
    url         VARCHAR(500) NOT NULL,
    captured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_shift_photos_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE
);

CREATE INDEX idx_shift_photos_shift ON shift_photos(shift_id);

-- Bảng kê
CREATE TABLE statements (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    contract_id     INTEGER NOT NULL,
    period          DATE NOT NULL,
    total_amount    NUMERIC(14, 2) NOT NULL DEFAULT 0,
    status          statement_status NOT NULL DEFAULT 'draft',
    pdf_url         VARCHAR(500),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_statements_contract FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    CONSTRAINT uq_statements_contract_period UNIQUE (contract_id, period)
);

CREATE INDEX idx_statements_contract ON statements(contract_id);
