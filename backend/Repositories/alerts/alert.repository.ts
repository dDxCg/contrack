import { Inject, Injectable } from '@nestjs/common';
import { DataSource, EntityTarget, SelectQueryBuilder } from 'typeorm';
import { DATA_SOURCE } from '../../data/db-context/data-source';
import { Alert, AlertDeliveryStatus, AlertKind } from '../../models/alerts/alert.entity';
import { TenantScopedRepository } from '../tenant-scoped.repository';

@Injectable()
export class AlertRepository extends TenantScopedRepository<Alert> {
  protected override readonly entity: EntityTarget<Alert> = Alert;

  constructor(@Inject(DATA_SOURCE) dataSource: DataSource) {
    super(dataSource);
  }

  async list(tenantId: number): Promise<Alert[]> {
    const rows = await this.selected(this.scopedTo(tenantId, 'a'))
      .orderBy('a.id', 'ASC')
      .getRawMany<AlertRow>();

    return rows.map(hydrateAlert);
  }

  async findById(tenantId: number, id: number): Promise<Alert | null> {
    const row = await this.selected(this.scopedTo(tenantId, 'a'))
      .andWhere('a.id = :id', { id })
      .getRawOne<AlertRow>();

    return row === undefined || row === null ? null : hydrateAlert(row);
  }

  async existsFor(tenantId: number, kind: AlertKind, subjectId: number): Promise<boolean> {
    const kindId = await this.lookupId('alert_kinds', kind);
    const count = await this.scopedTo(tenantId, 'a')
      .andWhere('a.kind_id = :kindId', { kindId })
      .andWhere('a.subject_id = :subjectId', { subjectId })
      .getCount();

    return count > 0;
  }

  async create(alert: Alert): Promise<Alert> {
    alert.kindId = await this.lookupId('alert_kinds', alert.kind);
    alert.deliveryStatusId = await this.lookupId('alert_delivery_statuses', alert.deliveryStatus);
    const saved = await this.dataSource.getRepository(Alert).save(alert);
    const reloaded = await this.findById(saved.tenantId, saved.id);

    if (reloaded === null) {
      throw new Error(`alerts row ${saved.id} disappeared right after it was written`);
    }

    return reloaded;
  }

  async update(alert: Alert): Promise<Alert> {
    alert.deliveryStatusId = await this.lookupId('alert_delivery_statuses', alert.deliveryStatus);
    const saved = await this.dataSource.getRepository(Alert).save(alert);
    const reloaded = await this.findById(saved.tenantId, saved.id);

    if (reloaded === null) {
      throw new Error(`alerts row ${saved.id} disappeared right after it was written`);
    }

    return reloaded;
  }

  private selected(query: SelectQueryBuilder<Alert>): SelectQueryBuilder<Alert> {
    return query
      .innerJoin('alert_kinds', 'k', 'k.id = a.kind_id')
      .innerJoin('alert_delivery_statuses', 'ds', 'ds.id = a.delivery_status_id')
      .select([
        'a.id AS id',
        'a.tenant_id AS tenant_id',
        'a.kind_id AS kind_id',
        'a.subject_id AS subject_id',
        'a.delivery_status_id AS delivery_status_id',
        'a.created_at AS created_at',
        'k.code AS kind',
        'ds.code AS delivery_status',
      ]);
  }
}

interface AlertRow {
  id: number;
  tenant_id: number;
  kind_id: number;
  subject_id: number;
  delivery_status_id: number;
  created_at: Date;
  kind: AlertKind;
  delivery_status: AlertDeliveryStatus;
}

function hydrateAlert(row: AlertRow): Alert {
  const alert = new Alert();
  alert.id = row.id;
  alert.tenantId = row.tenant_id;
  alert.kindId = row.kind_id;
  alert.subjectId = row.subject_id;
  alert.deliveryStatusId = row.delivery_status_id;
  alert.createdAt = row.created_at;
  alert.kind = row.kind;
  alert.deliveryStatus = row.delivery_status;

  return alert;
}
