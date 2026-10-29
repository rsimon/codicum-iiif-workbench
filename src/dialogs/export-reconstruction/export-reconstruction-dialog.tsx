import { useMemo, useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { IIIFIcon } from '@/components/iiif-icon';
import { Button } from '@/shadcn/button';
import { Label } from '@/shadcn/label';
import { Input } from '@/shadcn/input';
import { Textarea } from '@/shadcn/textarea';
import { useAppStore } from '@/store/app-store';
import { createManifest } from './create-manifest';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from '@/shadcn/dialog';
import { 
  Tabs, 
  TabsContent, 
  TabsList,
  TabsTrigger
} from '@/shadcn/tabs';

interface ExportReconstructionDialogProps {

  open: boolean;

  onOpenChange: (open: boolean) => void;

}

export const ExportReconstructionDialog = (props: ExportReconstructionDialogProps) => {
  const { open, onOpenChange } = props;

  const sources = useAppStore(state => state.sources);
  const reconstruction = useAppStore(state => state.reconstruction);
  const baseURI = useAppStore(state => state.baseURI);

  const [label, setLabel] = useState('Reconstructed Manuscript');
  const [description, setDescription] = useState('');
  const [attribution, setAttribution] = useState('');
  const [copied, setCopied] = useState(false);

  const generatedManifest = useMemo(() => {
    if (!open) return;
    
    return createManifest(
      label, 
      description, 
      attribution,
      sources,
      reconstruction,
      baseURI);
  }, [label, description, attribution, sources, reconstruction, baseURI, open]);

  const manifestJson = generatedManifest ? 
    JSON.stringify(generatedManifest, null, 2) : undefined;

  const onCopy = () => {
    if (!manifestJson) return;

    navigator.clipboard.writeText(manifestJson).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const onDownload = () => {
    if (!manifestJson) return;

    const blob = new Blob([manifestJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = `${label.replace(/\s+/g, '_').toLowerCase()}_manifest.json`;
    
    document.body.appendChild(a);
    
    a.click();
    
    document.body.removeChild(a);
    
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl gap-4">
        <DialogHeader className="gap-2">
          <DialogTitle className="flex items-center gap-2">
            <IIIFIcon color className="size-6 mb-0.75" />
            Export IIIF Manifest
          </DialogTitle>
          <DialogDescription>
            Generate a IIIF Presentation API 3 manifest for your reconstruction.
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="settings" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="settings">Properties</TabsTrigger>
            <TabsTrigger value="preview">JSON Preview</TabsTrigger>
          </TabsList>
          
          <TabsContent 
            value="settings" 
            className="space-y-6 pt-4"
            tabIndex={-1}>
            <div className="space-y-2">
              <Label htmlFor="export-label">Manifest Label</Label>
              <Input
                id="export-label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Enter manifest label"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="export-description">Description (optional)</Label>
              <Textarea
                id="export-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter a description for this reconstruction"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="export-attribution">Attribution (optional)</Label>
              <Input
                required
                id="export-attribution"
                value={attribution}
                onChange={(e) => setAttribution(e.target.value)}
                placeholder="e.g., Created with Virtual Manuscript Workbench"
              />
            </div>
            
            <div className="rounded border border-sky-200 bg-sky-50 p-3">
              <p className="text-sm text-sky-700/70">
                This manifest contains{' '}
                <strong>{reconstruction.length} canvases</strong> assembled 
                from <strong>{sources.length} source manifests</strong>.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent 
            value="preview" 
            className="pt-4"
            tabIndex={-1}>
            <div className="relative rounded-md">
              <div className="h-80 relative rounded-md overflow-hidden border border-input focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50">
                <Textarea
                  readOnly
                  value={manifestJson}
                  aria-label="Manifest JSON"
                  className="border-none size-full field-sizing-fixed wrap-anywhere font-mono text-sm! font-light" />
              </div>
              
              <Button
                variant="ghost"
                onClick={onCopy}
                className="absolute left-0 -bottom-12 text-xs">
                {copied ? (
                  <>
                    <Check 
                      aria-hidden
                      className="mr-1 h-3 w-3" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy 
                      aria-hidden
                      className="mr-1 h-3 w-3" />
                    Copy
                  </>
                )}
              </Button>
            </div>
          </TabsContent>
        </Tabs>
        
        <DialogFooter className="block">
          <div className="flex gap-2 items-center justify-end">
            <Button 
              variant="ghost" 
              onClick={() => onOpenChange(false)}>
              Cancel
            </Button>

            <Button onClick={onDownload}>
              <Download 
                aria-hidden
                className="mr-2 h-4 w-4" />
              Download JSON
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )

}