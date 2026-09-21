import { MigrationInterface, QueryRunner } from 'typeorm';

export class ScheduleDayConstraintAndSiteOverloadAlert1789920221850 implements MigrationInterface {
  name = 'ScheduleDayConstraintAndSiteOverloadAlert1789920221850';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "contract_sites" ADD "latitude" numeric(9,6)`);
    await queryRunner.query(`ALTER TABLE "contract_sites" ADD "longitude" numeric(9,6)`);
    await queryRunner.query(
      `ALTER TABLE "contract_sites" ADD "radius_meters" integer NOT NULL DEFAULT '200'`,
    );
    await queryRunner.query(`ALTER TABLE "contract_items" ADD "day_of_week" smallint`);
    await queryRunner.query(`ALTER TABLE "contract_items" ADD "day_of_month" smallint`);
    await queryRunner.query(`ALTER TABLE "shifts" ADD "geo_verified" boolean NOT NULL DEFAULT false`);
    await queryRunner.query(`ALTER TABLE "shifts" ADD "field_token_used_at" TIMESTAMP`);
    await queryRunner.query(
      `ALTER TABLE "contract_items" ADD CONSTRAINT "ck_contract_items_day_constraint_exclusive" CHECK (day_of_week IS NULL OR day_of_month IS NULL)`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_items" ADD CONSTRAINT "ck_contract_items_day_of_month_range" CHECK (day_of_month IS NULL OR day_of_month BETWEEN 1 AND 31)`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_items" ADD CONSTRAINT "ck_contract_items_day_of_week_range" CHECK (day_of_week IS NULL OR day_of_week BETWEEN 0 AND 6)`,
    );
    await queryRunner.query(
      `ALTER TABLE "customers" ADD CONSTRAINT "uq_customers_id_tenant" UNIQUE ("id", "tenant_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD CONSTRAINT "uq_contracts_id_tenant" UNIQUE ("id", "tenant_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "teams" ADD CONSTRAINT "uq_teams_id_tenant" UNIQUE ("id", "tenant_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "employees" ADD CONSTRAINT "uq_employees_id_tenant" UNIQUE ("id", "tenant_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_sites" ADD CONSTRAINT "uq_contract_sites_id_tenant" UNIQUE ("id", "tenant_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_items" ADD CONSTRAINT "uq_contract_items_id_tenant" UNIQUE ("id", "tenant_id")`,
    );
    await queryRunner.query(
      `ALTER TABLE "shifts" ADD CONSTRAINT "uq_shifts_id_tenant" UNIQUE ("id", "tenant_id")`,
    );
    await queryRunner.query(`ALTER TABLE "contracts" DROP CONSTRAINT "fk_contracts_customer"`);
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD CONSTRAINT "fk_contracts_customer" FOREIGN KEY ("customer_id", "tenant_id") REFERENCES "customers"("id", "tenant_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "fk_employees_manager"`);
    await queryRunner.query(
      `ALTER TABLE "employees" ADD CONSTRAINT "fk_employees_manager" FOREIGN KEY ("manager_id", "tenant_id") REFERENCES "employees"("id", "tenant_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "fk_employees_team"`);
    await queryRunner.query(
      `ALTER TABLE "employees" ADD CONSTRAINT "fk_employees_team" FOREIGN KEY ("team_id", "tenant_id") REFERENCES "teams"("id", "tenant_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "contract_costs" DROP CONSTRAINT "fk_contract_costs_contract"`);
    await queryRunner.query(
      `ALTER TABLE "contract_costs" ADD CONSTRAINT "fk_contract_costs_contract" FOREIGN KEY ("contract_id", "tenant_id") REFERENCES "contracts"("id", "tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "contract_costs" DROP CONSTRAINT "fk_contract_costs_created_by"`);
    await queryRunner.query(
      `ALTER TABLE "contract_costs" ADD CONSTRAINT "fk_contract_costs_created_by" FOREIGN KEY ("created_by", "tenant_id") REFERENCES "employees"("id", "tenant_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "contract_sites" DROP CONSTRAINT "fk_contract_sites_contract"`);
    await queryRunner.query(
      `ALTER TABLE "contract_sites" ADD CONSTRAINT "fk_contract_sites_contract" FOREIGN KEY ("contract_id", "tenant_id") REFERENCES "contracts"("id", "tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "contract_items" DROP CONSTRAINT "fk_contract_items_site"`);
    await queryRunner.query(
      `ALTER TABLE "contract_items" ADD CONSTRAINT "fk_contract_items_site" FOREIGN KEY ("site_id", "tenant_id") REFERENCES "contract_sites"("id", "tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "shifts" DROP CONSTRAINT "fk_shifts_contract_item"`);
    await queryRunner.query(
      `ALTER TABLE "shifts" ADD CONSTRAINT "fk_shifts_contract_item" FOREIGN KEY ("contract_item_id", "tenant_id") REFERENCES "contract_items"("id", "tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "shifts" DROP CONSTRAINT "fk_shifts_assignee"`);
    await queryRunner.query(
      `ALTER TABLE "shifts" ADD CONSTRAINT "fk_shifts_assignee" FOREIGN KEY ("assignee_id", "tenant_id") REFERENCES "employees"("id", "tenant_id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "shift_photos" DROP CONSTRAINT "fk_shift_photos_shift"`);
    await queryRunner.query(
      `ALTER TABLE "shift_photos" ADD CONSTRAINT "fk_shift_photos_shift" FOREIGN KEY ("shift_id", "tenant_id") REFERENCES "shifts"("id", "tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "statements" DROP CONSTRAINT "fk_statements_contract"`);
    await queryRunner.query(
      `ALTER TABLE "statements" ADD CONSTRAINT "fk_statements_contract" FOREIGN KEY ("contract_id", "tenant_id") REFERENCES "contracts"("id", "tenant_id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`INSERT INTO alert_kinds (code) VALUES ('site_overload')`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DELETE FROM alert_kinds WHERE code = 'site_overload'`);
    await queryRunner.query(`ALTER TABLE "statements" DROP CONSTRAINT "fk_statements_contract"`);
    await queryRunner.query(
      `ALTER TABLE "statements" ADD CONSTRAINT "fk_statements_contract" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "shift_photos" DROP CONSTRAINT "fk_shift_photos_shift"`);
    await queryRunner.query(
      `ALTER TABLE "shift_photos" ADD CONSTRAINT "fk_shift_photos_shift" FOREIGN KEY ("shift_id") REFERENCES "shifts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "shifts" DROP CONSTRAINT "fk_shifts_assignee"`);
    await queryRunner.query(
      `ALTER TABLE "shifts" ADD CONSTRAINT "fk_shifts_assignee" FOREIGN KEY ("assignee_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "shifts" DROP CONSTRAINT "fk_shifts_contract_item"`);
    await queryRunner.query(
      `ALTER TABLE "shifts" ADD CONSTRAINT "fk_shifts_contract_item" FOREIGN KEY ("contract_item_id") REFERENCES "contract_items"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "contract_items" DROP CONSTRAINT "fk_contract_items_site"`);
    await queryRunner.query(
      `ALTER TABLE "contract_items" ADD CONSTRAINT "fk_contract_items_site" FOREIGN KEY ("site_id") REFERENCES "contract_sites"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "contract_sites" DROP CONSTRAINT "fk_contract_sites_contract"`);
    await queryRunner.query(
      `ALTER TABLE "contract_sites" ADD CONSTRAINT "fk_contract_sites_contract" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "contract_costs" DROP CONSTRAINT "fk_contract_costs_created_by"`);
    await queryRunner.query(
      `ALTER TABLE "contract_costs" ADD CONSTRAINT "fk_contract_costs_created_by" FOREIGN KEY ("created_by") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "contract_costs" DROP CONSTRAINT "fk_contract_costs_contract"`);
    await queryRunner.query(
      `ALTER TABLE "contract_costs" ADD CONSTRAINT "fk_contract_costs_contract" FOREIGN KEY ("contract_id") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "fk_employees_team"`);
    await queryRunner.query(
      `ALTER TABLE "employees" ADD CONSTRAINT "fk_employees_team" FOREIGN KEY ("team_id") REFERENCES "teams"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "fk_employees_manager"`);
    await queryRunner.query(
      `ALTER TABLE "employees" ADD CONSTRAINT "fk_employees_manager" FOREIGN KEY ("manager_id") REFERENCES "employees"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "contracts" DROP CONSTRAINT "fk_contracts_customer"`);
    await queryRunner.query(
      `ALTER TABLE "contracts" ADD CONSTRAINT "fk_contracts_customer" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
    await queryRunner.query(`ALTER TABLE "shifts" DROP CONSTRAINT "uq_shifts_id_tenant"`);
    await queryRunner.query(`ALTER TABLE "contract_items" DROP CONSTRAINT "uq_contract_items_id_tenant"`);
    await queryRunner.query(`ALTER TABLE "contract_sites" DROP CONSTRAINT "uq_contract_sites_id_tenant"`);
    await queryRunner.query(`ALTER TABLE "employees" DROP CONSTRAINT "uq_employees_id_tenant"`);
    await queryRunner.query(`ALTER TABLE "teams" DROP CONSTRAINT "uq_teams_id_tenant"`);
    await queryRunner.query(`ALTER TABLE "contracts" DROP CONSTRAINT "uq_contracts_id_tenant"`);
    await queryRunner.query(`ALTER TABLE "customers" DROP CONSTRAINT "uq_customers_id_tenant"`);
    await queryRunner.query(
      `ALTER TABLE "contract_items" DROP CONSTRAINT "ck_contract_items_day_of_week_range"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_items" DROP CONSTRAINT "ck_contract_items_day_of_month_range"`,
    );
    await queryRunner.query(
      `ALTER TABLE "contract_items" DROP CONSTRAINT "ck_contract_items_day_constraint_exclusive"`,
    );
    await queryRunner.query(`ALTER TABLE "shifts" DROP COLUMN "field_token_used_at"`);
    await queryRunner.query(`ALTER TABLE "shifts" DROP COLUMN "geo_verified"`);
    await queryRunner.query(`ALTER TABLE "contract_items" DROP COLUMN "day_of_month"`);
    await queryRunner.query(`ALTER TABLE "contract_items" DROP COLUMN "day_of_week"`);
    await queryRunner.query(`ALTER TABLE "contract_sites" DROP COLUMN "radius_meters"`);
    await queryRunner.query(`ALTER TABLE "contract_sites" DROP COLUMN "longitude"`);
    await queryRunner.query(`ALTER TABLE "contract_sites" DROP COLUMN "latitude"`);
  }
}
