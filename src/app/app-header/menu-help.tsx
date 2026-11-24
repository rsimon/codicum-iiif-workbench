import { IconExternalLink } from '@tabler/icons-react';
import { Construction } from 'lucide-react';
import { Button } from '@/shadcn/button';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from '@/shadcn/dropdown-menu';

export const Help = () => {

  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={
        <Button
          variant="ghost"
          className="font-normal">
          Help
        </Button>
      } />

      <DropdownMenuContent>
        <DropdownMenuItem 
          disabled
          className="grow flex justify-between items-center">
            <div className="flex items-center gap-2.5">
              <Construction /> {/* <IconBook /> */} Documentation
            </div>
            <IconExternalLink className="text-muted-foreground/60!" />
        </DropdownMenuItem>

        <DropdownMenuItem 
          disabled
          className="gap-2.5">
          <Construction />
          {/* <IconInfoCircle /> */} About
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )

}