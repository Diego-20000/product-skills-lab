---
name: platform-adaptive-components
description: Estructura componentes cross-platform que comparten lógica pero adaptan comportamiento e interfaz a las convenciones de iOS y Android, en vez de forzar una UI idéntica en ambos. Usar cuando una app React Native o Flutter "se siente ajena" en una de las dos plataformas.
---

# Platform Adaptive Components

## Contexto

El error conceptual más caro en cross-platform es tratar "un solo código"
como sinónimo de "una sola interfaz". Las dos plataformas tienen
convenciones que los usuarios tienen internalizadas: en iOS el gesto de
volver es deslizar desde el borde izquierdo y el botón de atrás vive arriba
a la izquierda; en Android existe un botón/gesto de sistema para volver que
la app **debe** respetar. Los selectores de fecha, los menús de acciones, la
tipografía por defecto y hasta la dirección de las transiciones difieren.

Ignorar esto produce el síntoma clásico de "esta app se siente rara": no hay
un bug puntual, hay una acumulación de detalles que contradicen lo que el
usuario espera de su sistema operativo. El objetivo de este skill es
separar lo que **debe** compartirse (lógica de negocio, estado, llamadas a
la API, validaciones) de lo que **conviene** divergir (navegación,
componentes de sistema, gestos), sin duplicar la app entera.

## Cuándo usarlo

- La app corre en React Native o Flutter y se reporta que "se siente rara" o "no parece nativa" en una de las plataformas.
- Hay que implementar un componente que tiene convención distinta por plataforma: date picker, action sheet, alerta, navegación por tabs.
- Se está definiendo la arquitectura inicial y hay que decidir dónde poner la frontera entre código compartido y específico.

## Cuándo NO usarlo

- **Si el producto tiene una identidad visual propia y deliberada** (una app de diseño, un juego, una herramienta creativa): ahí la consistencia de marca entre plataformas es más valiosa que la consistencia con el SO, y Flutter con su render propio es la elección correcta justamente por eso.
- **Para diferencias puramente estéticas sin convención detrás**: divergir el color de un botón por plataforma agrega mantenimiento sin beneficio. Esto aplica a **comportamiento** y a componentes de sistema, no a estilo.
- **Si la app es principalmente contenido web embebido**: la capa nativa es tan fina que no hay mucho que adaptar.

## Pasos / Código

**1. Separar por capas, no por plataforma**

La estructura que evita duplicación:

```
src/
├── domain/          # lógica de negocio — 100% compartido, sin imports de UI
├── data/            # API, storage, modelos — 100% compartido
├── hooks/           # estado y efectos — 100% compartido
└── ui/
    ├── shared/      # componentes sin convención de plataforma (Card, Badge)
    └── adaptive/    # componentes con divergencia real (Picker, Sheet, Nav)
```

La regla: un archivo `.ios.tsx`/`.android.tsx` solo se justifica dentro de
`ui/adaptive/`. Si aparece uno en `domain/`, casi siempre significa que se
filtró lógica de UI al dominio.

**2. React Native: resolución automática por extensión**

El bundler elige el archivo según la plataforma, sin ningún `if`:

```tsx
// ui/adaptive/ActionSheet.ios.tsx
import { ActionSheetIOS } from 'react-native';

export function showActionSheet({ options, onSelect }: ActionSheetProps) {
  ActionSheetIOS.showActionSheetWithOptions(
    { options: [...options, 'Cancelar'], cancelButtonIndex: options.length },
    (index) => { if (index < options.length) onSelect(index); }
  );
}
```

```tsx
// ui/adaptive/ActionSheet.android.tsx
// En Android la convención equivalente es un bottom sheet con Material
export function showActionSheet({ options, onSelect }: ActionSheetProps) {
  openBottomSheet(options, onSelect);
}
```

```tsx
// ui/adaptive/ActionSheet.ts — el contrato compartido
export interface ActionSheetProps {
  options: string[];
  onSelect: (index: number) => void;
}
```

El consumidor importa siempre igual y no sabe en qué plataforma corre:

```tsx
import { showActionSheet } from '@/ui/adaptive/ActionSheet';
```

**3. Diferencias chicas: `Platform.select` en vez de archivos separados**

Para un ajuste puntual no vale la pena partir el archivo:

```tsx
import { Platform } from 'react-native';

const styles = StyleSheet.create({
  header: {
    // iOS usa sombra difusa, Android usa elevación del sistema
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 8 },
      android: { elevation: 4 },
    }),
  },
});
```

**4. El botón atrás de Android — el caso que más se olvida**

En iOS no existe; en Android, si no se maneja, el usuario sale de la app
cuando esperaba cerrar un modal:

```tsx
import { BackHandler } from 'react-native';

useEffect(() => {
  if (Platform.OS !== 'android') return;

  const sub = BackHandler.addEventListener('hardwareBackPress', () => {
    if (isModalOpen) {
      closeModal();
      return true;   // consumido: no propaga al sistema
    }
    return false;    // no consumido: el sistema hace lo suyo
  });

  return () => sub.remove();
}, [isModalOpen]);
```

**5. Flutter: widgets adaptativos y el equivalente por `TargetPlatform`**

Flutter dibuja su propia UI, así que la adaptación es explícita. Varios
widgets ya la traen incorporada:

```dart
// Elige automáticamente Material o Cupertino según la plataforma
Switch.adaptive(value: isOn, onChanged: onToggle)
CircularProgressIndicator.adaptive()
```

Para lo que no tiene versión adaptativa:

```dart
Widget buildPicker(BuildContext context) {
  final isApple = Theme.of(context).platform == TargetPlatform.iOS ||
                  Theme.of(context).platform == TargetPlatform.macOS;

  return isApple
      ? CupertinoDatePicker(onDateTimeChanged: onChanged)
      : /* Material date picker */ MaterialDatePickerWrapper(onChanged: onChanged);
}
```

Usar `Theme.of(context).platform` y no `Platform.isIOS` importa: el primero
es sobreescribible en tests y en previews, el segundo consulta el sistema
real y hace los widgets imposibles de testear en ambas variantes.

## Edge cases / errores comunes

- **`Platform.OS` esparcido por toda la app**: cada condicional suelto es una divergencia que nadie documentó. Concentrarlas en `ui/adaptive/` mantiene visible cuánta divergencia real existe.
- **Olvidar el botón atrás de Android**: el bug más reportado por usuarios de Android en apps hechas por equipos que desarrollan primero en iOS.
- **Usar `Platform.isIOS` de `dart:io` en Flutter**: además de romper la testeabilidad, tira excepción en Flutter Web porque `dart:io` no existe ahí.
- **Asumir que "adaptativo" significa solo visual**: los gestos también divergen. El swipe-desde-el-borde para volver es una expectativa fuerte en iOS y no existe en Android.
- **Duplicar la lógica junto con la UI**: si `ActionSheet.ios.tsx` y `ActionSheet.android.tsx` contienen ambos la validación de qué opciones mostrar, esa lógica se va a desincronizar. Solo la presentación diverge.
- **Safe areas distintas**: el notch de iOS y la barra de gestos de Android requieren insets diferentes; hardcodear un padding que se ve bien en un simulador rompe en el otro.

## Compatibilidad

La resolución por extensión (`.ios.tsx`/`.android.tsx`) funciona en Metro
(React Native) y también resuelve `.native.tsx` vs `.web.tsx` en proyectos
con react-native-web. `Switch.adaptive` y compañía existen en Flutter
estable desde hace varias versiones; la lista de widgets con variante
adaptativa crece por release, así que conviene verificar cuáles ya la tienen
antes de escribir el condicional a mano.

## Fuentes

- **React Native** (126k ⭐): su modelo de renderizar componentes nativos reales es lo que hace que este skill sea *necesario* pero también más fácil — los componentes ya se ven nativos, lo que hay que adaptar es cuáles se usan y cómo se comportan.
- **Flutter** (178k ⭐): el enfoque opuesto — al dibujar su propia UI, nada es nativo por defecto y la adaptación es siempre explícita. Su librería `Cupertino` existe precisamente para recuperar lo que el render propio no da gratis.
- **Expo** (51.1k ⭐): su catálogo de módulos resuelve buena parte de estas divergencias ya empaquetadas (`expo-haptics`, pickers, action sheets), evitando escribir la capa adaptativa a mano.
- **react-native-web** (22.1k ⭐): extiende el mismo problema a una tercera plataforma, y su convención `.web.tsx` confirma que la separación por extensión escala más allá de iOS/Android.
- **compose-multiplatform** (19.3k ⭐): la respuesta de JetBrains a la misma tensión desde el lado Kotlin — comparte la lógica y deja que cada plataforma resuelva su presentación.
