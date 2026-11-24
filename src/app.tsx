import { Route, Router, Redirect } from 'wouter';
import { useHashLocation } from 'wouter/use-hash-location';
import { AppHeader } from '@/app/app-header';
import { ConfirmDialogProvider } from '@/app/dialogs/confirm';
import { Splash } from '@/app/dialogs/splash';
import { TooltipProvider } from '@/shadcn/tooltip';
import { Sources } from '@/pages/sources';
import { Reconstruction } from '@/pages/reconstruction';
import { Preview } from '@/pages/preview';
import { URLInitializer } from '@/store/load-reconstruction';

export const App = () => {

  return (
    <TooltipProvider>
      <ConfirmDialogProvider>
        <Router hook={useHashLocation}>
          <div className="flex flex-col h-screen overflow-hidden">
            <AppHeader />

            <Route path="/" component={() => <Redirect to="/sources" replace />} />

            <Route path="/sources" component={Sources} />
            <Route path="/reconstruction" component={Reconstruction} />
            <Route path="/preview" component={Preview} />
          </div>

          <URLInitializer>
            <Splash />
          </URLInitializer>
        </Router>
      </ConfirmDialogProvider>
    </TooltipProvider>
  )

}