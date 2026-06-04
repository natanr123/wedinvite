import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialSchema1780614393150 implements MigrationInterface {
    name = 'InitialSchema1780614393150'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "events" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "title" text NOT NULL, "event_date" date, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_40731c7151fe4be3116e45ddf73" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "guests" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event_id" uuid NOT NULL, "phone" text, "address" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_4948267e93869ddcc6b340a2c46" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "guest_names" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "guest_id" uuid NOT NULL, "kind" text NOT NULL, "value" text NOT NULL, "position" integer NOT NULL DEFAULT '0', CONSTRAINT "PK_1a449d11590083f98a6f6f581d3" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "relation_types" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event_id" uuid NOT NULL, "label" text NOT NULL, CONSTRAINT "UQ_862315943fe9d9394a53e155e63" UNIQUE ("event_id", "label"), CONSTRAINT "PK_8a2d03cf4daca74f3978b17cca0" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE TABLE "relations" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "event_id" uuid NOT NULL, "guest_a_id" uuid NOT NULL, "guest_b_id" uuid NOT NULL, "type_label" text NOT NULL, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_964096eb20c2a6dd4e4bb17546f" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "guests" ADD CONSTRAINT "FK_2c2f2d119f5db27b17a771734f4" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "guest_names" ADD CONSTRAINT "FK_ebc286a1988747d1a3a82a569c2" FOREIGN KEY ("guest_id") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "relation_types" ADD CONSTRAINT "FK_4620da5757b4881c62cb1906385" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "relations" ADD CONSTRAINT "FK_ccfd9911f2671dafc8fffb5894a" FOREIGN KEY ("event_id") REFERENCES "events"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "relations" ADD CONSTRAINT "FK_b751d853e2b9b0754ff7fb8c9e0" FOREIGN KEY ("guest_a_id") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "relations" ADD CONSTRAINT "FK_490dbbc8ed349ba2937a7d7a51b" FOREIGN KEY ("guest_b_id") REFERENCES "guests"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "relations" DROP CONSTRAINT "FK_490dbbc8ed349ba2937a7d7a51b"`);
        await queryRunner.query(`ALTER TABLE "relations" DROP CONSTRAINT "FK_b751d853e2b9b0754ff7fb8c9e0"`);
        await queryRunner.query(`ALTER TABLE "relations" DROP CONSTRAINT "FK_ccfd9911f2671dafc8fffb5894a"`);
        await queryRunner.query(`ALTER TABLE "relation_types" DROP CONSTRAINT "FK_4620da5757b4881c62cb1906385"`);
        await queryRunner.query(`ALTER TABLE "guest_names" DROP CONSTRAINT "FK_ebc286a1988747d1a3a82a569c2"`);
        await queryRunner.query(`ALTER TABLE "guests" DROP CONSTRAINT "FK_2c2f2d119f5db27b17a771734f4"`);
        await queryRunner.query(`DROP TABLE "relations"`);
        await queryRunner.query(`DROP TABLE "relation_types"`);
        await queryRunner.query(`DROP TABLE "guest_names"`);
        await queryRunner.query(`DROP TABLE "guests"`);
        await queryRunner.query(`DROP TABLE "events"`);
    }

}
