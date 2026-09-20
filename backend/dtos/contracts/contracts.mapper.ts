import { Contract } from '../../models/contracts/contract.entity';
import { ContractItem } from '../../models/contracts/contract-item.entity';
import { ContractItemView, ContractSiteView, ContractView } from './contracts.response.dto';
export function toContractItemView(item: ContractItem): ContractItemView {
  return {
    id: item.id,
    name: item.name,
    frequency_count: item.frequencyCount,
    frequency_unit: item.frequencyUnit,
    frequency_rule: item.frequencyRule,
    day_of_week: item.dayOfWeek,
    day_of_month: item.dayOfMonth,
    unit_price: item.unitPrice.toNumber(),
  };
}
export function toContractView(contract: Contract, sites: ContractSiteView[]): ContractView {
  return {
    id: contract.id,
    customer_id: contract.customerId,
    signed_at: contract.signedAt.toString(),
    expires_at: contract.expiresAt.toString(),
    status: contract.status,
    sites,
  };
}
