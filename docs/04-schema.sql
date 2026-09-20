CREATE TABLE tenant_statuses (
    id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code    VARCHAR(20) NOT NULL UNIQUE
);

INSERT INTO tenant_statuses (code) VALUES ('active');
INSERT INTO tenant_statuses (code) VALUES ('suspended');

CREATE TABLE tenants (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name        VARCHAR(255) NOT NULL,
    status_id   INTEGER NOT NULL DEFAULT 1,
    timezone    VARCHAR(64) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_tenants_status FOREIGN KEY (status_id) REFERENCES tenant_statuses(id)
);

CREATE INDEX idx_tenants_status ON tenants(status_id);

CREATE TABLE platform_admins (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name            VARCHAR(255) NOT NULL,
    username        VARCHAR(100) NOT NULL UNIQUE,
    password_hash   VARCHAR(255) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE roles (
    id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code    VARCHAR(50) NOT NULL UNIQUE
);

INSERT INTO roles (code) VALUES ('director');
INSERT INTO roles (code) VALUES ('accountant');
INSERT INTO roles (code) VALUES ('manager');
INSERT INTO roles (code) VALUES ('team_lead');
INSERT INTO roles (code) VALUES ('employee');

CREATE TABLE customer_segments (
    id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code    VARCHAR(20) NOT NULL UNIQUE
);

INSERT INTO customer_segments (code) VALUES ('regular');
INSERT INTO customer_segments (code) VALUES ('vip');

CREATE TABLE employee_statuses (
    id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code    VARCHAR(20) NOT NULL UNIQUE
);

INSERT INTO employee_statuses (code) VALUES ('active');
INSERT INTO employee_statuses (code) VALUES ('terminated');

CREATE TABLE contract_statuses (
    id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code    VARCHAR(20) NOT NULL UNIQUE
);

INSERT INTO contract_statuses (code) VALUES ('active');
INSERT INTO contract_statuses (code) VALUES ('expired');
INSERT INTO contract_statuses (code) VALUES ('cancelled');
INSERT INTO contract_statuses (code) VALUES ('renewed');

CREATE TABLE shift_statuses (
    id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code    VARCHAR(20) NOT NULL UNIQUE
);

INSERT INTO shift_statuses (code) VALUES ('scheduled');
INSERT INTO shift_statuses (code) VALUES ('late');
INSERT INTO shift_statuses (code) VALUES ('completed');
INSERT INTO shift_statuses (code) VALUES ('disputed');

CREATE TABLE frequency_units (
    id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code    VARCHAR(20) NOT NULL UNIQUE
);

INSERT INTO frequency_units (code) VALUES ('day');
INSERT INTO frequency_units (code) VALUES ('week');
INSERT INTO frequency_units (code) VALUES ('month');
INSERT INTO frequency_units (code) VALUES ('quarter');
INSERT INTO frequency_units (code) VALUES ('year');

CREATE TABLE cost_categories (
    id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code    VARCHAR(20) NOT NULL UNIQUE
);

INSERT INTO cost_categories (code) VALUES ('labor');
INSERT INTO cost_categories (code) VALUES ('materials');
INSERT INTO cost_categories (code) VALUES ('other');

CREATE TABLE photo_types (
    id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code    VARCHAR(20) NOT NULL UNIQUE
);

INSERT INTO photo_types (code) VALUES ('before');
INSERT INTO photo_types (code) VALUES ('after');

CREATE TABLE alert_kinds (
    id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code    VARCHAR(30) NOT NULL UNIQUE
);

INSERT INTO alert_kinds (code) VALUES ('contract_expiring');
INSERT INTO alert_kinds (code) VALUES ('shift_overdue');
INSERT INTO alert_kinds (code) VALUES ('site_overload');

CREATE TABLE alert_delivery_statuses (
    id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code    VARCHAR(20) NOT NULL UNIQUE
);

INSERT INTO alert_delivery_statuses (code) VALUES ('sent');
INSERT INTO alert_delivery_statuses (code) VALUES ('not_sent');
INSERT INTO alert_delivery_statuses (code) VALUES ('fallback');

CREATE TABLE statement_statuses (
    id      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    code    VARCHAR(20) NOT NULL UNIQUE
);

INSERT INTO statement_statuses (code) VALUES ('draft');
INSERT INTO statement_statuses (code) VALUES ('issued');
INSERT INTO statement_statuses (code) VALUES ('sent');

CREATE TABLE customers (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id       INTEGER NOT NULL,
    name            VARCHAR(255) NOT NULL,
    company_name    VARCHAR(255),
    contact         VARCHAR(255),
    address         VARCHAR(500),
    segment_id      INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_customers_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_customers_segment FOREIGN KEY (segment_id) REFERENCES customer_segments(id),
    CONSTRAINT uq_customers_id_tenant UNIQUE (id, tenant_id)
);

CREATE INDEX idx_customers_tenant ON customers(tenant_id);
CREATE INDEX idx_customers_segment ON customers(segment_id);

CREATE TABLE teams (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id       INTEGER NOT NULL,
    name            VARCHAR(100) NOT NULL,
    code            VARCHAR(20) NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_teams_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT uq_teams_tenant_code UNIQUE (tenant_id, code),
    CONSTRAINT uq_teams_id_tenant UNIQUE (id, tenant_id)
);

CREATE INDEX idx_teams_tenant ON teams(tenant_id);

CREATE TABLE employees (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id       INTEGER NOT NULL,
    name            VARCHAR(255) NOT NULL,
    contact         VARCHAR(255),
    email           VARCHAR(255) NOT NULL,
    password_hash   VARCHAR(255) NOT NULL,
    role_id         INTEGER NOT NULL,
    manager_id      INTEGER,
    team_id         INTEGER,
    status_id       INTEGER NOT NULL DEFAULT 1,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_employees_id_tenant UNIQUE (id, tenant_id),
    CONSTRAINT fk_employees_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_employees_role FOREIGN KEY (role_id) REFERENCES roles(id),
    CONSTRAINT fk_employees_manager FOREIGN KEY (manager_id, tenant_id) REFERENCES employees(id, tenant_id),
    CONSTRAINT fk_employees_team FOREIGN KEY (team_id, tenant_id) REFERENCES teams(id, tenant_id),
    CONSTRAINT fk_employees_status FOREIGN KEY (status_id) REFERENCES employee_statuses(id),
    CONSTRAINT uq_employees_email UNIQUE (email)
);

CREATE INDEX idx_employees_tenant ON employees(tenant_id);
CREATE INDEX idx_employees_team ON employees(team_id);
CREATE INDEX idx_employees_manager ON employees(manager_id);
CREATE INDEX idx_employees_status ON employees(status_id);

CREATE TABLE contracts (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id   INTEGER NOT NULL,
    customer_id INTEGER NOT NULL,
    signed_at   DATE NOT NULL,
    expires_at  DATE NOT NULL,
    status_id   INTEGER NOT NULL DEFAULT 1,
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_contracts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_contracts_customer FOREIGN KEY (customer_id, tenant_id) REFERENCES customers(id, tenant_id),
    CONSTRAINT fk_contracts_status FOREIGN KEY (status_id) REFERENCES contract_statuses(id),
    CONSTRAINT uq_contracts_id_tenant UNIQUE (id, tenant_id)
);

CREATE INDEX idx_contracts_tenant ON contracts(tenant_id);
CREATE INDEX idx_contracts_customer ON contracts(customer_id);
CREATE INDEX idx_contracts_status ON contracts(status_id);
CREATE INDEX idx_contracts_expires_at ON contracts(expires_at);

CREATE TABLE contract_sites (
    id                  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id           INTEGER NOT NULL,
    contract_id         INTEGER NOT NULL,
    name                VARCHAR(255) NOT NULL,
    work_requirements   VARCHAR(2000),
    notes               VARCHAR(2000),
    latitude            NUMERIC(9, 6),
    longitude           NUMERIC(9, 6),
    radius_meters       INTEGER NOT NULL DEFAULT 200,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_contract_sites_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_contract_sites_contract FOREIGN KEY (contract_id, tenant_id) REFERENCES contracts(id, tenant_id) ON DELETE CASCADE,
    CONSTRAINT uq_contract_sites_id_tenant UNIQUE (id, tenant_id)
);

CREATE INDEX idx_contract_sites_tenant ON contract_sites(tenant_id);
CREATE INDEX idx_contract_sites_contract ON contract_sites(contract_id);

CREATE TABLE contract_items (
    id                  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id           INTEGER NOT NULL,
    site_id             INTEGER NOT NULL,
    name                VARCHAR(255) NOT NULL,
    frequency_count     INTEGER NOT NULL,
    frequency_unit_id   INTEGER NOT NULL,
    frequency_rule      VARCHAR(255),
    day_of_week         SMALLINT,
    day_of_month        SMALLINT,
    unit_price          NUMERIC(14, 2) NOT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_contract_items_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_contract_items_site FOREIGN KEY (site_id, tenant_id) REFERENCES contract_sites(id, tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_contract_items_frequency_unit FOREIGN KEY (frequency_unit_id) REFERENCES frequency_units(id),
    CONSTRAINT uq_contract_items_id_tenant UNIQUE (id, tenant_id),
    CONSTRAINT ck_contract_items_day_of_week_range CHECK (day_of_week IS NULL OR day_of_week BETWEEN 0 AND 6),
    CONSTRAINT ck_contract_items_day_of_month_range CHECK (day_of_month IS NULL OR day_of_month BETWEEN 1 AND 31),
    CONSTRAINT ck_contract_items_day_constraint_exclusive CHECK (day_of_week IS NULL OR day_of_month IS NULL)
);

CREATE INDEX idx_contract_items_tenant ON contract_items(tenant_id);
CREATE INDEX idx_contract_items_site ON contract_items(site_id);

CREATE TABLE shifts (
    id                      INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id               INTEGER NOT NULL,
    contract_item_id        INTEGER NOT NULL,
    assignee_id             INTEGER,
    scheduled_date          DATE NOT NULL,
    completed_at            TIMESTAMP,
    status_id               INTEGER NOT NULL DEFAULT 1,
    latitude                NUMERIC(9, 6),
    longitude               NUMERIC(9, 6),
    captured_at             TIMESTAMP,
    receipt_photo_url       VARCHAR(500),
    geo_verified            BOOLEAN NOT NULL DEFAULT FALSE,
    field_token_used_at     TIMESTAMP,
    created_at              TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_shifts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_shifts_contract_item FOREIGN KEY (contract_item_id, tenant_id) REFERENCES contract_items(id, tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_shifts_assignee FOREIGN KEY (assignee_id, tenant_id) REFERENCES employees(id, tenant_id),
    CONSTRAINT fk_shifts_status FOREIGN KEY (status_id) REFERENCES shift_statuses(id),
    CONSTRAINT uq_shifts_id_tenant UNIQUE (id, tenant_id)
);

CREATE INDEX idx_shifts_tenant ON shifts(tenant_id);
CREATE INDEX idx_shifts_contract_item ON shifts(contract_item_id);
CREATE INDEX idx_shifts_assignee ON shifts(assignee_id);
CREATE INDEX idx_shifts_status ON shifts(status_id);
CREATE INDEX idx_shifts_scheduled_date ON shifts(scheduled_date);

CREATE TABLE shift_photos (
    id          INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id   INTEGER NOT NULL,
    shift_id    INTEGER NOT NULL,
    type_id     INTEGER NOT NULL,
    url         VARCHAR(500) NOT NULL,
    captured_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_shift_photos_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_shift_photos_shift FOREIGN KEY (shift_id, tenant_id) REFERENCES shifts(id, tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_shift_photos_type FOREIGN KEY (type_id) REFERENCES photo_types(id)
);

CREATE INDEX idx_shift_photos_tenant ON shift_photos(tenant_id);
CREATE INDEX idx_shift_photos_shift ON shift_photos(shift_id);
CREATE INDEX idx_shift_photos_type ON shift_photos(type_id);

CREATE TABLE statements (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id       INTEGER NOT NULL,
    contract_id     INTEGER NOT NULL,
    period          DATE NOT NULL,
    total_amount    NUMERIC(14, 2) NOT NULL DEFAULT 0,
    status_id       INTEGER NOT NULL DEFAULT 1,
    pdf_url         VARCHAR(500),
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_statements_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_statements_contract FOREIGN KEY (contract_id, tenant_id) REFERENCES contracts(id, tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_statements_status FOREIGN KEY (status_id) REFERENCES statement_statuses(id),
    CONSTRAINT uq_statements_contract_period UNIQUE (contract_id, period),
    CONSTRAINT ck_statements_period_is_month_start CHECK (period = date_trunc('month', period)::date)
);

CREATE INDEX idx_statements_tenant ON statements(tenant_id);
CREATE INDEX idx_statements_contract ON statements(contract_id);
CREATE INDEX idx_statements_status ON statements(status_id);

CREATE TABLE contract_costs (
    id              INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id       INTEGER NOT NULL,
    contract_id     INTEGER NOT NULL,
    category_id     INTEGER NOT NULL,
    period          DATE NOT NULL,
    amount          NUMERIC(14, 2) NOT NULL,
    created_by      INTEGER NOT NULL,
    created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_contract_costs_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_contract_costs_contract FOREIGN KEY (contract_id, tenant_id) REFERENCES contracts(id, tenant_id) ON DELETE CASCADE,
    CONSTRAINT fk_contract_costs_category FOREIGN KEY (category_id) REFERENCES cost_categories(id),
    CONSTRAINT fk_contract_costs_created_by FOREIGN KEY (created_by, tenant_id) REFERENCES employees(id, tenant_id),
    CONSTRAINT uq_contract_costs_period UNIQUE (contract_id, category_id, period),
    CONSTRAINT ck_contract_costs_period_is_month_start CHECK (period = date_trunc('month', period)::date)
);

CREATE INDEX idx_contract_costs_tenant ON contract_costs(tenant_id);
CREATE INDEX idx_contract_costs_contract ON contract_costs(contract_id);
CREATE INDEX idx_contract_costs_period ON contract_costs(period);

-- subject_id is a contract id when kind = contract_expiring, a shift id when kind = shift_overdue
-- (no FK — polymorphic by kind, mirrors 05-api.yaml's Alert schema). The unique constraint is what
-- makes "one alert per contract/shift, never re-fires" (US-12, US-13) a DB guarantee rather than
-- application state the alert job has to remember across runs.
CREATE TABLE alerts (
    id                  INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    tenant_id           INTEGER NOT NULL,
    kind_id             INTEGER NOT NULL,
    subject_id          INTEGER NOT NULL,
    delivery_status_id  INTEGER NOT NULL,
    created_at          TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_alerts_tenant FOREIGN KEY (tenant_id) REFERENCES tenants(id),
    CONSTRAINT fk_alerts_kind FOREIGN KEY (kind_id) REFERENCES alert_kinds(id),
    CONSTRAINT fk_alerts_delivery_status FOREIGN KEY (delivery_status_id) REFERENCES alert_delivery_statuses(id),
    CONSTRAINT uq_alerts_kind_subject UNIQUE (tenant_id, kind_id, subject_id)
);

CREATE INDEX idx_alerts_tenant ON alerts(tenant_id);
