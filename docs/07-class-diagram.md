# Contrack — Class Diagram

Design-level: attributes are private with a type, methods are public with parameter and
return types. Trivial getters are omitted by convention — a field with no listed accessor
is read through the object that owns it, not exposed for direct mutation.

```mermaid
classDiagram
    class Tenant {
        -id: int
        -name: string
        -status: TenantStatus
    }
    class Customer {
        -id: int
        -name: string
        -companyName: string
        -contact: string
        -address: string
        -segment: CustomerSegment
    }
    class Contract {
        -id: int
        -signedAt: Date
        -expiresAt: Date
        -status: ContractStatus
    }
    class ContractSite {
        -id: int
        -name: string
        -workRequirements: string
        -notes: string
    }
    class ContractItem {
        -id: int
        -name: string
        -frequencyCount: int
        -frequencyUnit: FrequencyUnit
        -frequencyRule: string
        -unitPrice: decimal
    }
    class Shift {
        -id: int
        -scheduledDate: Date
        -status: ShiftStatus
        -completedAt: DateTime
        -latitude: decimal
        -longitude: decimal
        -capturedAt: DateTime
        -receiptPhotoUrl: string
        +complete(evidence: ShiftEvidence, now: DateTime) void
        +dispute() void
        +resolveDispute() void
        +reassign(assigneeId: int, scheduledDate: Date) void
    }
    class ShiftPhoto {
        -id: int
        -type: PhotoType
        -url: string
        -capturedAt: DateTime
    }
    class Statement {
        -id: int
        -period: Date
        -totalAmount: decimal
        -status: StatementStatus
        -pdfUrl: string
        +export() void
        +send() void
    }
    class Employee {
        -id: int
        -name: string
        -email: string
        -role: Role
        -status: EmployeeStatus
    }
    class Team {
        -id: int
        -name: string
        -code: string
        +lead() Employee
        +memberCount() int
    }
    class ContractCost {
        -id: int
        -category: CostCategory
        -period: Date
        -amount: decimal
    }
    class Alert {
        -id: int
        -kind: AlertKind
        -deliveryStatus: AlertDeliveryStatus
        +setDeliveryStatus(status: AlertDeliveryStatus) void
    }

    Customer "1" --> "0..*" Contract
    Contract "1" *-- "1..*" ContractSite
    ContractSite "1" *-- "1..*" ContractItem
    ContractItem "1" --> "0..*" Shift : generates
    Shift "1" *-- "0..*" ShiftPhoto
    Contract "1" --> "0..*" Statement
    Contract "1" --> "0..*" ContractCost
    Employee "1" --> "0..*" ContractCost : recorded by
    Employee "1" --> "0..*" Shift : assignee
    Employee "0..1" --> "0..*" Employee : manager
    Team "0..1" --> "0..*" Employee : members
    Tenant "1" --> "0..*" Customer
    Tenant "1" --> "0..*" Employee
    Tenant "1" --> "0..*" Team
    Tenant "1" --> "0..*" Contract
    Tenant "1" --> "0..*" Alert
```
