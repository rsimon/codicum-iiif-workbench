
import { Link } from 'wouter';
import { IconArrowLeft, IconBook } from '@tabler/icons-react';

export const EmptyReconstructionTree = () => {

  return (
    <div className="grow flex flex-col gap-8 items-center justify-center text-sm">
      <div className="space-y-2 flex flex-col items-center pb-16">
        <IconBook
          className="size-20 opacity-80 text-muted-foreground"
          stroke={0.8} />

        <p className="text-center text-muted-foreground leading-relaxed mb-5 px-8">
          Pick canvases from your sources to start a reconstruction.
        </p>

        <Link 
          href="/sources"
          className="cursor-pointer font-medium tracking-wide flex items-center justify-center rounded-md text-sm whitespace-nowrap 
            transition-all outline-none select-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50
            active:not-aria-[haspopup]:translate-y-px [&_svg]:pointer-events-none [&_svg]:shrink-0 
            [&_svg:not([class*='size-'])]:size-4 bg-primary text-primary-foreground hover:bg-primary/80
            h-10 gap-1.5 px-6">
          <IconArrowLeft className="size-5" /> Back to Sources
        </Link>
      </div>
    </div>
  )

}