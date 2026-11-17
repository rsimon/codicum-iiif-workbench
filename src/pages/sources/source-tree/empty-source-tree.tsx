import { IconBooks } from '@tabler/icons-react';
import { Button } from '@/shadcn/button';
import { Separator } from '@/shadcn/separator';

interface EmptySourceTreeProps {

  onImportSource(): void;

  onOpenProject(): void;

}

export const EmptySourceTree = (props: EmptySourceTreeProps) => {
  
  return (
    <div className="grow flex flex-col gap-8 items-center justify-center p-4 text-sm">
      <div className="flex flex-col items-center">
        <IconBooks
          className="size-20 text-muted-foreground opacity-80"
          stroke={0.7} />

        <p className="text-sm text-muted-foreground font-medium">
          Empty project
        </p>
      </div>

      <div className="space-y-4">
        <section className="rounded-md border p-4 leading-relaxed">
          <div className="px-0.5">
            <h2 className="font-medium">
              Add a source
            </h2>
            
            <p className="text-muted-foreground">
              IIIF manifests with fragments you want to reconstruct from.
            </p>
          </div>

          <Button 
            className="w-full mt-4 tracking-wide"
            size="lg"
            onClick={props.onImportSource}>
            Import IIIF source...
          </Button>
        </section>

        <div
          role="separator"
          className="flex items-center gap-2.5 w-full">
          <Separator className="flex-1 w-auto" />

          <span className="text-muted-foreground">
            or
          </span>
          
          <Separator className="flex-1 w-auto" />
        </div>

        <section className="rounded-md border p-4 leading-relaxed">
          <div className="px-0.5">
            <h2 className="font-medium ">
              Continue a project
            </h2>
            
            <p className="text-muted-foreground">
              Load a reconstruction created with the Codicum workbench.
            </p>
          </div>

          <Button 
            className="w-full mt-4 tracking-wide border-primary text-primary hover:text-primary hover:bg-primary/10"
            variant="outline"
            size="lg"
            onClick={props.onOpenProject}>
            Open reconstruction...
          </Button>
        </section>
      </div>
    </div>
  )

}