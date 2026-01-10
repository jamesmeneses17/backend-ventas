import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Producto } from './entities/producto.entity';
import { ProductoImagen } from './entities/producto-imagen.entity';
import { Subcategoria } from '../../catalogos_basicos/subcategorias/entities/subcategoria.entity';
import { Categoria } from '../../catalogos_basicos/categorias/entities/categoria.entity';
import { CreateProductoDto } from './dto/create-producto.dto';
import { UpdateProductoDto } from './dto/update-producto.dto';

// Entidad Precio para crear el registro inicial
import { Precio } from '../precios/entities/precio.entity';

// 🔑 Servicios relacionados
import { InventarioService } from '../inventario/inventario.service';
import { PreciosService } from '../precios/precios.service';

import * as ExcelJS from 'exceljs';
import { Buffer } from 'buffer';
/**
 * Exporta productos a un archivo Excel (.xlsx)
 * @param filtros Opcional: filtros para la consulta (puedes expandir según necesidad)
 * @returns Buffer del archivo Excel
 */


// 📌 UMBRAL FIJO DE STOCK MÍNIMO
const MIN_STOCK_THRESHOLD = 5;

// 📌 Tipado para la respuesta de la lista y paginación
export interface PaginacionResponse<T> {
  data: T[];
  total: number;
}


export type ProductoConStockCalculado = Omit<Producto, 'compras' | 'ventas'> & {
  stock: number;
  precio: number;
  precio_venta: number;
  estado_stock: 'Disponible' | 'Stock Bajo' | 'Agotado';
  // Campos copiados desde la relación inventario para consumo directo del frontend
  compras: number;
  ventas?: number;
  ubicacion?: string | null;
};

@Injectable()
export class ProductosService {
  private readonly logger = new Logger(ProductosService.name);
  constructor(
    @InjectRepository(Producto)
    private readonly productosRepo: Repository<Producto>,
    @InjectRepository(ProductoImagen)
    private readonly productoImagenRepo: Repository<ProductoImagen>,
    @InjectRepository(Subcategoria)
    private readonly subcategoriaRepo: Repository<Subcategoria>,
    @InjectRepository(Categoria)
    private readonly categoriaRepo: Repository<Categoria>,
    private readonly inventarioService: InventarioService,
    private readonly preciosService: PreciosService,
    private readonly dataSource: DataSource,
  ) { }

  async exportarProductosExcel(): Promise<Buffer> {
    // 1. Consulta de todos los productos sin filtros
    const productos = await this.productosRepo.createQueryBuilder('producto')
      .leftJoinAndSelect('producto.categoria', 'categoria')
      .leftJoinAndSelect('producto.subcategoria', 'subcategoria')
      .leftJoinAndSelect('producto.inventario', 'inventario')
      .leftJoinAndSelect('producto.precios', 'precios', 'precios.fecha_fin IS NULL')
      .leftJoinAndSelect('producto.estado', 'estado')
      .leftJoinAndSelect('producto.imagenes', 'imagenes')
      .getMany();

    // 2. Crear workbook y worksheet
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Productos');

    // 3. Definir columnas
    worksheet.columns = [
      { header: 'Código', key: 'codigo', width: 15 },
      { header: 'Nombre', key: 'nombre', width: 30 },
      { header: 'Categoría', key: 'categoria', width: 20 },
      { header: 'Subcategoría', key: 'subcategoria', width: 20 },
      { header: 'Stock', key: 'stock', width: 10 },
      { header: 'Precio', key: 'precio', width: 12 },
      { header: 'Precio Venta', key: 'precio_venta', width: 15 },
      { header: 'Promoción %', key: 'promocion_porcentaje', width: 12 },
      { header: 'Precio con Descuento', key: 'precio_con_descuento', width: 18 },
      { header: 'Utilidad / Producto', key: 'utilidad', width: 18 },
      { header: 'Valor Inventario', key: 'valor_inventario', width: 18 },
      { header: 'Estado', key: 'estado', width: 15 },
    ];

    // 4. Agregar filas
    productos.forEach((p) => {
      // Cálculos igual que en la API
      const precioVenta = Number(p.precios?.[0]?.valor_unitario ?? p.precio_venta ?? 0);
      const costo = Number(p.precio_costo ?? 0);
      const promo = Number(p.promocion_porcentaje ?? 0);
      const stock = Number(p.inventario?.stock ?? 0);
      const precioConDescuento = promo > 0 ? precioVenta - (precioVenta * promo) / 100 : precioVenta;
      const utilidad = precioConDescuento - costo;
      const valorInventario = costo * stock;

      worksheet.addRow({
        codigo: p.codigo,
        nombre: p.nombre,
        categoria: p.categoria?.nombre ?? '',
        subcategoria: p.subcategoria?.nombre ?? '',
        stock: stock,
        precio: costo,
        precio_venta: precioVenta,
        promocion_porcentaje: promo > 0 ? `${promo}%` : '-',
        precio_con_descuento: precioConDescuento,
        utilidad: utilidad,
        valor_inventario: valorInventario,
        estado: p.estado?.nombre ?? '',
      });
    });

    // 5. Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();
    // Asegura que el resultado sea un Buffer de Node.js
    return Buffer.from(buffer);
  }
  // Elimina una imagen de producto por su ID
  async deleteImagenById(imagenId: number): Promise<{ deleted: boolean }> {
    const imagen = await this.productoImagenRepo.findOne({ where: { id: imagenId } });
    if (!imagen) {
      throw new NotFoundException(`Imagen con ID ${imagenId} no encontrada`);
    }
    await this.productoImagenRepo.remove(imagen);
    return { deleted: true };
  }

  async getAllProductos(
    page: number = 1,
    limit: number = 5,
    search: string = '',
    estado_stock: string = '',
  ): Promise<PaginacionResponse<ProductoConStockCalculado>> {
    // 1. Construir query base
    const query = this.productosRepo.createQueryBuilder('producto');
    query
      .leftJoinAndSelect('producto.estado', 'estado')
      .leftJoinAndSelect('producto.categoria', 'categoriaDirecta')
      .leftJoinAndSelect('producto.subcategoria', 'subcategoria')
      .leftJoinAndSelect('subcategoria.categoria', 'categoria')
      .leftJoinAndSelect('producto.inventario', 'inventario')
      .leftJoinAndSelect('producto.precios', 'precios', 'precios.fecha_fin IS NULL')
      .leftJoinAndSelect('producto.imagenes', 'imagenes')
      .orderBy('producto.id', 'DESC')
      .addOrderBy('imagenes.orden', 'ASC');

    if (search) {
      query.andWhere(
        '(producto.nombre LIKE :search OR producto.codigo LIKE :search)',
        { search: `%${search}%` },
      );
    }

    // 2. Obtener resultados de base de datos
    const productosRaw = await query.getMany();

    // 3. Calcular stock y usar precio de costo (NO precio de venta)
    const productosCalculados = productosRaw.map((p) => {
      const inventarioRegistro = p.inventario;
      const stockActual = inventarioRegistro?.stock ?? 0;
      const stockMinimo = MIN_STOCK_THRESHOLD;

      let estadoStock: 'Disponible' | 'Stock Bajo' | 'Agotado';
      if (stockActual === 0) estadoStock = 'Agotado';
      else if (stockActual <= stockMinimo) estadoStock = 'Stock Bajo';
      else estadoStock = 'Disponible';

      const precioActual = p.precio_costo ?? 0;
      const precioVentaActual = p.precios?.[0]?.valor_unitario ?? p.precio_venta ?? 0;
      const promocionPorcentaje = Number(p.promocion_porcentaje ?? 0);
      const precioConDescuento = promocionPorcentaje > 0 ? precioVentaActual - (precioVentaActual * promocionPorcentaje) / 100 : precioVentaActual;
      const utilidad = precioConDescuento - precioActual;
      const valorInventario = precioActual * stockActual;

      return {
        ...p,
        categoria: p.subcategoria?.categoria?.nombre ?? (p as any).categoria?.nombre ?? null,
        subcategoria_id: p.subcategoriaId,
        stock: stockActual,
        precio: precioActual,
        precio_venta: precioVentaActual,
        estado_stock: estadoStock,
        stockMinimo,
        compras: inventarioRegistro?.compras ?? 0,
        ventas: inventarioRegistro?.ventas ?? 0,
        ubicacion: inventarioRegistro?.ubicacion ?? null,
        promocion_porcentaje: promocionPorcentaje,
        precio_con_descuento: precioConDescuento,
        utilidad: utilidad,
        valor_inventario: valorInventario,
      };
    });

    // 4. Filtrar por estado_stock si aplica
    let productosFiltrados = productosCalculados;
    if (estado_stock && estado_stock !== '') {
      productosFiltrados = productosCalculados.filter(
        (p) => p.estado_stock === estado_stock,
      );
    }

    // 5. Paginación
    const total = productosFiltrados.length;
    const start = (page - 1) * limit;
    const end = start + limit;
    const paginados = productosFiltrados.slice(start, end);

    return { data: paginados, total };
  }


  // Estadísticas globales de productos por estado_stock
  async getStats() {
    // Obtener todos los productos y calcular estado_stock
    const productosRaw = await this.productosRepo.createQueryBuilder('producto')
      .leftJoinAndSelect('producto.inventario', 'inventario')
      .leftJoinAndSelect('producto.precios', 'precios', 'precios.fecha_fin IS NULL')
      .getMany();

    // Calcular estado_stock para cada producto
    let total = 0, stockBajo = 0, agotado = 0;
    for (const p of productosRaw) {
      const inventarioRegistro = p.inventario;
      const stockActual = inventarioRegistro?.stock ?? 0;
      let estadoStock: 'Disponible' | 'Stock Bajo' | 'Agotado';
      if (stockActual === 0) estadoStock = 'Agotado';
      else if (stockActual <= MIN_STOCK_THRESHOLD) estadoStock = 'Stock Bajo';
      else estadoStock = 'Disponible';
      total++;
      if (estadoStock === 'Stock Bajo') stockBajo++;
      if (estadoStock === 'Agotado') agotado++;
    }
    return { total, stockBajo, agotado };
  }
  // 🔹 CREATE
  async create(dto: CreateProductoDto): Promise<Producto> {
    const { stock, ubicacion, precio, precio_venta, codigo, nombre, precio_costo, valor_unitario_inicial, ...productoData } = dto as any;

    // Validar si el código ya existe
    if (codigo) {
      const existeCodigo = await this.productosRepo.findOne({ where: { codigo } });
      if (existeCodigo) {
        throw new ConflictException({ message: 'El producto ya existe' });
      }
    }

    // Validar si el nombre ya existe (case-insensitive)
    if (nombre) {
      const existeNombre = await this.productosRepo.createQueryBuilder('producto')
        .where('LOWER(producto.nombre) = LOWER(:nombre)', { nombre })
        .getOne();
      if (existeNombre) {
        throw new ConflictException({ message: 'El producto ya existe' });
      }
    }

    // Usar transacción para crear producto y precio inicial de forma atómica
    const nuevoProducto = await this.dataSource.transaction(async (manager) => {
      const productoRepo = manager.getRepository(Producto);
      const precioRepo = manager.getRepository(Precio);

      // Compatibilidad: el frontend puede enviar `categoriaId` (nivel 2) y/o `subcategoriaId` (nivel 3).
      // NOTA: No mapear `categoriaId` a `subcategoriaId`. La subcategoría es opcional y solo debe llenarse
      // si el frontend envía explícitamente `subcategoriaId`.
      const incomingSubcategoriaId = (productoData as any).subcategoriaId ?? (productoData as any).subcategoria_id ?? null;
      const incomingCategoriaId = (productoData as any).categoriaId ?? (productoData as any).categoria_id ?? null;

      const dataToSave = {
        ...productoData,
        codigo,
        nombre,
        precio_costo: precio_costo ?? 0,
        precio_venta: precio_venta ?? null,
        estadoId: productoData.estadoId || 1,
        // Para creación, si no se envía subcategoria, guardamos NULL (producto sin subcategoría)
        subcategoriaId: incomingSubcategoriaId,
        categoriaId: incomingCategoriaId,
      };

      this.logger.log(`Create producto - dataToSave.subcategoriaId=${dataToSave.subcategoriaId}`);
      const producto = productoRepo.create(dataToSave);
      const savedProducto: any = await productoRepo.save(producto);
      this.logger.log(`Created producto id=${savedProducto.id} subcategoriaId=${savedProducto.subcategoriaId}`);

      // Crear precio inicial si se proporcionó
      const valorInicial =
        valor_unitario_inicial !== undefined && valor_unitario_inicial !== null
          ? valor_unitario_inicial
          : (precio_venta !== undefined && precio_venta !== null ? precio_venta : precio);

      if (valorInicial !== undefined && valorInicial !== null) {
        const precioInicial = precioRepo.create({
          producto: { id: savedProducto.id } as any,
          productoId: savedProducto.id,
          valor_unitario: valorInicial,
          descuento: 0,
          en_promocion: false,
          fecha_inicio: new Date().toISOString().slice(0, 10),
          fecha_fin: null,
        });
        await precioRepo.save(precioInicial);
      }

      return savedProducto;
    });

    const productoId = (nuevoProducto as any).id;

    if (stock !== undefined || ubicacion !== undefined) {
      await this.inventarioService.actualizarInventarioPorProductoId(
        productoId,
        stock ?? 0,
        ubicacion,
      );
    }

    return this.findOneWithRelations(productoId);
  }

  // 🔍 GET ONE con relaciones
  async findOneWithRelations(id: number): Promise<Producto> {
    // 🔥 Usar queryBuilder para tener control total sobre las relaciones
    const producto = await this.productosRepo
      .createQueryBuilder('producto')
      .leftJoinAndSelect('producto.precios', 'precios')
      .leftJoinAndSelect('producto.inventario', 'inventario')
      .leftJoinAndSelect('producto.estado', 'estado')
      .leftJoinAndSelect('producto.categoria', 'categoriaDirecta')
      .leftJoinAndSelect('producto.subcategoria', 'subcategoria')
      .leftJoinAndSelect('subcategoria.categoria', 'categoria')
      .leftJoinAndSelect('producto.imagenes', 'imagenes')
      .orderBy('imagenes.orden', 'ASC')
      .where('producto.id = :id', { id })
      .getOne();

    if (!producto) {
      throw new NotFoundException(`Producto con ID ${id} no encontrado.`);
    }

    this.logger.log(`[findOneWithRelations] Producto ${id} - subcategoriaId=${producto.subcategoriaId}, tiene subcategoria=${!!producto.subcategoria}`);


    const inventarioRegistro = producto.inventario;
    (producto as any).stock = inventarioRegistro?.stock || 0;
    (producto as any).precio = producto.precios?.[0]?.valor_unitario || producto.precio_costo || 0;
    // Exponer precio_venta calculado (si existe un precio activo, usarlo; sino usar el campo producto.precio_venta)
    (producto as any).precio_venta = producto.precios?.[0]?.valor_unitario ?? producto.precio_venta ?? 0;
    // Copiar compras/ventas/ubicacion al objeto producto para el detalle
    (producto as any).compras = inventarioRegistro?.compras ?? 0;
    (producto as any).ventas = inventarioRegistro?.ventas ?? 0;
    (producto as any).ubicacion = inventarioRegistro?.ubicacion ?? null;
    // Exponer subcategoria_id explícitamente
    (producto as any).subcategoria_id = producto.subcategoriaId;

    // ✅ CORRECCIÓN: Exponer 'categoria' como el nombre de la CATEGORÍA real (no subcategoría)
    // Si tiene subcategoría, usar el nombre de su categoría padre; sino usar la categoría directa
    (producto as any).categoria = producto.subcategoria?.categoria?.nombre ?? producto.categoria?.nombre ?? null;

    return producto;
  }

  // 🔹 UPDATE
  async update(id: number, dto: UpdateProductoDto): Promise<Producto> {
    // Cargar la entidad existente SIN eager loading de relaciones para evitar conflictos
    const producto = await this.productosRepo.findOne({
      where: { id },
      relations: [] // No cargar relaciones para evitar problemas con el save
    });
    if (!producto) throw new NotFoundException(`Producto con ID ${id} no encontrado para actualizar.`);

    this.logger.log(`[updateProducto] payload recibido: ${JSON.stringify(dto)}`);

    const anyDto: any = dto as any;
    const hasSubcategoriaProp = Object.prototype.hasOwnProperty.call(anyDto, 'subcategoriaId')
      || Object.prototype.hasOwnProperty.call(anyDto, 'subcategoria_id');
    const hasCategoriaProp = Object.prototype.hasOwnProperty.call(anyDto, 'categoriaId')
      || Object.prototype.hasOwnProperty.call(anyDto, 'categoria_id');

    // Asignar propiedades básicas (excepto las FK que manejamos después)
    for (const key of Object.keys(anyDto)) {
      if (['subcategoriaId', 'categoriaId', 'subcategoria_id', 'categoria_id'].includes(key)) continue;
      const val = anyDto[key];
      if (val !== undefined) (producto as any)[key] = val;
    }

    // 🔥 MANEJO DE SUBCATEGORÍA
    if (hasSubcategoriaProp) {
      const rawSubId = anyDto.subcategoriaId ?? anyDto.subcategoria_id;
      // 🔥 CRÍTICO: No convertir null a número, mantenerlo como null
      let subId;
      if (rawSubId === null) {
        subId = null;
      } else if (rawSubId === undefined) {
        subId = undefined;
      } else {
        subId = Number(rawSubId);
      }

      this.logger.log(`[updateProducto] subcategoriaId recibido=${JSON.stringify(rawSubId)} → procesado: ${JSON.stringify(subId)} (tipo: ${typeof subId})`);

      if (subId === null) {
        // Desvincular subcategoría - establecer explícitamente a null
        producto.subcategoriaId = null;
        this.logger.log(`[updateProducto] ✅ Desvinculando subcategoría (NULL)`);
      } else if (subId !== undefined && !Number.isNaN(subId) && subId > 0) {
        // Vincular nueva subcategoría
        const subcat = await this.subcategoriaRepo.findOneBy({ id: subId });
        if (!subcat) throw new NotFoundException(`Subcategoría con ID ${subId} no encontrada`);
        producto.subcategoriaId = subcat.id;
        this.logger.log(`[updateProducto] ✅ Vinculando subcategoría: ${subcat.id}`);
      }
    } else {
      this.logger.log(`[updateProducto] subcategoriaId no incluido en DTO; no se modificará`);
    }

    // MANEJO DE CATEGORÍA
    if (hasCategoriaProp) {
      const rawCatId = anyDto.categoriaId ?? anyDto.categoria_id;
      // 🔥 CRÍTICO: No convertir null a número, mantenerlo como null
      let catId;
      if (rawCatId === null) {
        catId = null;
      } else if (rawCatId === undefined) {
        catId = undefined;
      } else {
        catId = Number(rawCatId);
      }

      this.logger.log(`[updateProducto] categoriaId recibido=${JSON.stringify(rawCatId)} → procesado: ${JSON.stringify(catId)} (tipo: ${typeof catId})`);

      if (catId === null) {
        (producto as any).categoriaId = null;
        this.logger.log(`[updateProducto] ✅ Desvinculando categoría (NULL)`);
      } else if (catId !== undefined && !Number.isNaN(catId) && catId > 0) {
        const cat = await this.categoriaRepo.findOneBy({ id: catId });
        if (!cat) throw new NotFoundException(`Categoría con ID ${catId} no encontrada`);
        (producto as any).categoriaId = cat.id;
        this.logger.log(`[updateProducto] ✅ Vinculando categoría: ${cat.id}`);
      }
    } else {
      this.logger.log(`[updateProducto] categoriaId no incluido en DTO; no se modificará`);
    }

    // 🔥 GUARDAR - Usar QueryBuilder con valores explícitos del DTO procesado
    // Construir el objeto de actualización SOLO con lo que vino en el DTO
    const updateData: any = {};

    // Copiar SOLO las propiedades que vinieron en el DTO (excepto id y FKs que manejamos especialmente)
    for (const key of Object.keys(anyDto)) {
      if (['id', 'subcategoriaId', 'categoriaId', 'subcategoria_id', 'categoria_id'].includes(key)) continue;
      const val = anyDto[key];
      if (val !== undefined) {
        updateData[key] = val;
      }
    }

    // 🔥 FORZAR subcategoriaId explícitamente si vino en el DTO (usar el valor que YA procesamos arriba)
    if (hasSubcategoriaProp) {
      // NO usar producto.subcategoriaId porque puede tener el valor antiguo de la BD
      // Usar el valor procesado directamente
      const rawSubId = anyDto.subcategoriaId ?? anyDto.subcategoria_id;
      let subId;
      if (rawSubId === null) {
        subId = null;
      } else if (rawSubId === undefined) {
        subId = undefined;
      } else {
        subId = Number(rawSubId);
      }

      updateData.subcategoriaId = subId === null ? null : (subId > 0 ? subId : null);
      this.logger.log(`[updateProducto] 🔥 Forzando update con subcategoriaId=${JSON.stringify(updateData.subcategoriaId)}`);
    }

    //  FORZAR categoriaId explícitamente si vino en el DTO
    if (hasCategoriaProp) {
      // NO usar producto.categoriaId porque puede tener el valor antiguo de la BD
      // Usar el valor procesado directamente
      const rawCatId = anyDto.categoriaId ?? anyDto.categoria_id;
      let catId;
      if (rawCatId === null) {
        catId = null;
      } else if (rawCatId === undefined) {
        catId = undefined;
      } else {
        catId = Number(rawCatId);
      }

      updateData.categoriaId = catId === null ? null : (catId > 0 ? catId : null);
      this.logger.log(`[updateProducto] 🔥 Forzando update con categoriaId=${JSON.stringify(updateData.categoriaId)}`);
    }

    this.logger.log(`[updateProducto] 📦 Objeto completo a actualizar: ${JSON.stringify(updateData)}`);

    // Ejecutar update con QueryBuilder
    const qb = this.productosRepo.createQueryBuilder()
      .update()
      .where('id = :id', { id });

    const result = await qb.set(updateData).execute();
    this.logger.log(`[updateProducto] ✅ Producto actualizado en BD con QueryBuilder - affected: ${result.affected}`);

    // 🔥 Verificar que se guardó correctamente haciendo una consulta directa
    const verificacion = await this.productosRepo
      .createQueryBuilder('p')
      .select(['p.id', 'p.subcategoriaId', 'p.categoriaId'])
      .where('p.id = :id', { id })
      .getOne();

    this.logger.log(`[updateProducto] 🔍 Verificación BD - subcategoriaId=${verificacion?.subcategoriaId}, categoriaId=${verificacion?.categoriaId}`);

    // Actualizar inventario si aplica
    if (anyDto.stock !== undefined || anyDto.ubicacion !== undefined) {
      await this.inventarioService.actualizarInventarioPorProductoId(
        id,
        typeof anyDto.stock === 'number' ? anyDto.stock : 0,
        typeof anyDto.ubicacion === 'string' ? anyDto.ubicacion : undefined,
      );
    }

    // Actualizar precio si viene
    const nuevoPrecioParaActualizar = anyDto.precio_venta !== undefined && anyDto.precio_venta !== null
      ? anyDto.precio_venta
      : anyDto.precio;
    if (nuevoPrecioParaActualizar !== undefined && nuevoPrecioParaActualizar !== null) {
      await this.preciosService.actualizarPrecioPorProductoId(id, nuevoPrecioParaActualizar);
    }

    return this.findOneWithRelations(id);
  }


  // 🔹 DELETE
  async remove(id: number): Promise<void> {
    const producto = await this.findOneWithRelations(id);
    await this.productosRepo.remove(producto);
  }

  // 🔹 SAVE IMAGE - Guardar una imagen en la tabla producto_imagenes
  async saveImage(productoId: number, urlImagen: string, orden?: number): Promise<ProductoImagen> {
    // Validar que el producto existe
    const producto = await this.productosRepo.findOne({ where: { id: productoId } });
    if (!producto) {
      throw new NotFoundException(`Producto con ID ${productoId} no encontrado`);
    }

    // Si no se proporciona orden, contar las imágenes existentes y usar la siguiente posición
    let imagenOrden = orden;
    if (imagenOrden === undefined || imagenOrden === null) {
      const totalImagenes = await this.productoImagenRepo.count({
        where: { productoId },
      });
      imagenOrden = totalImagenes;
    }

    // Crear y guardar la nueva imagen
    const nuevaImagen = this.productoImagenRepo.create({
      productoId,
      url_imagen: urlImagen,
      orden: imagenOrden,
    });

    return await this.productoImagenRepo.save(nuevaImagen);
  }
}

