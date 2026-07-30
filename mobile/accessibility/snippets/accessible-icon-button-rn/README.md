---
title: Botón de ícono accesible en React Native
platform: mobile
pillar: accessibility
tags: [react-native, a11y, voiceover, talkback, touch-target]
summary: Componente de botón con solo ícono que cumple etiqueta accesible, área táctil mínima y estados anunciados correctamente en VoiceOver y TalkBack.
when_not_to_use: Si el botón tiene texto visible, no hace falta accessibilityLabel — el texto ya es el nombre accesible y duplicarlo hace que se lea dos veces.
---

# Botón de ícono accesible en React Native

## Contexto

El botón de solo ícono es el componente que más se repite en una app móvil
(cerrar, volver, compartir, favorito, menú) y el que más veces se implementa
mal. Los dos defectos son siempre los mismos: sin etiqueta accesible,
VoiceOver y TalkBack anuncian "botón" a secas —una barra con cinco íconos
se vuelve cinco "botón" indistinguibles—; y con un área táctil del tamaño
del ícono (24 px típicos), muy por debajo de los mínimos recomendados de
44 pt en iOS y 48 dp en Android.

Encapsularlo en un componente resuelve el problema de raíz: en vez de
recordar poner `accessibilityLabel` y `hitSlop` en cada uso —lo que
inevitablemente se olvida en algún lado—, la API obliga a pasar la etiqueta
y el área táctil viene por defecto.

## Código completo

```tsx
// components/IconButton.tsx
import { forwardRef } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

const MIN_TOUCH_SIZE = 48;   // cubre el mínimo de ambas plataformas

type IconButtonProps = {
  /** Obligatorio: es el nombre que anuncia el lector de pantalla.
   *  Describe la ACCIÓN, no el ícono ("Cerrar", no "Equis"). */
  label: string;
  /** Contexto adicional cuando la acción no es obvia por el label */
  hint?: string;
  icon: React.ReactNode;
  onPress: () => void;
  disabled?: boolean;
  /** Para toggles: favorito, silenciar, etc. */
  selected?: boolean;
  /** Tamaño visual del área tocable; nunca menor a MIN_TOUCH_SIZE */
  size?: number;
  style?: StyleProp<ViewStyle>;
} & Omit<PressableProps, 'children' | 'onPress' | 'style'>;

export const IconButton = forwardRef<View, IconButtonProps>(function IconButton(
  { label, hint, icon, onPress, disabled = false, selected, size = MIN_TOUCH_SIZE, style, ...rest },
  ref
) {
  const visualSize = Math.max(size, MIN_TOUCH_SIZE);

  return (
    <Pressable
      ref={ref}
      onPress={onPress}
      disabled={disabled}
      // --- Accesibilidad ---
      accessible
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{
        disabled,
        // selected solo se envía si es un toggle: enviarlo siempre
        // hace que se anuncie "no seleccionado" en botones normales.
        ...(selected !== undefined ? { selected } : {}),
      }}
      // Expande el área táctil más allá del tamaño visual si hiciera falta
      hitSlop={
        visualSize < MIN_TOUCH_SIZE
          ? (MIN_TOUCH_SIZE - visualSize) / 2
          : undefined
      }
      style={({ pressed }) => [
        styles.base,
        { width: visualSize, height: visualSize },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {/* El ícono es decorativo: el nombre lo da accessibilityLabel.
          Sin esto, algunos lectores leen el nombre del componente SVG. */}
      <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
        {icon}
      </View>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: MIN_TOUCH_SIZE / 2,
  },
  pressed: {
    // Feedback visual inmediato: sin esto el botón se siente "muerto"
    opacity: 0.6,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  disabled: {
    opacity: 0.4,
  },
});
```

**Variante para toggle con estado anunciado**

```tsx
export function FavoriteButton({ isFavorite, onToggle }: { isFavorite: boolean; onToggle: () => void }) {
  return (
    <IconButton
      // La etiqueta cambia con el estado: es lo que hace que el usuario
      // sepa qué va a pasar al tocar, no cuál es el estado actual.
      label={isFavorite ? 'Quitar de favoritos' : 'Agregar a favoritos'}
      selected={isFavorite}
      icon={<HeartIcon filled={isFavorite} />}
      onPress={onToggle}
    />
  );
}
```

**Anunciar el resultado de una acción**

```tsx
import { AccessibilityInfo } from 'react-native';

function ShareButton({ onShare }) {
  const handlePress = async () => {
    await onShare();
    // Sin esto, el usuario de lector de pantalla no recibe confirmación
    AccessibilityInfo.announceForAccessibility('Enlace copiado');
  };

  return <IconButton label="Compartir" icon={<ShareIcon />} onPress={handlePress} />;
}
```

## Uso

```tsx
<View style={{ flexDirection: 'row', gap: 4 }}>
  <IconButton label="Volver" icon={<ChevronLeft />} onPress={goBack} />
  <IconButton
    label="Eliminar pedido"
    hint="Se pedirá confirmación"
    icon={<TrashIcon />}
    onPress={confirmDelete}
  />
  <FavoriteButton isFavorite={saved} onToggle={toggleSave} />
</View>
```

## Limitaciones conocidas

- **`hitSlop` no separa controles superpuestos**: si dos botones con área expandida quedan a menos de la distancia mínima, sus zonas se solapan y el resultado del toque es impredecible. En barras densas hay que espaciar los controles, no solo agrandar sus áreas.
- **`accessibilityHint` no se lee en todas las configuraciones**: VoiceOver permite desactivar las pistas. No debe contener información imprescindible — eso va en el `label`.
- **El label del toggle: acción vs estado.** Este snippet usa la acción ("Agregar a favoritos") y delega el estado a `accessibilityState.selected`. Es la convención de iOS; algunas guías de Android prefieren describir el estado. Lo importante es ser consistente en toda la app.
- **`importantForAccessibility` es solo Android** y `accessibilityElementsHidden` solo iOS: hay que poner ambos, y por eso aparecen juntos en el componente.
- **No cubre texto ampliado**: si el usuario tiene la fuente del sistema al 200%, el ícono no escala. Para eso hay que leer `PixelRatio.getFontScale()` y ajustar el tamaño.
- **Probar con el lector real es irreemplazable**: un `label` que existe pero dice "botón1" pasa cualquier verificación automática y es inútil para la persona que lo escucha.

## Fuentes

Como documenta el catálogo del repo, **este pilar no tiene proyectos de
referencia por encima de 10k estrellas** — las librerías específicas de
accesibilidad móvil son todas chicas. Las fuentes son:

- **Human Interface Guidelines (Apple)** y **Material Design (Google)**: el origen de los mínimos de 44 pt y 48 dp y de las convenciones de etiquetado. Documentación de plataforma, no repos.
- **React Native** (126k ⭐): sus props de accesibilidad (`accessibilityRole`, `accessibilityState`) mapean directamente a las APIs nativas de ambas plataformas; entender ese mapeo es lo que evita usarlas mal.
- **React Spectrum / React Aria** (15.7k ⭐): el trabajo de accesibilidad más exhaustivo con repo grande. Apunta a web, pero su documentación de qué debe anunciar cada rol y estado es directamente aplicable acá.
- **Expo** (51.1k ⭐): su módulo de haptics complementa este componente — el feedback táctil al presionar es especialmente valioso para usuarios que no ven el cambio visual.
