import { MigrationInterface, QueryRunner, Table, TableColumn, TableForeignKey } from "typeorm";

export class AddDetalleCreditosAndNumFacturaToCreditos20251215 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        // Crear tabla detalle_creditos si no existe
        const hasTable = await queryRunner.hasTable('detalle_creditos');
        if (!hasTable) {
            await queryRunner.createTable(new Table({
                name: 'detalle_creditos',
                columns: [
                    {
                        name: 'id',
                        type: 'int',
                        isPrimary: true,
                        isGenerated: true,
                        generationStrategy: 'increment',
                    },
                    {
                        name: 'credito_id',
                        type: 'int',
                        isNullable: false,
                    },
                    {
                        name: 'articulo_nombre',
                        type: 'varchar',
                        length: '255',
                        isNullable: false,
                    },
                ],
            }), true);
            await queryRunner.createForeignKey('detalle_creditos', new TableForeignKey({
                columnNames: ['credito_id'],
                referencedTableName: 'creditos',
                referencedColumnNames: ['id'],
                onDelete: 'CASCADE',
            }));
        }

        // Agregar columna num_factura a creditos si no existe
        const table = await queryRunner.getTable('creditos');
        if (table && !table.findColumnByName('num_factura')) {
            await queryRunner.addColumn('creditos', new TableColumn({
                name: 'num_factura',
                type: 'varchar',
                length: '50',
                isNullable: true,
            }));
        }
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Eliminar columna num_factura de creditos
        const table = await queryRunner.getTable('creditos');
        if (table && table.findColumnByName('num_factura')) {
            await queryRunner.dropColumn('creditos', 'num_factura');
        }
        // Eliminar tabla detalle_creditos
        const hasTable = await queryRunner.hasTable('detalle_creditos');
        if (hasTable) {
            await queryRunner.dropTable('detalle_creditos');
        }
    }
}
