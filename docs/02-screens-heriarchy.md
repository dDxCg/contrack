# Contrack — Screens Hierarchy
**All roles**
```
Login  (pre-auth, all roles — FR1)
```

**Director** — home: Dashboard
```
Dashboard                             
Contracts
├── Contract detail                    
└── New / edit contract                
Shifts & Disputes
├── Shift detail (evidence review)     
└── Record dispute                     
Reconciliation                         
Profit/Loss (per contract, by month)   
Employees & Teams
├── New / edit employee                
└── New / edit team                    
Customers
├── New / edit customer                
└── delete customer
Alerts                                
```

**Manager** — home: Contracts
```
Contracts
├── Contract detail
└── New / edit contract (no delete)
Shifts & Disputes
├── Shift detail (evidence review)     
└── Record dispute                     
Customers
└── New / edit customer (no delete)
```

**Accountant** — home: Statements
```
Statements
├── Statement preview (line items, missing-evidence warnings)  
└── Export PDF         
Reconciliation                         
Cost entry (per contract, per month)   
Profit/Loss (per contract, by month)
```

**Team Lead** — home: Weekly shift list
```
Weekly shift list (own team)
├── Shift detail
├── Reassign shift        
└── Reschedule shift      
```

**Employee** — no home screen, no nav; each shift arrives as its own link
```
Shift confirm           
├── Before-photo capture               
├── After-photo capture                
├── Signed-receipt photo capture       
└── Confirm
```

**Platform Admin** — home: Platform Dashboard, outside every tenant
```
Platform Dashboard                     FR21
Tenants
├── New tenant (name + first Director's email/password)   
└── Suspend /reactivate
```