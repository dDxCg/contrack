import { anAccessContext } from '../../support/builders';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedContractItemChain, seedShift, seedTenant } from '../../support/seed';
import { ContractCost, CostCategory } from '../../../models/contract-costs/contract-cost.entity';
import { Employee, EmployeeStatus, Role } from '../../../models/employees/employee.entity';
import { ContractCostRepository } from '../../../repositories/contract-costs/contract-cost.repository';
import { EmployeeRepository } from '../../../repositories/employees/employee.repository';
import { ShiftRepository } from '../../../repositories/shifts/shift.repository';
import { CostEstimationService } from '../../../services/contract-costs/cost-estimation.service';

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
  const shifts = new ShiftRepository(dataSource);
  const employees = new EmployeeRepository(dataSource);
  const tenant = await seedTenant(dataSource);
  const chain = await seedContractItemChain(dataSource, tenant.id, { unitPrice: 1_000_000 });
  const accountant = await employees.create(draftEmployee({ tenantId: tenant.id }));

  return {
    dataSource,
    costs,
    shifts,
    tenant,
    chain,
    accountant,
    access: anAccessContext(accountant, { tenantId: tenant.id }),
    service: new CostEstimationService(costs, shifts),
  };
}

async function recordCost(
  costs: ContractCostRepository,
  tenantId: number,
  contractId: number,
  createdBy: number,
  period: string,
  amount: number,
) {
  const cost = new ContractCost();
  cost.tenantId = tenantId;
  cost.contractId = contractId;
  cost.category = CostCategory.Labor;
  cost.period = new Date(period);
  cost.amount = amount;
  cost.createdBy = createdBy;
  await costs.upsert(cost);
}

describe('CostEstimationService.estimate — FR28', () => {
  it('averages the trailing 3 months of the contract’s own recorded costs', async () => {
    const { service, costs, tenant, chain, accountant } = await world();
    await recordCost(costs, tenant.id, chain.contractId, accountant.id, '2024-07-01', 1_000_000);
    await recordCost(costs, tenant.id, chain.contractId, accountant.id, '2024-08-01', 2_000_000);
    await recordCost(costs, tenant.id, chain.contractId, accountant.id, '2024-09-01', 3_000_000);

    const estimate = await service.estimate(tenant.id, chain.contractId, new Date('2024-10-01'));

    expect(estimate).toBe(2_000_000);
  });

  it('averages only the trailing 3 months even when more history exists', async () => {
    const { service, costs, tenant, chain, accountant } = await world();
    await recordCost(costs, tenant.id, chain.contractId, accountant.id, '2024-01-01', 9_000_000);
    await recordCost(costs, tenant.id, chain.contractId, accountant.id, '2024-07-01', 1_000_000);
    await recordCost(costs, tenant.id, chain.contractId, accountant.id, '2024-08-01', 1_000_000);
    await recordCost(costs, tenant.id, chain.contractId, accountant.id, '2024-09-01', 1_000_000);

    const estimate = await service.estimate(tenant.id, chain.contractId, new Date('2024-10-01'));

    expect(estimate).toBe(1_000_000);
  });

  it('falls back to the tenant cost-to-revenue ratio when the contract has no cost history', async () => {
    const { service, costs, tenant, chain, dataSource, accountant } = await world();
    // Another contract contributes 500,000 cost and 1,000,000 completed revenue.
    const otherChain = await seedContractItemChain(dataSource, tenant.id, { unitPrice: 1_000_000 });
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: otherChain.itemId,
      assigneeId: null,
      scheduledDate: '2024-09-01',
      status: 'completed',
    });
    await recordCost(costs, tenant.id, otherChain.contractId, accountant.id, '2024-09-01', 500_000);

    // This contract has 2,000,000 of completed revenue in the estimated period but no cost history of its own —
    // it also counts toward the tenant-wide revenue denominator, so the ratio is 500,000 / 3,000,000.
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-03',
      status: 'completed',
    });
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-10',
      status: 'completed',
    });

    const estimate = await service.estimate(tenant.id, chain.contractId, new Date('2024-10-01'));

    expect(estimate).toBe(333_333.33);
  });

  it('estimates zero when the tenant has no cost or revenue history at all', async () => {
    const { service, tenant, chain } = await world();

    const estimate = await service.estimate(tenant.id, chain.contractId, new Date('2024-10-01'));

    expect(estimate).toBe(0);
  });
});
