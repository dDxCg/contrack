import { anAccessContext } from '../../support/builders';
import { FakeClock } from '../../support/clock';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedContractItemChain, seedShift, seedTenant } from '../../support/seed';
import { ContractCost, CostCategory } from '../../../Models/contract-cost.entity';
import { Employee, EmployeeStatus, Role } from '../../../Models/employee.entity';
import { ContractCostRepository } from '../../../Repositories/contract-cost.repository';
import { EmployeeRepository } from '../../../Repositories/employee.repository';
import { ShiftRepository } from '../../../Repositories/shift.repository';
import { ContractProfitabilityService } from '../../../Services/contract-profitability.service';
import { CostEstimationService } from '../../../Services/cost-estimation.service';

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

async function world(now = new Date('2024-10-15T00:00:00.000Z')) {
  const dataSource = await createTestDataSource();
  const costs = new ContractCostRepository(dataSource);
  const shifts = new ShiftRepository(dataSource);
  const employees = new EmployeeRepository(dataSource);
  const clock = new FakeClock(now);
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
    service: new ContractProfitabilityService(shifts, costs, new CostEstimationService(costs, shifts), clock),
  };
}

describe('ContractProfitabilityService.get — FR4, FR28', () => {
  it('uses the recorded cost for a month that has one, flagging it as not estimated', async () => {
    const { service, access, chain, tenant, dataSource, costs, accountant } = await world();
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-03',
      status: 'completed',
    });
    const cost = new ContractCost();
    cost.tenantId = tenant.id;
    cost.contractId = chain.contractId;
    cost.category = CostCategory.Labor;
    cost.period = new Date('2024-10-01');
    cost.amount = 300_000;
    cost.createdBy = accountant.id;
    await costs.upsert(cost);

    const months = await service.get(access, chain.contractId, 1);

    expect(months).toEqual([
      {
        period: '2024-10-01',
        revenue: 1_000_000,
        cost: 300_000,
        profit: 700_000,
        margin_pct: 70,
        is_estimated: false,
      },
    ]);
  });

  it('estimates the cost for a month with no recorded entry, flagging it', async () => {
    const { service, access, chain, tenant, dataSource } = await world();
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chain.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-03',
      status: 'completed',
    });

    const [month] = await service.get(access, chain.contractId, 1);

    expect(month.is_estimated).toBe(true);
    expect(month.revenue).toBe(1_000_000);
    expect(month.cost).toBe(0);
  });

  it('never leaves a month blank — zero revenue still produces a row with margin 0', async () => {
    const { service, access, chain } = await world();

    const [month] = await service.get(access, chain.contractId, 1);

    expect(month).toMatchObject({ revenue: 0, margin_pct: 0 });
  });

  it('returns the trailing N months ending at the server clock’s current month, oldest first', async () => {
    const { service, access, chain } = await world(new Date('2024-10-15T00:00:00.000Z'));

    const months = await service.get(access, chain.contractId, 3);

    expect(months.map((month) => month.period)).toEqual(['2024-08-01', '2024-09-01', '2024-10-01']);
  });
});
