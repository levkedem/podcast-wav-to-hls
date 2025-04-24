import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
export enum ConversionStatus {
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  ERROR = 'error',
}

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class SocketGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  handleConnection(client: any) {}

  handleDisconnect(client: any) {}

  @SubscribeMessage('register')
  handleRegister(client: Socket, payload: { clientId: string }): void {
    const { clientId } = payload;
    client.join(clientId);
  }

  // Send message to a specific client
  sendToClient(clientId: string, event: string, data: any) {
    this.server.to(clientId).emit(event, data);
  }

  // update from cenversion service
  sendConversionStatus(
    clientId: string,
    message: string = '',
    status: ConversionStatus,
  ) {
    this.sendToClient(clientId, 'conversionUpdate', {
      status: status,
      message,
    });
  }
}
