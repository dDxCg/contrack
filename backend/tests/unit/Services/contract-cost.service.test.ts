import { anAccessContext } from '../../support/builders';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedContractItemChain, seedTenant } from '../../support/seed';
import { CostCategory } from '../../../models/contract-costs/contract-cost.entity';
import { Employee, EmployeeStatus, Role } from '../../../models/employees/employee.entity';
import { ContractCostRepository } from '../../../repositories/contract-costs/contract-cost.repository';
import { EmployeeRepository } from '../../../repositories/employees/employee.repository';
import { ContractCostService } from '../../../services/contract-costs/contract-cost.service';

function draftEmployee(overrides: Partial<Employee>): Employee {
  const employee = new Employee();
  employee.setName('Kế toán');
  employee.setContact(null);
  employee.email = `${Math.random()}@example.com`;
  employee.setRole(Role.Accountant);
  employee.setTeam(null);
  employee.setManager(null);
  employee.status = EmployeeStatus.Active;
  employee.setPasswordHash('x');
  Object.assign(employee, overrides);

  return employee;
}

async function world() {
  const dataSource = await createTestDataSource();
  const costs = new ContractCostRepository(dataSource);
  const employees = new EmployeeRepository(dataSource);
  const tenant = await seedTenant(dataSource);
  const chain = await seedContractItemChain(dataSource, tenant.id);

  const accountant = await employees.create(draftEmployee({ tenantId: tenant.id }));

  return {
    costs,
    tenant,
    chain,
    accountant,
    access: anAccessContext(accountant, { tenantId: tenant.id }),
    service: new ContractCostService(costs),
  };
}

describe('ContractCostService.upsert — FR14', () => {
  it('records a new cost entry', async () => {
    const { service, access, chain, accountant } = await world();

    const view = await service.upsert(access, chain.contractId, {
      category: CostCategory.Labor,
      period: new Date('2024-10-01'),
      amount: 3_000_000,
    });

    expect(view).toMatchObject({
      contract_id: chain.contractId,
      category: 'labor',
      amount: 3_000_000,
      recorded_by: accountant.id,
    });
  });

  it('replaces the existing entry for the same (category, period) rather than duplicating it', async () => {
    const { service, access, chain, costs, tenant } = await world();
    await service.upsert(access, chain.contractId, {
      category: CostCategory.Labor,
      period: new Date('2024-10-01'),
      amount: 3_000_000,
    });

    const updated = await service.upsert(access, chain.contractId, {
      category: CostCategory.Labor,
      period: new Date('2024-10-01'),
      amount: 3_500_000,
    });

    expect(updated.amount).toBe(3_500_000);
    const rows = await costs.listByContract(tenant.id, chain.contractId);
    expect(rows).toHaveLength(1);
  });

  it('keeps entries for different categories in the same month separate', async () => {
    const { service, access, chain, costs, tenant } = await world();
    await service.upsert(access, chain.contractId, {
      category: CostCategory.Labor,
      period: new Date('2024-10-01'),
      amount: 3_000_000,
    });

    await service.upsert(access, chain.contractId, {
      category: CostCategory.Materials,
      period: new Date('2024-10-01'),
      amount: 500_000,
    });

    const rows = await costs.listByContract(tenant.id, chain.contractId);
    expect(rows).toHaveLength(2);
  });
});

describe('ContractCostService.list', () => {
  it('filters by month when given', async () => {
    const { service, access, chain } = await world();
    await service.upsert(access, chain.contractId, {
      category: CostCategory.Labor,
      period: new Date('2024-10-01'),
      amount: 1,
    });
    await service.upsert(access, chain.contractId, {
      category: CostCategory.Labor,
      period: new Date('2024-11-01'),
      amount: 2,
    });

    const items = await service.list(access, chain.contractId, new Date('2024-10-01'));

    expect(items).toHaveLength(1);
    expect(items[0].amount).toBe(1);
  });
});
