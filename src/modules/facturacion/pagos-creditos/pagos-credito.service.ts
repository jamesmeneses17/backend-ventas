import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Credito } from '../creditos/entities/creditos.entity';
import { PagoCredito } from './entities/pago-credito.entity';
import { CreatePagoDto } from './dtos/create-pago.dto';

import { MovimientoCaja } from '../caja/entities/movimiento-caja.entity';

@Injectable()
export class PagosCreditoService {
  constructor(
    @InjectRepository(PagoCredito)
    private readonly pagosRepository: Repository<PagoCredito>,

    @InjectRepository(Credito)
    private readonly creditosRepository: Repository<Credito>,

    @InjectRepository(MovimientoCaja)
    private readonly cajaRepository: Repository<MovimientoCaja>,
  ) { }

  /**
   * CREATE: Registra un nuevo abono
   * UPDATE: Actualiza el saldo_pendiente en la tabla creditos
   * RESPONSE: Devuelve info clara para el frontend
   */
  async registrarAbono(createPagoDto: CreatePagoDto) {
    const { credito_id, monto_pago } = createPagoDto;

    // 1. Verificar si el crédito existe (Incluir Cliente para el concepto)
    const credito = await this.creditosRepository.findOne({
      where: { id: credito_id },
      relations: ['cliente']
    });

    if (!credito) {
      throw new NotFoundException(
        `El crédito con ID ${credito_id} no existe.`,
      );
    }

    // 2. Validar que el abono no supere el saldo pendiente
    if (monto_pago > Number(credito.saldo_pendiente)) {
      throw new BadRequestException(
        `El pago ($${monto_pago}) no puede ser mayor al saldo pendiente ($${credito.saldo_pendiente}).`,
      );
    }

    // 3. CREATE: Insertar el pago
    const nuevoPago = this.pagosRepository.create({
      credito_id,
      monto_pago,
      fecha_pago: createPagoDto.fecha_pago ? new Date(createPagoDto.fecha_pago) : new Date(),
    });
    const pagoGuardado = await this.pagosRepository.save(nuevoPago);

    // 3.5. SYNC CAJA: Crear movimiento de ingreso
    const concepto = `Abono a Factura: ${credito.numero_factura || 'S/N'} - Cliente: ${credito.cliente?.nombre || 'Desconocido'}`;
    // Usar la misma fecha del pago para el movimiento de caja
    const fechaMovimiento = createPagoDto.fecha_pago
      ? new Date(createPagoDto.fecha_pago).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0];

    const nuevoMovimiento = this.cajaRepository.create({
      fecha: fechaMovimiento,
      tipoMovimientoId: 6, // 6 = Ingreso por Abono (Según requerimiento)
      monto: monto_pago,
      concepto: concepto,
      ventaId: null,
      compraId: null,
      pagoCreditoId: pagoGuardado.id
    });
    await this.cajaRepository.save(nuevoMovimiento);

    // 4. UPDATE: Calcular nuevo saldo
    const nuevoSaldo =
      Number(credito.saldo_pendiente) - Number(monto_pago);
    credito.saldo_pendiente = nuevoSaldo;

    // 5. Estado
    if (nuevoSaldo <= 0) {
      credito.estado = 'PAGADO';
    } else {
      credito.estado = 'PENDIENTE'; // Re-asegurar pendiente si hay saldo
    }

    const creditoActualizado =
      await this.creditosRepository.save(credito);

    // 6. RESPUESTA NORMALIZADA (🔥 CLAVE 🔥)
    return {
      mensaje: 'Pago registrado correctamente',
      nuevo_saldo: Number(creditoActualizado.saldo_pendiente),
      estado: creditoActualizado.estado,
    };
  }

  async anularAbono(id: number) {
    // 1. Buscar el pago
    const pago = await this.pagosRepository.findOneBy({ id });
    if (!pago) throw new NotFoundException('Pago no encontrado');

    // 2. Buscar crédito asociado
    const credito = await this.creditosRepository.findOneBy({ id: pago.credito_id });
    if (!credito) throw new NotFoundException('Crédito asociado no encontrado');

    // 3. Lógica de reversión (HARD DELETE porque no hay columna estado)
    await this.pagosRepository.delete(id);

    // Retornar saldo al crédito
    credito.saldo_pendiente = Number(credito.saldo_pendiente) + Number(pago.monto_pago);

    // Si el crédito estaba PAGADO, ahora vuelve a estar PENDIENTE (si saldo > 0)
    if (credito.saldo_pendiente > 0) {
      credito.estado = 'PENDIENTE';
    }

    await this.creditosRepository.save(credito);

    return { success: true, message: 'Pago eliminado y saldo restaurado' };
  }

  async buscarPagosPorCredito(creditoId: number) {
    return this.pagosRepository.find({
      where: { credito_id: creditoId },
      order: { fecha_pago: 'DESC' },
    });
  }
}
