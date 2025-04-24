import { Injectable } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';
import { ConversionStatus, SocketGateway } from './socket.gateway';
import chokidar from 'chokidar';
@Injectable()
export class ConversionsService {
  constructor(private readonly socketGateway: SocketGateway) {}

  private readonly OUTPUT_DIR = path.join(process.cwd(), '..', 'output');
  private readonly INPUT_DIR = path.join(process.cwd(), '..', 'input');
  private readonly SEGMENT_SIZE = 5;

  async ConvertWavToHls(
    file: Express.Multer.File,
    clientId: string,
  ): Promise<string> {
    const fileName = await this.setUpFiles(file, clientId);
    return await this.convertWithFfmpeg(fileName, clientId);
  }

  private async setUpFiles(
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

    const input = path.join(this.INPUT_DIR, uniqueFilename);

    try {
      //saves input file
      fs.writeFileSync(input, file.buffer);

      //create directory for the specific conversion
      fs.mkdirSync(currentConversionPath, { recursive: true });
    } catch (error) {
      throw new Error(`file Set failed: ${error}`);
    }

    if (fs.existsSync(input) && fs.existsSync(currentConversionPath)) {
      return uniqueFilename;
    } else {
      throw new Error(`Failed to save file at ${input}`);
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

    // paths
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
    const wavFileLength = await this.getWavFileLength(inputPath);

    return new Promise((resolve, reject) => {
      //checking file creation for the progress bar
      if (typeof wavFileLength === 'number') {
        let segmentCount = 0;
        const expectedSegments =
          Math.ceil(wavFileLength / this.SEGMENT_SIZE) + 1;

        const watcher = chokidar.watch(currentConversionPath, {
          persistent: true,
          ignoreInitial: true,
          depth: 0,
          awaitWriteFinish: {
            stabilityThreshold: 200,
            pollInterval: 80,
          },
        });

        watcher.on('add', () => {
          segmentCount++;
          this.socketGateway.sendconversionProgress(
            clientId,
            segmentCount / expectedSegments,
          );
        });
      }

      ffmpeg(inputPath)
        .outputOptions([
          '-c:a aac',
          '-b:a 128k',
          '-f hls',
          `-hls_time ${this.SEGMENT_SIZE}`, // seconds set on 5 to make loading time longer and status changes more visible
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
  private async getWavFileLength(filePath: string) {
    // returns null if fails because it isnt essential
    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return reject(null);
        resolve(metadata.format.duration);
      });
    });
  }
}
