import { Injectable } from '@nestjs/common';
import * as ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as fs from 'fs';

@Injectable()
export class ConversionsService {
  private OUTPUT_DIR = path.join(process.cwd(), '..', 'output');
  private INPUT_DIR = path.join(process.cwd(), '..', 'input');

  async simpleConvertWavToHls(file: Express.Multer.File): Promise<string> {
    const fileName = await this.saveInputFile(file);
    return await this.convertWithFfmpeg(fileName);
  }

  private async saveInputFile(file: Express.Multer.File): Promise<string> {
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

  private async convertWithFfmpeg(fileName: string): Promise<string> {
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

    console.log(
      `Starting HLS conversion for ${inputPath} -> ${currentConversionPath}`,
    );

    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .outputOptions([
          '-c:a aac', // Audio codec: AAC
          '-b:a 128k', // Audio bitrate: 128kbps (adjust if needed)
          '-f hls', // Output format: HLS
          '-hls_time 10', // Segment duration: 10 seconds
          '-hls_playlist_type vod', // Playlist type: Video On Demand
          `-hls_segment_filename ${segmentOutputPathPattern}`, // Segment file naming pattern
        ])
        // --- Output File ---
        .output(outputPlaylistPath) // Master playlist file

        // --- Event Handlers ---
        .on('end', () => {
          console.log(`FFmpeg process finished successfully for ${inputPath}.`);
          resolve(outputPlaylistName); // Resolve with the playlist path
        })
        .on('error', (err) => {
          console.error(
            `FFmpeg error during conversion for ${inputPath}: ${err.message}`,
          );
          reject(new Error(`FFmpeg conversion failed: ${err.message}`)); // Reject on error
        })

        // --- Run FFmpeg ---
        .run();
    });
  }
}
