import { Module } from '@nestjs/common';
import { ConversionsController } from './conversions.controller';
import { ConversionsService } from './conversions.service';
import { SocketGateway } from './socket.gateway';

@Module({
  controllers: [ConversionsController],
  providers: [ConversionsService, SocketGateway],
})
export class ConversionsModule {}
