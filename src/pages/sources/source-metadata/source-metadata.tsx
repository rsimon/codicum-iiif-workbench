import { IconBook } from '@tabler/icons-react';
import { MetadataInspector } from './metadata-inspector';
import { useSelectedSource, useSourcesStore } from '../sources-store';

export const SourceMetadata = () => {
  const { manifest, canvas } = useSelectedSource();

  const showDimensionsDialog = useSourcesStore(state => state.showDimensionsDialog);
  const setShowDimensionsDialog = useSourcesStore(state => state.setShowDimensionsDialog);

  return manifest ? (
    <MetadataInspector 
      manifest={manifest}
      canvas={canvas} 
      onSetSize={() => setShowDimensionsDialog(!showDimensionsDialog)} />
  ) : (
    <div className="h-full flex items-center justify-center p-6 text-center">
      <div className="min-w-30 text-muted-foreground flex flex-col items-center">
        <IconBook className="size-20 opacity-80" stroke={0.7} /> 
        <p className="text-sm leading-relaxed w-30">
          Select a canvas to view metadata
        </p>
      </div>
    </div>
  )

}
