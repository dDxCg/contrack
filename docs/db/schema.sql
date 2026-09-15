-- LichHD — ANSI SQL

-- Roles
CREATE TABLE roles (
    id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name    VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO roles (name) VALUES ('director');
INSERT INTO roles (name) VALUES ('accountant');
INSERT INTO roles (name) VALUES ('manager');
INSERT INTO roles (name) VALUES ('team_lead');
INSERT INTO roles (name) VALUES ('employee');

-- Phân khúc khách
CREATE TABLE customer_segments (
    id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code    VARCHAR(20) NOT NULL UNIQUE
);

INSERT INTO customer_segments (code) VALUES ('regular');
INSERT INTO customer_segments (code) VALUES ('vip');

-- Trạng thái nhân viên
CREATE TABLE employee_statuses (
    id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code    VARCHAR(20) NOT NULL UNIQUE
);

INSERT INTO employee_statuses (code) VALUES ('active');
INSERT INTO employee_statuses (code) VALUES ('terminated');

-- Trạng thái hợp đồng
CREATE TABLE contract_statuses (
    id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code    VARCHAR(20) NOT NULL UNIQUE
);

INSERT INTO contract_statuses (code) VALUES ('active');
INSERT INTO contract_statuses (code) VALUES ('expiring_soon');
INSERT INTO contract_statuses (code) VALUES ('expired');
INSERT INTO contract_statuses (code) VALUES ('cancelled');
INSERT INTO contract_statuses (code) VALUES ('renewed');

-- Trạng thái ca làm
CREATE TABLE shift_statuses (
    id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code    VARCHAR(20) NOT NULL UNIQUE
);

INSERT INTO shift_statuses (code) VALUES ('scheduled');
INSERT INTO shift_statuses (code) VALUES ('late');
INSERT INTO shift_statuses (code) VALUES ('completed');
INSERT INTO shift_statuses (code) VALUES ('disputed');

-- Loại ảnh ca làm
CREATE TABLE photo_types (
    id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code    VARCHAR(20) NOT NULL UNIQUE
);

INSERT INTO photo_types (code) VALUES ('before');
INSERT INTO photo_types (code) VALUES ('after');

-- Trạng thái bảng kê
CREATE TABLE statement_statuses (
    id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code    VARCHAR(20) NOT NULL UNIQUE
);

INSERT INTO statement_statuses (code) VALUES ('draft');
INSERT INTO statement_statuses (code) VALUES ('issued');
INSERT INTO statement_statuses (code) VALUES ('sent');

-- Khách
CREATE TABLE customers (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    company_name    VARCHAR(255),
    contact         VARCHAR(255),
    address         VARCHAR(500),
    segment_id      INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customers_segment FOREIGN KEY (segment_id) REFERENCES customer_segments(id)
);

CREATE INDEX idx_customers_segment ON customers(segment_id);

CREATE TABLE teams (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            VARCHAR(100) NOT NULL,
    code            VARCHAR(20) NOT NULL UNIQUE,
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
    team_id         INTEGER,  -- NULL với khối văn phòng: không thuộc tổ nào
    status_id       INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_employees_role FOREIGN KEY (role_id) REFERENCES roles(id),
    CONSTRAINT fk_employees_manager FOREIGN KEY (manager_id) REFERENCES employees(id),
    CONSTRAINT fk_employees_team FOREIGN KEY (team_id) REFERENCES teams(id),
    CONSTRAINT fk_employees_status FOREIGN KEY (status_id) REFERENCES employee_statuses(id)
);

CREATE INDEX idx_employees_team ON employees(team_id);
CREATE INDEX idx_employees_manager ON employees(manager_id);
CREATE INDEX idx_employees_status ON employees(status_id);

-- Hợp đồng
CREATE TABLE contracts (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    customer_id INTEGER NOT NULL,
    signed_at   DATE NOT NULL,
    expires_at  DATE NOT NULL,
    status_id   INTEGER NOT NULL DEFAULT 1,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_contracts_customer FOREIGN KEY (customer_id) REFERENCES customers(id),
    CONSTRAINT fk_contracts_status FOREIGN KEY (status_id) REFERENCES contract_statuses(id)
);

CREATE INDEX idx_contracts_customer ON contracts(customer_id);
CREATE INDEX idx_contracts_status ON contracts(status_id);
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
    status_id               INTEGER NOT NULL DEFAULT 1,
    latitude                NUMERIC(9, 6),
    longitude               NUMERIC(9, 6),
    captured_at             TIMESTAMP,
    receipt_photo_url       VARCHAR(500),
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_shifts_contract_item FOREIGN KEY (contract_item_id) REFERENCES contract_items(id) ON DELETE CASCADE,
    CONSTRAINT fk_shifts_assignee FOREIGN KEY (assignee_id) REFERENCES employees(id),
    CONSTRAINT fk_shifts_status FOREIGN KEY (status_id) REFERENCES shift_statuses(id)
);

CREATE INDEX idx_shifts_contract_item ON shifts(contract_item_id);
CREATE INDEX idx_shifts_assignee ON shifts(assignee_id);
CREATE INDEX idx_shifts_status ON shifts(status_id);
CREATE INDEX idx_shifts_scheduled_date ON shifts(scheduled_date);

-- Ảnh ca làm
CREATE TABLE shift_photos (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    shift_id    INTEGER NOT NULL,
    type_id     INTEGER NOT NULL,
    url         VARCHAR(500) NOT NULL,
    captured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_shift_photos_shift FOREIGN KEY (shift_id) REFERENCES shifts(id) ON DELETE CASCADE,
    CONSTRAINT fk_shift_photos_type FOREIGN KEY (type_id) REFERENCES photo_types(id)
);

CREATE INDEX idx_shift_photos_shift ON shift_photos(shift_id);
CREATE INDEX idx_shift_photos_type ON shift_photos(type_id);

-- Bảng kê
CREATE TABLE statements (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    contract_id     INTEGER NOT NULL,
    period          DATE NOT NULL,
    total_amount    NUMERIC(14, 2) NOT NULL DEFAULT 0,
    status_id       INTEGER NOT NULL DEFAULT 1,
    pdf_url         VARCHAR(500),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_statements_contract FOREIGN KEY (contract_id) REFERENCES contracts(id) ON DELETE CASCADE,
    CONSTRAINT fk_statements_status FOREIGN KEY (status_id) REFERENCES statement_statuses(id),
    CONSTRAINT uq_statements_contract_period UNIQUE (contract_id, period)
);

CREATE INDEX idx_statements_contract ON statements(contract_id);
CREATE INDEX idx_statements_status ON statements(status_id);
