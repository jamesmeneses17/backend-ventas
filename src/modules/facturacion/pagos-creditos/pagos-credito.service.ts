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

@Injectable()
export class PagosCreditoService {
  constructor(
    @InjectRepository(PagoCredito)
    private readonly pagosRepository: Repository<PagoCredito>,

    @InjectRepository(Credito)
    private readonly creditosRepository: Repository<Credito>,
  ) { }

  /**
   * CREATE: Registra un nuevo abono
   * UPDATE: Actualiza el saldo_pendiente en la tabla creditos
   * RESPONSE: Devuelve info clara para el frontend
   */
  async registrarAbono(createPagoDto: CreatePagoDto) {
    const { credito_id, monto_pago } = createPagoDto;

    // 1. Verificar si el crédito existe
    const credito = await this.creditosRepository.findOneBy({ id: credito_id });
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
      notas: createPagoDto.notas,
      estado: 'ACTIVO',
    });
    await this.pagosRepository.save(nuevoPago);

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

    if (pago.estado === 'ANULADO') {
      throw new BadRequestException('El pago ya está anulado');
    }

    // 2. Buscar crédito asociado
    const credito = await this.creditosRepository.findOneBy({ id: pago.credito_id });
    if (!credito) throw new NotFoundException('Crédito asociado no encontrado');

    // 3. Lógica de reversión
    pago.estado = 'ANULADO';
    await this.pagosRepository.save(pago);

    // Retornar saldo al crédito
    credito.saldo_pendiente = Number(credito.saldo_pendiente) + Number(pago.monto_pago);

    // Si el crédito estaba PAGADO, ahora vuelve a estar PENDIENTE (si saldo > 0)
    // Aunque técnicamente si se anula el pago total, vuelve a PENDIENTE
    if (credito.saldo_pendiente > 0) {
      credito.estado = 'PENDIENTE';
    }

    await this.creditosRepository.save(credito);

    return { success: true, message: 'Pago anulado y saldo restaurado' };
  }

  async buscarPagosPorCredito(creditoId: number) {
    return this.pagosRepository.find({
      where: { credito_id: creditoId },
      order: { fecha_pago: 'DESC' },
    });
  }
}
