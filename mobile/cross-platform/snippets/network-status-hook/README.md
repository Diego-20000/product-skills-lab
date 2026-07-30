---
title: Hook de estado de conexión con detección real
platform: mobile
pillar: cross-platform
tags: [react-native, offline, network, hook, connectivity]
summary: Detecta si hay conexión a internet de verdad (no solo si hay Wi-Fi conectado) en React Native, distinguiendo "conectado" de "alcanzable" y evitando falsos positivos de portales cautivos.
when_not_to_use: No usar para decidir si mostrar datos cacheados — para eso conviene una librería de caché (React Query) que ya maneja stale-while-revalidate.
---

# Hook de estado de conexión con detección real

## Contexto

El error clásico al manejar estado offline en móvil es confundir dos cosas
distintas: **estar conectado a una red** y **tener acceso a internet**. Un
teléfono conectado al Wi-Fi de un hotel o un aeropuerto está "conectado"
según el sistema operativo, pero todas las requests van a parar al portal
cautivo. Lo mismo pasa con una red móvil sin saldo, o con un Wi-Fi cuyo
router perdió el enlace.

Si la app muestra "sin conexión" solo cuando el sistema reporta desconexión,
el usuario en un portal cautivo ve errores genéricos sin entender qué pasa.
Y al revés: si muestra el banner de offline ante el primer error de red, va
a parpadear con cualquier request fallida puntual.

`@react-native-community/netinfo` expone las dos señales por separado:
`isConnected` (hay una red) y `isInternetReachable` (esa red efectivamente
llega a internet, verificado con una request de prueba). Este snippet las
combina con un debounce para que el estado no oscile.

## Código completo

```tsx
// hooks/useNetworkStatus.ts
import { useEffect, useRef, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export type NetworkStatus = {
  /** Hay una red conectada (Wi-Fi o celular) */
  isConnected: boolean;
  /** Esa red efectivamente llega a internet */
  isInternetReachable: boolean;
  /** Conveniencia: hay red Y llega a internet */
  isOnline: boolean;
  /** 'wifi' | 'cellular' | 'none' | 'unknown' | ... */
  type: NetInfoState['type'];
  /** Conexión medida por el sistema como cara/limitada */
  isExpensive: boolean;
};

const INITIAL: NetworkStatus = {
  isConnected: true,
  isInternetReachable: true,
  isOnline: true,
  type: 'unknown',
  isExpensive: false,
};

/**
 * @param debounceMs Evita que el banner parpadee ante cortes de 1-2 segundos.
 *                   Solo se aplica al pasar a offline; volver online es inmediato.
 */
export function useNetworkStatus(debounceMs = 2000): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(INITIAL);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const apply = (state: NetInfoState) => {
      const isConnected = state.isConnected ?? false;
      // null significa "todavía no se verificó": se trata como alcanzable
      // para no mostrar offline durante el chequeo inicial.
      const isInternetReachable = state.isInternetReachable ?? true;

      const next: NetworkStatus = {
        isConnected,
        isInternetReachable,
        isOnline: isConnected && isInternetReachable,
        type: state.type,
        isExpensive: state.details && 'isConnectionExpensive' in state.details
          ? Boolean(state.details.isConnectionExpensive)
          : false,
      };

      if (timer.current) {
        clearTimeout(timer.current);
        timer.current = null;
      }

      if (next.isOnline) {
        setStatus(next);              // volver online: inmediato
      } else {
        timer.current = setTimeout(() => setStatus(next), debounceMs);
      }
    };

    const unsubscribe = NetInfo.addEventListener(apply);
    NetInfo.fetch().then(apply);      // estado inicial

    return () => {
      unsubscribe();
      if (timer.current) clearTimeout(timer.current);
    };
  }, [debounceMs]);

  return status;
}
```

**Configuración de la verificación de alcanzabilidad**

Por defecto NetInfo pega a un endpoint de Google, que está bloqueado en
algunas regiones. Conviene apuntarlo a infraestructura propia:

```ts
// En el arranque de la app, antes de cualquier uso
import NetInfo from '@react-native-community/netinfo';

NetInfo.configure({
  reachabilityUrl: 'https://api.mi-app.example/health',
  // Debe devolver 204 sin cuerpo: rápido y sin costo
  reachabilityTest: async (response) => response.status === 204,
  reachabilityLongTimeout: 60 * 1000,   // intervalo cuando está online
  reachabilityShortTimeout: 5 * 1000,   // intervalo cuando está offline
  reachabilityRequestTimeout: 10 * 1000,
  reachabilityShouldRun: () => true,
});
```

**Banner de offline**

```tsx
// components/OfflineBanner.tsx
import { View, Text, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNetworkStatus } from '@/hooks/useNetworkStatus';

export function OfflineBanner() {
  const { isConnected, isInternetReachable } = useNetworkStatus();
  const insets = useSafeAreaInsets();

  if (isConnected && isInternetReachable) return null;

  // Mensaje distinto según la causa: el portal cautivo es el caso
  // donde el usuario cree que tiene internet y no lo tiene.
  const message = !isConnected
    ? 'Sin conexión'
    : 'Conectado a una red sin acceso a internet';

  return (
    <View
      style={[styles.banner, { paddingTop: insets.top + 8 }]}
      accessibilityRole="alert"
      accessibilityLiveRegion="polite"
    >
      <Text style={styles.text}>{message}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: { backgroundColor: '#b45309', paddingBottom: 8, paddingHorizontal: 16 },
  text: { color: '#fff', textAlign: 'center', fontWeight: '600' },
});
```

## Uso

```tsx
function App() {
  return (
    <>
      <OfflineBanner />
      <MainNavigator />
    </>
  );
}
```

```tsx
// Deshabilitar una acción que requiere red
function SubmitButton({ onSubmit }) {
  const { isOnline } = useNetworkStatus();

  return (
    <Pressable onPress={onSubmit} disabled={!isOnline}>
      <Text>{isOnline ? 'Enviar' : 'Sin conexión'}</Text>
    </Pressable>
  );
}
```

## Limitaciones conocidas

- **`isInternetReachable` cuesta batería y datos**: NetInfo hace una request periódica. Los intervalos por defecto son razonables, pero en una app que corre mucho tiempo en primer plano conviene alargar `reachabilityLongTimeout`.
- **El estado puede estar desactualizado por segundos**: entre chequeos, la app cree que está online aunque no lo esté. Por eso este hook complementa —pero no reemplaza— el manejo de errores de cada request.
- **No detecta conexión lenta**: una red de 2G reporta `isOnline: true` y la experiencia es pésima igual. Para eso hace falta medir latencia real de las requests.
- **En el emulador de Android la detección es poco confiable**: conviene verificar el comportamiento en dispositivo físico antes de dar por buena la implementación.
- **El debounce solo aplica a pasar a offline**: es deliberado, porque mostrar el banner tarde molesta menos que mostrarlo y esconderlo repetidamente. Volver online es inmediato para no dejar la UI bloqueada de más.
- **En Flutter el equivalente es `connectivity_plus`**, que tiene la misma distinción entre conectividad y acceso real; el patrón de este snippet se traslada directo.

## Fuentes

- **React Native** (126k ⭐): NetInfo fue parte del core y se movió a la comunidad; esa historia explica por qué es el estándar de facto pese a ser una dependencia externa.
- **Expo** (51.1k ⭐): incluye NetInfo entre sus módulos soportados, lo que en proyectos Expo elimina el paso de configuración nativa.
- **awesome-react-native** (35.7k ⭐): cataloga las alternativas de esta categoría; la mayoría son wrappers sobre las mismas APIs de sistema, así que la elección pasa por la integración con el resto del stack.
- **OkHttp** (47k ⭐): del lado Android nativo, su manejo de reintentos y timeouts es la otra mitad del problema — este hook informa al usuario, OkHttp decide qué hacer con las requests fallidas.
