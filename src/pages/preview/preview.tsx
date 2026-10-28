import { useState } from 'react';
import { Panel, Separator } from 'react-resizable-panels';
import { AnimatedPanel, AnimatedPanelGroup } from '@/components/animated-panel';
import { Viewer } from './viewer';
import { ThumbnailStrip } from './thumbnail-strip';
import { PreviewMetadata } from './preview-metadata';

export const Preview = () => {
  const [isInspectorOpen, setIsInspectorOpen] = useState(false);

  return (
    <main className="bg-muted grow min-h-0">
      <AnimatedPanelGroup className="flex grow h-full min-h-0">
        <Panel
          minSize={100}
          defaultSize={240}
          className="border-r">
          <ThumbnailStrip />
        </Panel>

        <Separator
          className="focus-visible:outline-2 focus-visible:outline-primary" />

        <Panel>
          <Viewer 
            isInspectorOpen={isInspectorOpen} 
            onChangeInspectorOpen={setIsInspectorOpen} />
        </Panel>

        <Separator 
          className="relative focus-visible:outline focus-visible:outline-primary" 
          inert={!isInspectorOpen} />
        
        <AnimatedPanel 
          open={isInspectorOpen}
          onOpenChange={setIsInspectorOpen}
          minSize={40}
          openSize={300}
          className="bg-white border-l">
          <PreviewMetadata />
        </AnimatedPanel>
      </AnimatedPanelGroup>
    </main>
  )

}