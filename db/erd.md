# ERD

```mermaid
erDiagram
    roles ||--o{ employees : "assigned to"
    employees ||--o{ employees : "manages"
    employee_statuses ||--o{ employees : "status of"
    customer_segments ||--o{ customers : "status of"
    customers ||--o{ contracts : "signs"
    contract_statuses ||--o{ contracts : "status of"
    contracts ||--o{ contract_sites : "has"
    contract_sites ||--o{ contract_items : "has"
    contract_items ||--o{ shifts : "generates"
    employees ||--o{ shifts : "assigned"
    shift_statuses ||--o{ shifts : "status of"
    shifts ||--o{ shift_photos : "has"
    photo_types ||--o{ shift_photos : "type of"
    contracts ||--o{ statements : "has"
    statement_statuses ||--o{ statements : "status of"

    roles {
        int id PK
        varchar name
    }

    customer_segments {
        int id PK
        varchar code
    }

    employee_statuses {
        int id PK
        varchar code
    }

    contract_statuses {
        int id PK
        varchar code
    }

    shift_statuses {
        int id PK
        varchar code
    }

    photo_types {
        int id PK
        varchar code
    }

    statement_statuses {
        int id PK
        varchar code
    }

    customers {
        int id PK
        varchar name
        varchar company_name
        varchar contact
        varchar address
        int segment_id FK
        timestamp created_at
    }

    employees {
        int id PK
        varchar name
        varchar contact
        varchar username
        varchar password_hash
        int role_id FK
        int manager_id FK
        int status_id FK
        timestamp created_at
    }

    contracts {
        int id PK
        int customer_id FK
        date signed_at
        date expires_at
        int status_id FK
        timestamp created_at
    }

    contract_sites {
        int id PK
        int contract_id FK
        varchar name
        varchar work_requirements
        varchar notes
        timestamp created_at
    }

    contract_items {
        int id PK
        int site_id FK
        varchar name
        varchar frequency
        numeric unit_price
        timestamp created_at
    }

    shifts {
        int id PK
        int contract_item_id FK
        int assignee_id FK
        date scheduled_date
        timestamp completed_at
        int status_id FK
        numeric latitude
        numeric longitude
        timestamp captured_at
        varchar receipt_photo_url
        timestamp created_at
    }

    shift_photos {
        int id PK
        int shift_id FK
        int type_id FK
        varchar url
        timestamp captured_at
    }

    statements {
        int id PK
        int contract_id FK
        date period
        numeric total_amount
        int status_id FK
        varchar pdf_url
        timestamp created_at
    }
```
