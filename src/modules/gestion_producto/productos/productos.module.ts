import { Module } from '@nestjs/common';
import { ProductosService } from './productos.service';
import { ProductosController } from './productos.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Producto } from './entities/producto.entity';
import { ProductoImagen } from './entities/producto-imagen.entity';
import { Categoria } from '../../catalogos_basicos/categorias/entities/categoria.entity';
import { Subcategoria } from '../../catalogos_basicos/subcategorias/entities/subcategoria.entity';
import { EstadosModule } from '../../catalogos_basicos/estados/estados.module';
import { InventarioModule } from '../inventario/inventario.module';
import { PreciosModule } from '../precios/precios.module';
import { R2Module } from '../../../common/r2.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Producto, ProductoImagen, Subcategoria, Categoria]),
    EstadosModule,
    InventarioModule,
    PreciosModule,
    R2Module,
  ],
  controllers: [ProductosController],
  providers: [ProductosService],
  
})
export class ProductosModule { }