import {
    WebSocketGateway,
    OnGatewayConnection,
    OnGatewayDisconnect,
    WebSocketServer
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { UsuariosAdminService } from './usuarios-admin.service';

@WebSocketGateway({ cors: true })
export class UsuariosGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer() server: Server;

    constructor(private readonly usuariosService: UsuariosAdminService) { }

    async handleConnection(client: Socket) {
        try {
            // Intentar obtener ID del handshake query
            const userId = client.handshake.query.userId as string;

            if (userId) {
                console.log(`🟢 Cliente conectado: ${client.id} (User ID: ${userId})`);
                // Actualizar a en linea
                await this.usuariosService.setOnlineStatus(+userId, 1);

                // Unir al room del usuario por si necesitamos mensajes privados
                client.join(`user_${userId}`);
            } else {
                console.log(`🟡 Cliente conectado anónimo: ${client.id}`);
            }
        } catch (error) {
            console.error('Error en handleConnection:', error);
        }
    }

    async handleDisconnect(client: Socket) {
        try {
            const userId = client.handshake.query.userId as string;

            if (userId) {
                console.log(`🔴 Cliente desconectado: ${client.id} (User ID: ${userId})`);

                // IMPORTANTE: Un usuario puede tener varias pestañas. 
                // Idealmente deberíamos contar conexiones, pero por ahora 
                // simplificaremos asumiendo que si se desconecta el socket, se desconecta el usuario.
                // Una mejora sería usar un Set en memoria o Redis.

                // Actualizar a desconectado
                await this.usuariosService.setOnlineStatus(+userId, 0);
            }
        } catch (error) {
            console.error('Error en handleDisconnect:', error);
        }
    }
}
