import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { randomUUID } from 'crypto';

/**
 * Wrapper sobre o OCI Object Storage via API compativel com S3.
 * Endpoint: https://{namespace}.compat.objectstorage.{region}.oraclecloud.com
 * Cada tenant tem seu proprio prefixo de chave (tenant/{tenant_id}/...) dentro do
 * mesmo bucket, garantindo isolamento logico sem precisar de bucket por escritorio.
 */
@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(private readonly config: ConfigService) {
    const namespace = this.config.get<string>('OCI_NAMESPACE');
    const region = this.config.get<string>('OCI_REGION') ?? 'sa-saopaulo-1';
    this.bucket = this.config.get<string>('OCI_BUCKET_NAME') ?? 'JurisFlow';

    this.client = new S3Client({
      region,
      endpoint: `https://${namespace}.compat.objectstorage.${region}.oraclecloud.com`,
      forcePathStyle: true,
      credentials: {
        accessKeyId: this.config.get<string>('OCI_ACCESS_KEY_ID') ?? '',
        secretAccessKey: this.config.get<string>('OCI_SECRET_ACCESS_KEY') ?? '',
      },
    });
  }

  montarChave(tenantId: string, nomeOriginal: string, pasta = 'documentos'): string {
    const extensao = nomeOriginal.includes('.') ? nomeOriginal.split('.').pop() : undefined;
    const nomeUnico = `${randomUUID()}${extensao ? `.${extensao}` : ''}`;
    return `tenant/${tenantId}/${pasta}/${nomeUnico}`;
  }

  async upload(chave: string, buffer: Buffer, mime: string): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: chave, Body: buffer, ContentType: mime }),
    );
    this.logger.log(`Upload concluido: ${chave} (${buffer.length} bytes)`);
  }

  async gerarUrlDownload(chave: string, expiraEmSegundos = 300): Promise<string> {
    const comando = new GetObjectCommand({ Bucket: this.bucket, Key: chave });
    return getSignedUrl(this.client, comando, { expiresIn: expiraEmSegundos });
  }

  async excluir(chave: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: chave }));
  }
}
