---
title: Almacenamiento seguro en Keychain
platform: mobile
pillar: ios
tags: [swift, keychain, security, storage, tokens]
summary: Guarda tokens y credenciales en el Keychain de iOS con una API tipada mínima, en vez de UserDefaults, que se guarda en texto plano y aparece en los backups.
when_not_to_use: Para preferencias no sensibles (tema, idioma, último filtro usado), UserDefaults es lo correcto — el Keychain es más lento y más complejo sin necesidad.
---

# Almacenamiento seguro en Keychain

## Contexto

Guardar un token de sesión en `UserDefaults` es uno de los errores de
seguridad más comunes en iOS, y es fácil de entender por qué se comete:
`UserDefaults` es trivial de usar y funciona. El problema es que guarda en un
archivo `.plist` **en texto plano** dentro del contenedor de la app, que se
incluye en los backups de iTunes/Finder y de iCloud, y es legible de forma
directa en un dispositivo con jailbreak o desde una copia de seguridad sin
cifrar.

El Keychain es el almacén cifrado del sistema, respaldado por el Secure
Enclave en dispositivos modernos. Su API en C es notoriamente incómoda —de
ahí que casi todos los proyectos terminen escribiendo un wrapper como este o
sumando una dependencia—, pero el wrapper mínimo son unas 60 líneas.

El parámetro que más importa es la **accesibilidad**:
`kSecAttrAccessibleWhenUnlockedThisDeviceOnly` significa que el dato solo se
puede leer con el dispositivo desbloqueado y **no** viaja en los backups ni
se restaura en otro dispositivo — que es exactamente lo que se quiere para
un token de sesión.

## Código completo

```swift
import Foundation
import Security

enum KeychainError: Error {
    case unexpectedStatus(OSStatus)
    case decodingFailed
}

struct Keychain {
    /// Identificador del grupo lógico. Usar el bundle id evita colisiones.
    private let service: String

    init(service: String = Bundle.main.bundleIdentifier ?? "app") {
        self.service = service
    }

    // MARK: - Guardar

    func set(_ value: String, for key: String) throws {
        guard let data = value.data(using: .utf8) else { throw KeychainError.decodingFailed }
        try set(data, for: key)
    }

    func set(_ data: Data, for key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]

        let attributes: [String: Any] = [
            kSecValueData as String: data,
            // Solo con el dispositivo desbloqueado, y NUNCA en backups
            // ni restaurable en otro dispositivo.
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
        ]

        // Intentar actualizar primero; si no existe, agregar.
        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)

        switch status {
        case errSecSuccess:
            return
        case errSecItemNotFound:
            var newItem = query
            newItem.merge(attributes) { current, _ in current }
            let addStatus = SecItemAdd(newItem as CFDictionary, nil)
            guard addStatus == errSecSuccess else {
                throw KeychainError.unexpectedStatus(addStatus)
            }
        default:
            throw KeychainError.unexpectedStatus(status)
        }
    }

    // MARK: - Leer

    func data(for key: String) throws -> Data? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne,
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        switch status {
        case errSecSuccess:
            return result as? Data
        case errSecItemNotFound:
            return nil          // no encontrado no es un error
        default:
            throw KeychainError.unexpectedStatus(status)
        }
    }

    func string(for key: String) throws -> String? {
        guard let data = try data(for: key) else { return nil }
        return String(data: data, encoding: .utf8)
    }

    // MARK: - Borrar

    func remove(_ key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
        ]
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unexpectedStatus(status)
        }
    }

    /// Borra todo lo del service. Útil al cerrar sesión.
    func removeAll() throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
        ]
        let status = SecItemDelete(query as CFDictionary)
        guard status == errSecSuccess || status == errSecItemNotFound else {
            throw KeychainError.unexpectedStatus(status)
        }
    }
}
```

**Envoltorio tipado para objetos `Codable`**

```swift
extension Keychain {
    func set<T: Encodable>(_ value: T, for key: String) throws {
        let data = try JSONEncoder().encode(value)
        try set(data, for: key)
    }

    func value<T: Decodable>(_ type: T.Type, for key: String) throws -> T? {
        guard let data = try data(for: key) else { return nil }
        return try JSONDecoder().decode(type, from: data)
    }
}
```

## Uso

```swift
let keychain = Keychain()

// Guardar tras el login
try keychain.set(response.accessToken, for: "access_token")
try keychain.set(session, for: "session")   // cualquier Codable

// Leer al arrancar la app
if let token = try keychain.string(for: "access_token") {
    apiClient.authorize(with: token)
}

// Cerrar sesión
try keychain.removeAll()
```

## Limitaciones conocidas

- **El Keychain sobrevive a la desinstalación de la app.** Es comportamiento del sistema, no un bug: si se reinstala, los datos anteriores siguen ahí. Para evitar que un usuario nuevo herede la sesión del anterior, conviene borrar el Keychain en el primer arranque (detectado con una bandera en `UserDefaults`, que sí se borra al desinstalar).
- **`ThisDeviceOnly` impide la sincronización entre dispositivos.** Es lo correcto para tokens de sesión, pero si el caso requiere que una credencial se restaure en un dispositivo nuevo, hay que usar una accesibilidad distinta y asumir el riesgo.
- **No funciona antes del primer desbloqueo** tras reiniciar el teléfono: si la app corre en background (una notificación push, una tarea de fondo) antes de que el usuario desbloquee, la lectura falla. Para esos casos existe `AfterFirstUnlock`, con menos protección.
- **Compartir entre app y extensiones** (widget, share extension) requiere configurar un Keychain Access Group en los entitlements; sin eso, cada target tiene su propio almacén aislado.
- **En el simulador el Keychain es menos estricto** que en dispositivo real; conviene probar en hardware antes de dar por buena la configuración de accesibilidad.
- **Esto protege los datos en reposo, no en tránsito ni en memoria.** Un token leído a memoria es tan vulnerable como cualquier variable; el Keychain resuelve el almacenamiento persistente.

## Fuentes

- **Alamofire** (42.4k ⭐): su manejo de autenticación y refresh de tokens asume un almacenamiento seguro por debajo; este snippet cubre justamente esa pieza que Alamofire deja al implementador.
- **awesome-ios** (52.9k ⭐): lista varias librerías wrapper de Keychain (KeychainAccess, Valet, SwiftKeychainWrapper); todas resuelven el mismo problema con más features (biometría, grupos de acceso, iCloud). Este snippet es la versión sin dependencia.
- **OWASP CheatSheetSeries** (32.7k ⭐): su guía de almacenamiento seguro en móviles es la fuente del criterio de qué merece Keychain y qué no, y de por qué `ThisDeviceOnly` es el default correcto para credenciales de sesión.
