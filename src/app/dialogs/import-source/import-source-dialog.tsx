import { useEffect, useMemo, useRef, useState } from 'react';
import { IconAlertTriangle, IconLoader2, IconPhotoPlus, IconStack2 } from '@tabler/icons-react';
import { IconAlertCircle } from '@tabler/icons-react';
import pThrottle from 'p-throttle';
import { useLocation } from 'wouter';
import { Cozy, type CozyCollectionManifestItem, type CozyManifest } from 'cozy-iiif';
import { Alert, AlertDescription } from '@/shadcn/alert';
import { Button } from '@/shadcn/button';
import { Input } from '@/shadcn/input';
import { Label } from '@/shadcn/label';
import { useAppStore } from '@/store/app-store';
import { crawlCollection } from './crawl-collection';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shadcn/dialog';

const throttledParseURL = pThrottle({ limit: 2, interval: 1000 })(
  (url: string) => Cozy.parseURL(url)
);

const isMadeWithCODICUM = (manifest: CozyManifest) =>
  manifest.getMetadata().some(m => m.label === 'Created with' && m.value.toLowerCase().includes('codicum'));

interface ImportSourceDialogProps {

  open: boolean;

  withURL? : string;

  onOpenChange: (open: boolean) => void;

  onOpenReconstructionInstead(url: string): void;

}

type DialogStep =
  | { phase: 'input' }
  | { phase: 'prompt-open-as-reconstruction' }
  | { phase: 'crawling'; foundCount: number }
  | { phase: 'confirm'; manifests: CozyCollectionManifestItem[] }
  | { phase: 'bulk-import'; progress: number; total: number; current?: string };

export const ImportSourceDialog = (props: ImportSourceDialogProps) => {
  const [location, navigate] = useLocation();

  const addSource = useAppStore(state => state.addSource);

  const [url, setUrl] = useState('');

  const [step, setStep] = useState<DialogStep>(
    props.withURL ? { phase: 'crawling', foundCount: 0 } : { phase: 'input' });

  const [error, setError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);

  const isProjectEmpty = useMemo(() => {
    if (!props.open) return true;

    const { reconstruction, sources } = useAppStore.getState();
    return reconstruction.length === 0 && sources.length === 0;
  }, [props.open]);

  useEffect(() => {
    if (props.open && props.withURL) onImport(props.withURL);
  }, [props.open, props.withURL]);

  const goToSourcesTab = () => {
    if (location !== '/sources')
      navigate("/sources");
  }

  const resetDialog = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setUrl('');
    setError(null);
    setStep({ phase: 'input' });
  };

  const onOpenChange = (open: boolean) => {
    if (!open) resetDialog();
    props.onOpenChange(open);
  }

  const onImport = async (withUrl = url) => {
    if (!withUrl.trim()) {
      setError('Please enter a manifest URL');
      return;
    }
    
    setUrl(withUrl);
    setError(null);
    setStep({ phase: 'crawling', foundCount: 0 });

    const abort = new AbortController();
    abortRef.current = abort;
  
    try {
      const result = await Cozy.parseURL(withUrl);

      if (abort.signal.aborted) return;

      if (result.type === 'error' && result.code === 'INVALID_URL')
        throw new Error('Not a valid URL');

      if (result.type === 'error' && result.code === 'INVALID_MANIFEST')
        throw new Error('Could not parse the manifest');

      if (result.type === 'error')
        throw new Error('Could not fetch - connection error or invalid content');

      if (result.type !== 'manifest' && result.type !== 'collection')
        throw new Error('Not a valid IIIF presentation or collection manifest');

      if (result.type === 'manifest') {
        if (isMadeWithCODICUM(result.resource)) {
          setStep({ phase: 'prompt-open-as-reconstruction' });
          return;
        }

        addSource(withUrl, result.resource);
        resetDialog();

        goToSourcesTab();

        props.onOpenChange(false);
        return;
      } 

      // Collection? Show info and await extra confirmation
      const manifests = await crawlCollection(
        result.resource,
        items => setStep({ phase: 'crawling', foundCount: items.length }),
        abort.signal
      );
      
      if (manifests.length === 0)
        throw new Error('Empty collection');

      if (!abort.signal.aborted)
        setStep({ phase: 'confirm', manifests });  
    } catch (err) {
      if (!abort.signal.aborted)
        setError(err instanceof Error ? err.message : 'Failed to import manifest');
      
      setStep({ phase: 'input' });
    }
  }

  const onConfirmCollectionImport = () => {
    if (step.phase !== 'confirm') return;

    const signal = abortRef.current?.signal;

    const total = step.manifests.length;

    let progress = 1;
    let current = step.manifests[0].getLabel();

    setStep({ phase: 'bulk-import', progress, total, current });

    step.manifests.reduce<Promise<void>>((p, manifest) => p.then(() => {
      if (signal?.aborted) return;

      current = manifest.getLabel();

      setStep({ phase: 'bulk-import', progress, total, current });
      return throttledParseURL(manifest.id).then(result => {
        if (signal?.aborted) return;

        if (result.type === 'manifest') {
          addSource(manifest.id, result.resource);
        } else {
          throw new Error('Not a valid IIIF presentation manifest');
        }

        progress += 1;
      });
    }), Promise.resolve()).then(() => {
      if (signal?.aborted) return;

      goToSourcesTab();
      
      resetDialog();
      props.onOpenChange(false);
    }).catch(error => {
      if (signal?.aborted) return;

      setError(error.message || 'Failed to import collection');
    });
  }

  const onBack = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setError(null);
    setStep({ phase: 'input' });
  }

  const onOpenAsReconstruction = () => {
    props.onOpenReconstructionInstead(url);
    resetDialog();
    props.onOpenChange(false);
  }
  
  return (
    <Dialog 
      open={props.open} 
      onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg gap-1">
        <DialogHeader className="space-y-2">
          <DialogTitle className="flex items-center gap-2">
            {step.phase === 'prompt-open-as-reconstruction' ? (
              <span>This is a CODICUM project</span>
            ) : (
              <>
                <IconPhotoPlus className="size-4" strokeWidth={2.25} />
                Import IIIF Manifest
              </>
            )}
          </DialogTitle>

          <DialogDescription className="leading-relaxed">
            {step.phase === 'input' ? (
              <span>
                Enter the URL of a IIIF Presentation or Collection manifest to import it as
                a source for your reconstruction.
              </span>
            ) : step.phase === 'crawling' ? (
              <span>
                This URL points to a IIIF Collection manifest.
              </span>
            ) : step.phase === 'prompt-open-as-reconstruction' ? (
              <span>
                This manifest was saved with the CODICUM workbench and contains 
                a reconstruction. <span className="text-foreground font-medium">Do you want to open it as a project instead?</span>
              </span>
            ) : null}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {step.phase === 'input' ? (
            <div className="space-y-2">
              <Label htmlFor="manifest-url">Manifest URL</Label>
              <Input
                id="manifest-url"
                placeholder="https://example.org/iiif/manifest.json"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter')
                    onImport();
                }}
              />
            </div>
          ) : step.phase === 'crawling' ? (
            <Alert>
              <IconLoader2 className="size-4 animate-spin" />
              <AlertDescription>
                Resolving collection{' '}
                {step.foundCount > 0 && (
                  <span className="text-muted-foreground">
                    found <span className="font-semibold">{step.foundCount.toLocaleString()}</span> manifest
                    {step.foundCount !== 1 ? 's' : ''} so far
                  </span>
                )}
              </AlertDescription>
            </Alert>
          ) : step.phase === 'prompt-open-as-reconstruction' ? (
            isProjectEmpty ? null : (
              <Alert 
                variant="destructive"
                className="border-destructive bg-destructive/5 leading-relaxed">
                <IconAlertTriangle className="size-4" />
                <AlertDescription>
                  <span className="font-medium">Warning!</span> Opening a project replaces your current 
                  workspace. Your current project will be reset. This cannot be undone.
                </AlertDescription>
              </Alert>
            )
          ) : step.phase === 'confirm' ? (
            <Alert>
              <IconStack2 className="size-4" />
              <AlertDescription>
                This collection contains{' '}
                <span className="font-semibold">{step.manifests.length.toLocaleString()}</span>{' '}
                {step.manifests.length === 1 ? 'manifest' : 'manifests'}.
                Import all of them?
              </AlertDescription>
            </Alert>
          ) : (
            <Alert>
              <IconStack2 className="size-4" />
              <AlertDescription className="overflow-hidden">
                Importing {step.progress} of {step.total}
                <div className="font-light whitespace-nowrap truncate mt-2">
                  {step.current || '[unnamed manifest]'}
                </div>
              </AlertDescription>
            </Alert>
          )}
          
          {error && (
            <Alert 
              variant="destructive"
              className="rounded">
              <IconAlertCircle className="size-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </div>
        
        <DialogFooter>
          {step.phase === 'input' ? (
            <>
              <Button
                variant="ghost"
                className="tracking-wide"
                onClick={() => props.onOpenChange(false)}>
                Cancel
              </Button>
              
              <Button 
                className="tracking-wide"
                onClick={() => onImport()}>
                Import
              </Button>
            </>
          ) : step.phase === 'crawling' || step.phase === 'bulk-import' ? (
            <Button
              variant="outline"
              onClick={onBack}>
              Cancel
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={onBack}>
                Back
              </Button>

              {step.phase === 'prompt-open-as-reconstruction' ? (
                <Button onClick={onOpenAsReconstruction}>
                  Yes, open as project
                </Button>
              ) : (
                <Button onClick={onConfirmCollectionImport}>
                  Import All
                </Button>
              )}
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

}