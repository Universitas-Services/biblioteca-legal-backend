import { Injectable } from '@nestjs/common';
import { Storage } from '@google-cloud/storage';

@Injectable()
export class StorageService {
  private storage: Storage;
  private bucketName = 'universitas-leyes-bucket'; // Aquí pondremos el nombre de tu bucket en GCP

  constructor() {
    // Inicializa el cliente de GCS.
    this.storage = new Storage();
  }

  async uploadPdf(fileName: string, fileBuffer: Buffer): Promise<string> {
    const bucket = this.storage.bucket(this.bucketName);
    const file = bucket.file(`originales/${Date.now()}-${fileName}`);

    // Subimos el buffer del archivo a la nube
    await file.save(fileBuffer, {
      metadata: { contentType: 'application/pdf' },
    });

    // Retornamos la ruta de GCS
    return `gs://${this.bucketName}/${file.name}`;
  }
}
