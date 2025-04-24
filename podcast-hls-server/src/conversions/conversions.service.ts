import { Injectable } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import { ConversionStatus, SocketGateway } from './socket.gateway';

@Injectable()
export class ConversionsService {
  constructor(private readonly socketGateway: SocketGateway) {}

  private OUTPUT_DIR = path.join(process.cwd(), '..', 'output');
  private INPUT_DIR = path.join(process.cwd(), '..', 'input');

  async ConvertWavToHls(
    file: Express.Multer.File,
    clientId: string,
  ): Promise<string> {
    const fileName = await this.saveInputFile(file, clientId);
    return await this.convertWithFfmpeg(fileName, clientId);
  }

  private async saveInputFile(
    file: Express.Multer.File,
    clientId: string,
  ): Promise<string> {
    this.socketGateway.sendConversionStatus(
      clientId,
      ' preparing files...',
      ConversionStatus.PROCESSING,
    );

    if (!fs.existsSync(this.INPUT_DIR)) {
      fs.mkdirSync(this.INPUT_DIR, { recursive: true });
    }

    const fileNameWithoutExtension = file.originalname.split('.')[0];
    const uniqueFilename = `${Date.now()}-${fileNameWithoutExtension}.wav`;
    const currentConversionPath = path.join(
      this.OUTPUT_DIR,
      fileNameWithoutExtension,
    );

    const filePath = path.join(this.INPUT_DIR, uniqueFilename);

    fs.writeFileSync(filePath, file.buffer);

    fs.mkdirSync(currentConversionPath, { recursive: true });

    if (fs.existsSync(filePath) && fs.existsSync(currentConversionPath)) {
      return uniqueFilename;
    } else {
      throw new Error(`Failed to save file at ${filePath}`);
    }
  }

  private async convertWithFfmpeg(
    fileName: string,
    clientId: string,
  ): Promise<string> {
    this.socketGateway.sendConversionStatus(
      clientId,
      ' last checks...',
      ConversionStatus.PROCESSING,
    );

    const inputPath = path.join(process.cwd(), '../input', fileName);
    const fileNameWithoutExtension = fileName.split('.')[0];
    const currentConversionPath = path.join(
      this.OUTPUT_DIR,
      fileNameWithoutExtension,
    );

    // Check if input file exists
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input file not found at ${inputPath}`);
    }

    // Create output directory if it doesn't exist
    if (!fs.existsSync(currentConversionPath)) {
      fs.mkdirSync(currentConversionPath, { recursive: true });
    }

    // Define output filenames
    const outputPlaylistName = `${fileNameWithoutExtension}.m3u8`;
    const segmentFilename = `${fileNameWithoutExtension}-segment_%03d.ts`;
    const outputPlaylistPath = path.join(
      currentConversionPath,
      outputPlaylistName,
    );
    const segmentOutputPathPattern = path.join(
      currentConversionPath,
      segmentFilename,
    );

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-c:a aac',
          '-b:a 128k',
          '-f hls',
          '-hls_time 5', // seconds set on 5 to make loading time longer and status changes more visible
          '-hls_playlist_type vod',
          `-hls_segment_filename ${segmentOutputPathPattern}`, // Segment names
        ])
        .output(outputPlaylistPath)
        .on('start', () => {
          this.socketGateway.sendConversionStatus(
            clientId,
            ' converting...',
            ConversionStatus.PROCESSING,
          );
        })
        .on('end', () => {
          this.socketGateway.sendConversionStatus(
            clientId,
            ' completed',
            ConversionStatus.COMPLETED,
          );

          resolve(outputPlaylistName);
        })
        .on('error', (err) => {
          console.error(
            `FFmpeg error during conversion for ${inputPath}: ${err.message}`,
          );
          this.socketGateway.sendConversionStatus(
            clientId,
            ' completed',
            ConversionStatus.ERROR,
          );
          reject(new Error(`FFmpeg conversion failed: ${err.message}`));
        })
        .run();
    });
  }
}
