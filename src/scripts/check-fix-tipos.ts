
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
dotenv.config();

// Create a standalone datasource based on env vars
const AppDataSource = new DataSource({
    type: 'mysql',
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'disemsas_db',
    synchronize: false,
    logging: false,
    entities: [], // No entities needed for raw query
});

async function run() {
    try {
        await AppDataSource.initialize();
        console.log("Database connected!");

        const rows = await AppDataSource.query("SELECT * FROM tipos_movimiento");
        console.log("Current TiposMovimiento:", rows);

        // Check ID 5
        const id5 = rows.find((r: any) => Number(r.id) === 5);
        if (!id5) {
            console.log("ID 5 missing. Inserting...");
            await AppDataSource.query("INSERT INTO tipos_movimiento (id, nombre) VALUES (5, 'Egreso por Compra')");
            console.log("ID 5 inserted as 'Egreso por Compra'");
        } else {
            console.log("ID 5 exists. Name:", id5.nombre);
            // Updating to standardized name if needed
            if (id5.nombre !== 'Egreso por Compra') {
                console.log("Updating ID 5 name to 'Egreso por Compra'...");
                await AppDataSource.query("UPDATE tipos_movimiento SET nombre = 'Egreso por Compra' WHERE id = 5");
            }
        }

        // Check ID 4
        const id4 = rows.find((r: any) => Number(r.id) === 4);
        if (!id4) {
            console.log("ID 4 missing. Inserting...");
            await AppDataSource.query("INSERT INTO tipos_movimiento (id, nombre) VALUES (4, 'Ingreso por Venta')");
        } else {
            if (id4.nombre !== 'Ingreso por Venta') {
                console.log("Updating ID 4 name to 'Ingreso por Venta'...");
                await AppDataSource.query("UPDATE tipos_movimiento SET nombre = 'Ingreso por Venta' WHERE id = 4");
            }
        }

        console.log("Done checking types.");

    } catch (error) {
        console.error("Error:", error);
    } finally {
        await AppDataSource.destroy();
    }
}

run();
