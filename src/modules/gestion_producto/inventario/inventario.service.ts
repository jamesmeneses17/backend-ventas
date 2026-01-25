import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Inventario } from './entities/inventario.entity';

@Injectable()
export class InventarioService {
  constructor(
    @InjectRepository(Inventario)
    private readonly repo: Repository<Inventario>,
  ) { }

  // ================= MÉTODOS CRUD PARA EL CONTROLLER =================
  async create(dto: Partial<Inventario>): Promise<Inventario> {
    const inventario = this.repo.create(dto);
    return this.repo.save(inventario);
  }

  async findAll(): Promise<Inventario[]> {
    return this.repo.find();
  }

  async findOne(id: number): Promise<Inventario> {
    const inventario = await this.repo.findOne({ where: { id } });
    if (!inventario) {
      throw new NotFoundException(`Inventario con id ${id} no encontrado`);
    }
    return inventario;
  }

  async update(id: number, dto: Partial<Inventario>): Promise<Inventario> {
    // Nota: Usar preload es más seguro si manejas relaciones complejas
    const inventario = await this.findOne(id);
    Object.assign(inventario, dto);
    return this.repo.save(inventario);
  }

  async remove(id: number): Promise<void> {
    const inventario = await this.findOne(id);
    await this.repo.remove(inventario);
  }

  async findOneByProductoId(productoId: number): Promise<Inventario | null> {
    return this.repo.findOne({ where: { productoId }, relations: ['producto'] });
  }

  // =========================================================================
  // ✅ MÉTODO REQUERIDO POR PRODUCTOS SERVICE (ACTUALIZADO SIN stockMinimo)
  // =========================================================================

  // 🚀 MÉTODO ACTUALIZADO: YA NO ACEPTA NI GUARDA stockMinimo
  async actualizarInventarioPorProductoId(
    productoId: number,
    stock: number,
    ubicacion?: string,
    compras?: number,
    ventas?: number,
  ): Promise<Inventario> {
    // 1. Buscar el registro existente por productoId
    let inventario = await this.repo.findOne({
      where: { productoId: productoId },
    });

    if (!inventario) {
      // Si no existe, crear registro
      inventario = this.repo.create({
        producto: { id: productoId } as any,
        stock: stock,
        ubicacion: typeof ubicacion === 'string' ? ubicacion : undefined,
        compras: typeof compras === 'number' ? compras : 0,
        ventas: typeof ventas === 'number' ? ventas : 0,
      });
    } else {
      // Si existe, actualizar solo los campos que vienen definidos
      if (stock !== undefined && stock !== null) {
        inventario.stock = stock;
      }
      if (ubicacion !== undefined) {
        inventario.ubicacion = ubicacion;
      }
      if (compras !== undefined && compras !== null) {
        inventario.compras = compras;
      }
      if (ventas !== undefined && ventas !== null) {
        inventario.ventas = ventas;
      }
      // ❌ LÓGICA DE ACTUALIZACIÓN DE stockMinimo ELIMINADA
    }

    return this.repo.save(inventario);
  }

  // =========================================================================
  // 🔄 MÉTODO DE SINCRONIZACIÓN (RECONCILIACIÓN)
  // =========================================================================
  async sincronizarStock(productoId: number) {
    // 1. Calcular Entradas por Compras
    const comprasRaw = await this.repo.manager.query(
      `SELECT SUM(cantidad) as total FROM compras_detalle WHERE producto_id = ?`,
      [productoId]
    );
    const totalCompras = Number(comprasRaw[0].total || 0);

    // 2. Calcular Salidas por Ventas
    // Usar raw queries con nombres de tabla estándar de la DB (snake_case)
    const ventasRaw = await this.repo.query(
      `SELECT SUM(cantidad) as total FROM ventas_detalle WHERE producto_id = ?`,
      [productoId]
    );
    const totalVentas = Number(ventasRaw[0].total || 0);

    // 3. Calcular Salidas por Créditos
    const creditosRaw = await this.repo.query(`SELECT SUM(cantidad) as total FROM detalles_creditos WHERE producto_id = ?`, [productoId]);
    const totalCreditos = Number(creditosRaw[0].total || 0);

    // 4. Calcular Ajustes (Diferencias)
    const ajustesRaw = await this.repo.query(`SELECT SUM(diferencia) as total FROM ajustes_inventario WHERE producto_id = ?`, [productoId]);
    const totalAjustes = Number(ajustesRaw[0].total || 0);

    // 5. Aplicar Fórmula
    // Stock Teórico = (Compras + Ajustes) - (Ventas + Créditos)
    // Nota: Ajustes ya incluye signo (+ o -) en 'diferencia'.
    // ⚠️ REGLA DE NEGOCIO: El stock no puede ser negativo (Feedback Usuario).
    // Si se vendió más de lo que se compró (ej: se borró una compra), el stock queda en 0.
    const nuevoStock = Math.max(0, (totalCompras + totalAjustes) - (totalVentas + totalCreditos));
    const nuevasVentas = totalVentas + totalCreditos;
    const nuevasCompras = totalCompras; // + (totalAjustes > 0 ? totalAjustes : 0); // Opcional: ajustar contador compras

    // 6. Actualizar Inventario
    let inv = await this.repo.findOne({ where: { productoId } });
    if (!inv) {
      inv = this.repo.create({ productoId, ventas: 0, compras: 0, stock: 0 });
    }

    inv.stock = nuevoStock;
    inv.ventas = nuevasVentas;
    inv.compras = nuevasCompras;

    // 7. Recalcular y Actualizar Precio Costo (Promedio Simple) - REPARACIÓN
    // Calculamos el promedio simple de todas las compras históricas
    // Usamos COALESCE para que los nulos cuenten como 0 en el promedio
    const costoRaw = await this.repo.manager.query(
      `SELECT AVG(COALESCE(costo_unitario, 0)) as promedio FROM compras_detalle WHERE producto_id = ?`,
      [productoId]
    );

    // Si hay historial de compras (promedio no es null), actualizamos el producto
    if (costoRaw[0] && costoRaw[0].promedio !== null) {
      const nuevoCosto = Number(costoRaw[0].promedio);
      await this.repo.manager.query(
        `UPDATE productos SET precio_costo = ? WHERE id = ?`,
        [nuevoCosto, productoId]
      );
    }

    return this.repo.save(inv);
  }

  async sincronizarTodo() {
    // 1. Obtener todos los IDs de productos que tienen movimientos o existen en inventario
    // O mejor: Iterar todos los productos del inventario y productos huérfanos.
    // Para simplificar y asegurar: Sincronizar CADA producto que tenga un record de Inventario
    // Y también habría que ver si hay productos sin record de inventario pero con movimientos (casos raros).
    // Por ahora, iteramos sobre la tabla inventario existente.
    // Si se quiere ser exhaustivo: SELECT id FROM productos.

    // Vamos a buscar todos los IDs de productos existentes
    const productosRaw = await this.repo.manager.query(`SELECT id FROM productos`);
    const total = productosRaw.length;
    let procesados = 0;

    for (const p of productosRaw) {
      await this.sincronizarStock(p.id);
      procesados++;
    }

    return { message: `Inventario Sincronizado. ${procesados} productos procesados.` };
  }
}
