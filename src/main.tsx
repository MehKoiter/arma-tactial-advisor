import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { OwnershipProvider } from './state/OwnershipContext.tsx'
import { RoutingProvider } from './routing/RoutingContext.tsx'
import { InputProviderProvider } from './providers/InputProviderContext.tsx'
import { PositionNotesProvider } from './providers/PositionNotesContext.tsx'
import { IndicatorsProvider } from './providers/IndicatorsContext.tsx'
import { RecommendationProvider } from './providers/RecommendationContext.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <OwnershipProvider>
      <RoutingProvider>
        <InputProviderProvider>
          <PositionNotesProvider>
            <IndicatorsProvider>
              <RecommendationProvider>
                <App />
              </RecommendationProvider>
            </IndicatorsProvider>
          </PositionNotesProvider>
        </InputProviderProvider>
      </RoutingProvider>
    </OwnershipProvider>
  </StrictMode>,
)
