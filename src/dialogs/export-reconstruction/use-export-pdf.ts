import { convertManifest } from 'pdiiif';
import { useCallback, useEffect, useRef, useState } from 'react';

const doExport = async (manifest: any) => {
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
  );

  const blob = new Blob(chunks as BlobPart[], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'manifest.pdf';
  document.body.appendChild(a);
  a.click();
  a.remove();

  return url;
}

export const useExportPDF = () => {
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<Error | undefined>(undefined);

  const urlRef = useRef<string | null>(null);
  const isMountedRef = useRef(true);

  const revoke = () => {
    if (!urlRef.current) return;
    URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
  }

  useEffect(() => {
    isMountedRef.current = true;

    return () => {
      isMountedRef.current = false;
      revoke();
    };
  }, []);

  const exportPDF = useCallback((manifest: any) => {
    setProcessing(true);
    setError(undefined)

    doExport(manifest)
      .then(url => {
        revoke();

        if (!isMountedRef.current) {
          URL.revokeObjectURL(url);
          return;
        }

        urlRef.current = url;
        setProcessing(false);
      })
      .catch(e => {
        if (!isMountedRef.current) return;
        setProcessing(false);
        setError(e instanceof Error ? e : new Error(String(e)));
      });
  }, []);

  return { exportPDF, error, processing };
}