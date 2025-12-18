// src/common/services/r2.service.ts
import { Injectable } from '@nestjs/common';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { randomBytes } from 'crypto';
import * as path from 'path';

@Injectable()
export class R2Service {
  private client: S3Client;
  private bucket = process.env.R2_BUCKET_NAME;
  private publicUrl = process.env.R2_PUBLIC_URL; // p.ej. https://pub-xxx.r2.dev

  constructor() {
    const accessKeyId = process.env.R2_ACCESS_KEY_ID as string;
    const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY as string;

    this.client = new S3Client({
      region: (process.env.R2_REGION ?? 'auto') as string,
      endpoint: process.env.R2_ENDPOINT as string | undefined, // p.ej. https://<account>.r2.cloudflarestorage.com
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
      forcePathStyle: false,
    });
  }

  private makeKey(filename: string) {
    const ext = path.extname(filename) || '';
    const unique = `${Date.now()}-${randomBytes(6).toString('hex')}`;
    return `${unique}${ext}`;
  }

  async uploadBuffer(fileBuffer: Buffer, originalName: string, mimeType: string) {
    const Key = this.makeKey(originalName);

    const cmd = new PutObjectCommand({
      Bucket: this.bucket,
      Key,
      Body: fileBuffer,
      ContentType: mimeType,
      // Cloudflare R2 no usa ACLs como 'public-read'
    });

    await this.client.send(cmd);

    // URL pública (si configuraste el dominio público en R2)
    const publicUrl = `${this.publicUrl}/${Key}`;
    return { Key, url: publicUrl };
  }

  async deleteFile(key: string) {
    const cmd = new DeleteObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    await this.client.send(cmd);
    return { message: 'Archivo eliminado de R2', key };
  }
}