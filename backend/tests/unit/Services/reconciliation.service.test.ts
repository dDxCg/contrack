import { anAccessContext, anEmployee } from '../../support/builders';
import { createTestDataSource } from '../../support/pg-mem-data-source';
import { seedContractItemChain, seedShift, seedTenant } from '../../support/seed';
import { Role } from '../../../models/employees/employee.entity';
import { ShiftRepository } from '../../../repositories/shifts/shift.repository';
import { ReconciliationService } from '../../../services/statements/reconciliation.service';

async function world() {
  const dataSource = await createTestDataSource();
  const shifts = new ShiftRepository(dataSource);
  const tenant = await seedTenant(dataSource);
  const chainA = await seedContractItemChain(dataSource, tenant.id);
  const chainB = await seedContractItemChain(dataSource, tenant.id);

  const director = anEmployee({ id: 12, tenantId: tenant.id, role: Role.Director });

  return {
    dataSource,
    shifts,
    tenant,
    chainA,
    chainB,
    access: anAccessContext(director, { tenantId: tenant.id }),
    service: new ReconciliationService(shifts),
  };
}

describe('ReconciliationService.get — FR13', () => {
  it('reports due vs. evidenced shifts per contract, with the variance', async () => {
    const { service, access, chainA, chainB, tenant, dataSource } = await world();
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chainA.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-03',
      status: 'completed',
    });
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chainA.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-10',
    });
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chainB.itemId,
      assigneeId: null,
      scheduledDate: '2024-10-05',
      status: 'completed',
    });

    const rows = await service.get(access, new Date('2024-10-01'));

    expect(rows).toEqual(
      expect.arrayContaining([
        { contract_id: chainA.contractId, shifts_due: 2, shifts_with_evidence: 1, variance: 1 },
        { contract_id: chainB.contractId, shifts_due: 1, shifts_with_evidence: 1, variance: 0 },
      ]),
    );
  });

  it('excludes shifts outside the requested period', async () => {
    const { service, access, chainA, tenant, dataSource } = await world();
    await seedShift(dataSource, {
      tenantId: tenant.id,
      contractItemId: chainA.itemId,
      assigneeId: null,
      scheduledDate: '2024-11-01',
      status: 'completed',
    });

    const rows = await service.get(access, new Date('2024-10-01'));

    expect(rows.find((row) => row.contract_id === chainA.contractId)).toBeUndefined();
  });
});
