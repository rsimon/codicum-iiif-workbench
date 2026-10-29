import { useState } from 'react';
import { useLocation } from 'wouter';
import { useDropzone } from 'react-dropzone';
import { IconAlertCircle, IconLoader2 } from '@tabler/icons-react';
import { IIIFIcon } from '@/components/iiif-icon';
import { Alert, AlertDescription } from '@/shadcn/alert';
import { Button } from '@/shadcn/button';
import { Input } from '@/shadcn/input';
import { Label } from '@/shadcn/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shadcn/tabs';
import { cn } from '@/shadcn/utils';
import { useAppStore } from '@/store/app-store';
import { loadReconstructionFromJSON, loadReconstructionFromURL } from '@/store/load-reconstruction';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/shadcn/dialog';

interface OpenReconstructionDialogProps {

  open: boolean;

  onOpenChange: (open: boolean) => void;

}

export const OpenReconstructionDialog = (props: OpenReconstructionDialogProps) => {
  const loadProject = useAppStore(state => state.loadProject);

  const [_, navigate] = useLocation();

  const [url, setUrl] = useState('');
  const [tab, setTab] = useState<'url' | 'file'>('url');
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onFileImport = async (selectedFile: File) => {
    setError(null);
    setFetching(true);

    try {
      const json = JSON.parse(await selectedFile.text());
      const parsed = await loadReconstructionFromJSON(json);
      loadProject(parsed.sources, parsed.reconstruction);
      navigate('/reconstruction');
      props.onOpenChange(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load reconstruction');
    } finally {
      setFetching(false);
    }
  };

  const { getRootProps, getInputProps, isDragActive, open: openFilePicker } = useDropzone({
    accept: { 'application/json': ['.json'] },
    maxFiles: 1,
    multiple: false,
    noClick: true,
    noKeyboard: true,
    onDrop: acceptedFiles => {
      const selectedFile = acceptedFiles[0];
      if (selectedFile) void onFileImport(selectedFile);
    },
    onDropRejected: () => {
      setError('Please choose a JSON file');
    },
  });

  const resetDialog = () => {
    setUrl('');
    setTab('url');
    setError(null);
  }

  const onTabChange = (tab: string) => {
    setTab(tab as 'url' | 'file');
    setError(null);
  }

  const onOpenChange = (open: boolean) => {
    if (!open) resetDialog();
    props.onOpenChange(open);
  }

  const onURLImport = async () => {
    if (!url.trim()) {
      setError('Please enter a manifest URL');
      return;
    }

    setError(null);
    setFetching(true);

    try {
      const parsed = await loadReconstructionFromURL(url.trim());
      loadProject(parsed.sources, parsed.reconstruction);
      navigate('/reconstruction');
      props.onOpenChange(false);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Could not load reconstruction');
    } finally {
      setFetching(false);
    }
  }

  return (
    <Dialog open={props.open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl gap-4">
        <DialogHeader className="gap-2">
          <DialogTitle className="flex items-center gap-2">
            <IIIFIcon color className="size-6 mb-0.75" />
            Open Reconstruction
          </DialogTitle>
          <DialogDescription>
            Open a manifest you exported previously from this editor for further editing.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {fetching ? (
            <div className="p-4 animate-spin flex justify-center items-center">
              <IconLoader2 className="size-4 animate-spin" />
            </div>
          ) : (
            <>
              <Tabs
                value={tab}
                onValueChange={onTabChange}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="url">From URL</TabsTrigger>
                  <TabsTrigger value="file">From JSON file</TabsTrigger>
                </TabsList>

                <TabsContent 
                  value="url" 
                  className="space-y-2 pt-4"
                  tabIndex={-1}>
                  <Label htmlFor="reconstruction-url">Manifest URL</Label>
                  <Input
                    id="reconstruction-url"
                    placeholder="https://example.org/iiif/manifest.json"
                    value={url}
                    onChange={(e) => {
                      setUrl(e.target.value);
                      setError(null);
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter')
                        onURLImport();
                    }}
                  />
                </TabsContent>

                <TabsContent
                  value="file" 
                  className="pt-4"
                  tabIndex={-1}>
                  <div
                    {...getRootProps()}
                    className={cn(
                      'rounded-md border border-dashed p-6 text-center transition-colors',
                      isDragActive ? 'border-sky-600/80 bg-sky-600/20' : 'border-sky-800/30 bg-sky-800/5'
                    )}>
                    <input {...getInputProps()} />

                    <Button 
                      type="button" 
                      className="mt-3" 
                      onClick={openFilePicker}>
                      Choose file
                    </Button>

                    <p className={cn(
                      'mt-3 text-sm',
                      isDragActive ? 'text-sky-800/80' : 'text-muted-foreground'
                    )}>
                      {isDragActive ? 'Drop the JSON file here' : 'Or drag and drop a JSON file here'}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>

              {error && (
                <Alert
                  variant="destructive"
                  className="rounded">
                  <IconAlertCircle className="size-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            className="tracking-wide"
            onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
              
          {tab === 'url' && (
            <Button
              className="tracking-wide"
              onClick={onURLImport}>
              Import
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

}