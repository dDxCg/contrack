# Contrack — Repository Layout

## Backend
```
backend/
├── controllers/    
│   ├── auth/
│   ├── platform/
│   ├── contracts/
│   ├── shifts/
│   ├── field/
│   ├── statements/
│   ├── contract-costs/
│   ├── alerts/
│   ├── dashboard/
│   ├── customers/
│   ├── employees/
│   └── teams/
├── dtos/
│   ├── auth/
│   ├── platform/
│   ├── contracts/
│   ├── customers/
│   ├── employees/
│   ├── teams/
│   ├── shifts/
│   ├── field/
│   ├── statements/
│   ├── contract-costs/
│   ├── alerts/
│   └── dashboard/
├── services/
│   ├── auth/
│   ├── platform/
│   ├── customers/
│   ├── employees/
│   ├── teams/
│   ├── contracts/
│   ├── shifts/
│   ├── field/
│   ├── statements/
│   ├── contract-costs/
│   ├── alerts/
│   ├── dashboard/
│   └── access-control/    
├── repositories/
│   ├── tenants/
│   ├── platform/
│   ├── customers/
│   ├── employees/
│   ├── teams/
│   ├── contracts/
│   ├── shifts/
│   ├── statements/
│   ├── contract-costs/
│   └── alerts/
├── models/
│   ├── tenants/
│   ├── employees/
│   ├── customers/
│   ├── teams/
│   ├── contracts/
│   ├── shifts/
│   ├── statements/
│   ├── contract-costs/
│   ├── alerts/
│   └── platform/
├── data/
│   ├── db-context/
│   ├── migrations/
│   ├── object-storage-client/
│   ├── channel-client/
│   └── pdf-renderer/
├── utils/
└── tests/
    ├── unit/
    └── support/
```

## Frontend

```
frontend/
├── src/
│   ├── assets/
│   ├── components/
│   ├── layouts/
│   ├── pages/
│   ├── hooks/
│   ├── services/
│   ├── types/
│   ├── routes/
│   ├── context/
│   └── utils/
├── dist/
└── public/
```
