import {
  Controller,
  Headers,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ConversionsService } from './conversions.service';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('')
export class ConversionsController {
  constructor(private readonly conversionsService: ConversionsService) {}

  @Post('process-hls')
  @UseInterceptors(FileInterceptor('file'))
  async convertWavToHls(
    @UploadedFile() file: Express.Multer.File,
    @Headers('client-id') clientId: string,
  ) {
    console.log('Client ID:', clientId);

    const res = await this.conversionsService.ConvertWavToHls(file, clientId);
    return { fileName: res };
  }
}
