import { ConfigurableModuleBuilder, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CategoriasModule } from './modules/catalogos_basicos/categorias/categorias.module';
import { MarcasModule } from './modules/catalogos_basicos/marcas/marcas.module';
import { UnidadesMedidaModule } from './modules/catalogos_basicos/unidades-medida/unidades-medida.module';
import { EspecificacionesModule } from './modules/catalogos_basicos/especificaciones/especificaciones.module';
import { ProductosModule } from './modules/gestion_producto/productos/productos.module';
import { InventarioModule } from './modules/gestion_producto/inventario/inventario.module';
import { PreciosModule } from './modules/gestion_producto/precios/precios.module';
import { TiposDocumentoModule } from './modules/cliente-administracion/tipos-documento/tipos-documento.module';
import { UsuariosAdminModule } from './modules/cliente-administracion/usuarios-admin/usuarios-admin.module';
import { MetodosPagoModule } from './modules/cliente-administracion/metodos-pago/metodos-pago.module';
import { ClientesModule } from './modules/cliente-administracion/clientes/clientes.module';
import { AuthModule } from './modules/auth/auth.module';
import { ComprasModule } from './modules/gestion_producto/compras/compras.module';
import { Venta } from './modules/gestion_producto/ventas/entities/venta.entity';
import { VentasModule } from './modules/gestion_producto/ventas/ventas.module';
import { CreditosModule } from './modules/facturacion/creditos/creditos.module';
import { CategoriasPrincipalesModule } from './modules/catalogos_basicos/categorias-principales/categorias-principales.module';
import { R2Service } from './common/services/r2.service';
import { R2Module } from './common/r2.module';
import { InformacionEmpresaModule } from './modules/configuracion_web/informacion_empresa/informacion-empresa.module';
import { BannerModule } from './modules/configuracion_web/banners_carrusel/banner.module';
import { SubcategoriasModule } from './modules/catalogos_basicos/subcategorias/subcategorias.module';
import { BannerImagen } from './modules/configuracion_web/banners_carrusel/entities/banner-imagen.entity';

@Module({
  imports: [ConfigModule.forRoot({ isGlobal: true }),
  TypeOrmModule.forRootAsync({
    inject: [ConfigService],
    useFactory: (config: ConfigService) => ({
      type: 'mysql',
      host: config.get<string>('DB_HOST', 'localhost'),
      port: Number(config.get<string>('DB_PORT') ?? 3306),
      username: config.get('DB_USER'),
      password: config.get('DB_PASS'),
      database: config.get('DB_NAME'),
      autoLoadEntities: true,
      synchronize: false,
    }),
  }),
    CategoriasModule,
    MarcasModule,
    UnidadesMedidaModule,
    EspecificacionesModule,
    ProductosModule,
    InventarioModule,
    PreciosModule,
    TiposDocumentoModule,
    ClientesModule,
    MetodosPagoModule,
    UsuariosAdminModule,
    AuthModule,
    ComprasModule,
    VentasModule,
    CreditosModule,
    CategoriasPrincipalesModule,
    R2Module,
    InformacionEmpresaModule,
    BannerModule,
    SubcategoriasModule,
    InformacionEmpresaModule,
    BannerModule,
    BannerImagen,
    R2Module,
    
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
