import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { OwnershipProvider } from './state/OwnershipContext.tsx'
import { RoutingProvider } from './routing/RoutingContext.tsx'
import { InputProviderProvider } from './providers/InputProviderContext.tsx'
import { PositionNotesProvider } from './providers/PositionNotesContext.tsx'
import { IndicatorsProvider } from './providers/IndicatorsContext.tsx'
import { MobsProvider } from './providers/MobsContext.tsx'
import { RecommendationProvider } from './providers/RecommendationContext.tsx'
import { RoomProvider } from './providers/RoomContext.tsx'
import { Landing } from './components/Landing.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <RoomProvider>
      {(roomSlug) =>
        roomSlug ? (
          // key={roomSlug} forces a clean remount of all room-scoped providers
          // when switching rooms, so state never leaks across rooms.
          <OwnershipProvider key={roomSlug}>
            <RoutingProvider>
              <InputProviderProvider>
                <PositionNotesProvider>
                  <IndicatorsProvider>
                    <MobsProvider>
                      <RecommendationProvider>
                        <App />
                      </RecommendationProvider>
                    </MobsProvider>
                  </IndicatorsProvider>
                </PositionNotesProvider>
              </InputProviderProvider>
            </RoutingProvider>
          </OwnershipProvider>
        ) : (
          <Landing />
        )
      }
    </RoomProvider>
  </StrictMode>,
)
