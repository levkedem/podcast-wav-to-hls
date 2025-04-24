import {
  Controller,
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
  async convertWavToHls(@UploadedFile() file: Express.Multer.File) {
    const res = await this.conversionsService.simpleConvertWavToHls(file);
    return { fileName: res };
  }
}
