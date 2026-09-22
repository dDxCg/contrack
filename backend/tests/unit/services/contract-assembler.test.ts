import { anAccessContext, anEmployee } from '../../support/builders';
import { FrequencyUnit } from '../../../models/contracts/contract-item.entity';
import { ContractStatus } from '../../../models/contracts/contract.entity';
import { ContractCreateCommand } from '../../../services/contracts/contract.service';
import { ContractAssembler } from '../../../services/contracts/contract-assembler';
import { ScheduleGeneratorService } from '../../../services/contracts/schedule-generator.service';
import { Money } from '../../../utils/money';

function aCommand(overrides: Partial<ContractCreateCommand> = {}): ContractCreateCommand {
  return {
    customerId: 9,
    signedAt: new Date('2024-01-01'),
    expiresAt: new Date('2024-01-22'),
    sites: [
      {
        name: 'Toà A',
        workRequirements: 'no pets',
        notes: null,
        latitude: null,
        longitude: null,
        radiusMeters: 200,
        items: [
          {
            name: 'Vệ sinh sảnh',
            frequencyCount: 1,
            frequencyUnit: FrequencyUnit.Week,
            frequencyRule: null,
            dayOfWeek: null,
            dayOfMonth: null,
            unitPrice: 500000,
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe('ContractAssembler — pure command-to-entity-graph, no DB', () => {
  const assembler = new ContractAssembler(new ScheduleGeneratorService());
  const access = anAccessContext(anEmployee({ tenantId: 4 }));
  it('builds an unsaved Contract entity carrying the tenant, term and status', () => {
    const assembled = assembler.assemble(access, aCommand());
    expect(assembled.entity.tenantId).toBe(4);
    expect(assembled.entity.customerId).toBe(9);
    expect(assembled.entity.signedAt).toEqual(new Date('2024-01-01'));
    expect(assembled.entity.expiresAt).toEqual(new Date('2024-01-22'));
    expect(assembled.entity.status).toBe(ContractStatus.Active);
    expect(assembled.entity.id).toBeUndefined();
  });
  it('builds one unsaved site per command site, carrying the tenant but no contract id yet', () => {
    const assembled = assembler.assemble(access, aCommand());
    expect(assembled.sites).toHaveLength(1);
    const site = assembled.sites[0].entity;
    expect(site.tenantId).toBe(4);
    expect(site.name).toBe('Toà A');
    expect(site.workRequirements).toBe('no pets');
    expect(site.contractId).toBeUndefined();
  });
  it('builds one unsaved item per command item, with no site id yet', () => {
    const assembled = assembler.assemble(access, aCommand());
    const item = assembled.sites[0].items[0].entity;
    expect(item.tenantId).toBe(4);
    expect(item.name).toBe('Vệ sinh sảnh');
    expect(item.unitPrice).toEqual(Money.fromNumber(500000));
    expect(item.siteId).toBeUndefined();
  });
  it('precomputes each item’s shift schedule from the contract term and its own frequency', () => {
    const assembled = assembler.assemble(access, aCommand());
    const { scheduledDates } = assembled.sites[0].items[0];
    expect(scheduledDates).toEqual([
      new Date('2024-01-01'),
      new Date('2024-01-08'),
      new Date('2024-01-15'),
      new Date('2024-01-22'),
    ]);
  });
  it('assembles every site and every item, independently of each other', () => {
    const assembled = assembler.assemble(
      access,
      aCommand({
        sites: [
          {
            name: 'Site 1',
            workRequirements: null,
            notes: null,
            latitude: null,
            longitude: null,
            radiusMeters: 200,
            items: [],
          },
          {
            name: 'Site 2',
            workRequirements: null,
            notes: null,
            latitude: null,
            longitude: null,
            radiusMeters: 200,
            items: [
              {
                name: 'Item A',
                frequencyCount: 1,
                frequencyUnit: FrequencyUnit.Month,
                frequencyRule: null,
                dayOfWeek: null,
                dayOfMonth: null,
                unitPrice: 1,
              },
              {
                name: 'Item B',
                frequencyCount: 2,
                frequencyUnit: FrequencyUnit.Day,
                frequencyRule: null,
                dayOfWeek: null,
                dayOfMonth: null,
                unitPrice: 2,
              },
            ],
          },
        ],
      }),
    );
    expect(assembled.sites).toHaveLength(2);
    expect(assembled.sites[0].items).toHaveLength(0);
    expect(assembled.sites[1].items).toHaveLength(2);
    expect(assembled.sites[1].items[0].entity.name).toBe('Item A');
    expect(assembled.sites[1].items[1].entity.name).toBe('Item B');
  });
});
