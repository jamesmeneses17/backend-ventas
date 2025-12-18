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
  ) {}

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
      fecha_pago: new Date(),
    });
    await this.pagosRepository.save(nuevoPago);

    // 4. UPDATE: Calcular nuevo saldo
    const nuevoSaldo =
      Number(credito.saldo_pendiente) - Number(monto_pago);
    credito.saldo_pendiente = nuevoSaldo;

    // 5. Estado
    if (nuevoSaldo <= 0) {
      credito.estado = 'PAGADO';
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

  async buscarPagosPorCredito(creditoId: number) {
    return this.pagosRepository.find({
      where: { credito_id: creditoId },
      order: { fecha_pago: 'DESC' },
    });
  }
}
