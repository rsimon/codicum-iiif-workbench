import { useState } from 'react';
import { Panel, Separator } from 'react-resizable-panels';
import { AnimatedPanel, AnimatedPanelGroup } from '@/components/animated-panel';
import { MeasurementProvider } from '@/app/measurement-tool';
import { SourceMetadata } from './source-metadata';
import { SourcePreview } from './source-preview';
import { SourceTree } from './source-tree';

export const Sources = () => {
  const [isInspectorOpen, setInspectorOpen] = useState(false);

  return (
    <main className="grow min-h-0">
      <AnimatedPanelGroup className="flex grow h-full min-h-0">
        <Panel
          minSize={240}
          defaultSize={300}
          className="border-r">
          <SourceTree />
        </Panel>

        <Separator 
          className="focus-visible:outline-2 focus-visible:outline-primary" />

        <Panel>
          <MeasurementProvider>
            <SourcePreview
              isInspectorOpen={isInspectorOpen}
              setInspectorOpen={setInspectorOpen} />
          </MeasurementProvider>
        </Panel>

        <Separator 
          className="relative focus-visible:outline focus-visible:outline-primary" 
          inert={!isInspectorOpen} />

        <AnimatedPanel 
          open={isInspectorOpen}
          onOpenChange={setInspectorOpen}
          minSize={40}
          openSize={300}
          className="bg-white border-l"
          inert={!isInspectorOpen}>
          <SourceMetadata />
        </AnimatedPanel>
      </AnimatedPanelGroup>
    </main>
  )

}