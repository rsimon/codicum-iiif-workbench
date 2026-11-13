import { convertManifest } from 'pdiiif';

export const exportPDF = async (manifest: any) => {
  const chunks: Uint8Array[] = [];

  const webWritable = new WritableStream<Uint8Array>({
    write(chunk) {
      chunks.push(chunk);
    },
  });

  await convertManifest(
    manifest,
    webWritable,
    {
      ppi: 200
    }
  )

  const blob = new Blob(chunks as BlobPart[], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'manifest.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();

  // Revoke later so the download has time to start
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}