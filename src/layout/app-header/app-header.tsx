import type { ReactNode } from 'react';
import { Link, useLocation} from 'wouter';
import { Badge } from '@/shadcn/badge';
import { cn  } from '@/shadcn/utils';
import { useAppStore } from '@/store/app-store';
import { Help } from './menu-help';
import { Project } from './menu-project';

interface NavItemProps {
  
  href: string;

  children: ReactNode;

}

const NavItem = (props: NavItemProps) => {
  const [location] = useLocation();

  return (
    <div className={cn(
      'px-0.5 py-1.25 h-12 border-b-4 border-transparent',
      location === props.href ? 'border-b-primary' : 'text-muted-foreground/80'
    )}>
      <Link 
        href={props.href}
        className="px-2.5 h-full flex rounded-md items-center text-sm border border-transparent outline-none
        focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50">
        {props.children}</Link>
    </div>
  )

}

export const AppHeader = () => {
  const reconstruction = useAppStore(state => state.reconstruction);

  return (
    <header className="flex justify-between items-center px-2.5 text-sm 
      relative z-10 shadow-[0_0_1px_rgba(0,0,0,0.5)]">
      <img 
        src="/Codicum_Logo_Horizontal_Flat.svg" 
        alt="CODICUM project logo"
        className="h-9.5" />

      <nav className="flex items-center gap-3 pt-0.5">
        <NavItem href="/sources">
          1. Select Sources
        </NavItem>
        
        <NavItem 
          href="/reconstruction">
          <span>2. Reconstruct</span>
          {reconstruction.length > 0 && (
            <Badge 
              variant="secondary" 
              className="font-normal ml-1">
              {reconstruction.length}
            </Badge>
          )}
        </NavItem>

        <NavItem href="/preview">
          3. Preview and Export
        </NavItem>
      </nav>

      <div className="text-muted-foreground/80 flex items-center">
        <Project />
        <Help />
      </div>
    </header>
  )

}