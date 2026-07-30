---
title: Interceptor de auth con refresh en OkHttp
platform: mobile
pillar: android
tags: [android, okhttp, kotlin, auth, retrofit, token-refresh]
summary: Agrega el token a cada request y renueva la sesión ante un 401 usando Authenticator de OkHttp, evitando renovaciones concurrentes duplicadas.
when_not_to_use: Si la API usa cookies de sesión, usar CookieJar en vez de este patrón — Authenticator está pensado para esquemas por token.
---

# Interceptor de auth con refresh en OkHttp

## Contexto

Toda app con sesión necesita dos cosas: agregar el token a cada request, y
renovarlo cuando expira. Resolver esto a mano en cada llamada produce código
repetido y, sobre todo, un bug de concurrencia predecible: si cinco
requests salen a la vez y todas reciben 401, las cinco disparan un refresh y
cuatro tokens quedan invalidados — el usuario termina deslogueado
justamente por el mecanismo que debía mantenerlo logueado.

OkHttp separa estas dos responsabilidades en dos mecanismos distintos, y
usar el correcto para cada una es lo que hace que el patrón funcione. Un
**`Interceptor`** corre en cada request y sirve para agregar el header. Un
**`Authenticator`** lo llama OkHttp **solo** cuando el servidor responde 401,
y su respuesta es la request corregida que se reintenta automáticamente. El
`Authenticator` es el lugar correcto para el refresh porque OkHttp ya maneja
el reintento por vos, y porque sincronizarlo evita el problema de las
renovaciones concurrentes.

## Código completo

```kotlin
import kotlinx.coroutines.runBlocking
import okhttp3.Authenticator
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.Response
import okhttp3.Route
import java.util.concurrent.TimeUnit

/** Fuente de verdad del token. Implementarla sobre DataStore o EncryptedSharedPreferences. */
interface TokenStore {
    fun accessToken(): String?
    fun refreshToken(): String?
    fun save(access: String, refresh: String)
    fun clear()
}

/**
 * Agrega el token a cada request saliente.
 * No intenta renovar nada: esa es tarea del Authenticator.
 */
class AuthInterceptor(private val tokens: TokenStore) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()

        // Las rutas públicas no llevan token (y no deben disparar refresh)
        if (request.header("No-Auth") != null) {
            return chain.proceed(request.newBuilder().removeHeader("No-Auth").build())
        }

        val token = tokens.accessToken()
            ?: return chain.proceed(request)

        return chain.proceed(
            request.newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        )
    }
}

/**
 * OkHttp llama a authenticate() solo ante un 401. Devolver una Request
 * hace que OkHttp la reintente; devolver null propaga el 401 al llamador.
 */
class TokenAuthenticator(
    private val tokens: TokenStore,
    private val refreshApi: RefreshApi,
    private val onSessionExpired: () -> Unit,
) : Authenticator {

    // El lock evita que N requests concurrentes disparen N refresh.
    private val lock = Any()

    override fun authenticate(route: Route?, response: Response): Request? {
        // Si ya se reintentó una vez y volvió a dar 401, el token nuevo
        // tampoco sirve: cortar acá evita un bucle infinito.
        if (responseCount(response) >= 2) {
            onSessionExpired()
            return null
        }

        synchronized(lock) {
            val currentToken = tokens.accessToken()
            val failedToken = response.request.header("Authorization")
                ?.removePrefix("Bearer ")

            // Otra request ya renovó mientras esta esperaba el lock:
            // reintentar directamente con el token nuevo.
            if (currentToken != null && currentToken != failedToken) {
                return response.request.newBuilder()
                    .header("Authorization", "Bearer $currentToken")
                    .build()
            }

            val refresh = tokens.refreshToken() ?: run {
                onSessionExpired()
                return null
            }

            return try {
                // runBlocking es aceptable acá: authenticate() ya corre
                // en un hilo de background de OkHttp, nunca en el main.
                val fresh = runBlocking { refreshApi.refresh(refresh) }
                tokens.save(fresh.accessToken, fresh.refreshToken)

                response.request.newBuilder()
                    .header("Authorization", "Bearer ${fresh.accessToken}")
                    .build()
            } catch (e: Exception) {
                tokens.clear()
                onSessionExpired()
                null
            }
        }
    }

    private fun responseCount(response: Response): Int {
        var count = 1
        var prior = response.priorResponse
        while (prior != null) {
            count++
            prior = prior.priorResponse
        }
        return count
    }
}
```

**Armado del cliente**

```kotlin
fun buildOkHttpClient(
    tokens: TokenStore,
    refreshApi: RefreshApi,
    onSessionExpired: () -> Unit,
): OkHttpClient = OkHttpClient.Builder()
    .addInterceptor(AuthInterceptor(tokens))
    .authenticator(TokenAuthenticator(tokens, refreshApi, onSessionExpired))
    .connectTimeout(15, TimeUnit.SECONDS)
    .readTimeout(30, TimeUnit.SECONDS)
    .apply {
        if (BuildConfig.DEBUG) {
            addInterceptor(
                HttpLoggingInterceptor().apply {
                    level = HttpLoggingInterceptor.Level.HEADERS
                    // Nunca loguear el token, ni en debug
                    redactHeader("Authorization")
                }
            )
        }
    }
    .build()
```

## Uso

```kotlin
// El cliente de refresh NO debe usar el authenticator: si el refresh
// devuelve 401, se entraría en recursión infinita.
private val refreshClient = OkHttpClient.Builder().build()

val retrofit = Retrofit.Builder()
    .baseUrl(BuildConfig.API_URL)
    .client(buildOkHttpClient(tokenStore, refreshApi) { navigateToLogin() })
    .addConverterFactory(MoshiConverterFactory.create())
    .build()
```

```kotlin
// Endpoint público: se marca para que no lleve token
interface AuthApi {
    @Headers("No-Auth: true")
    @POST("auth/login")
    suspend fun login(@Body body: LoginRequest): LoginResponse
}
```

## Limitaciones conocidas

- **El cliente que hace el refresh no puede tener el mismo `Authenticator`**: si lo tiene y el refresh falla con 401, se entra en recursión. Debe ser una instancia separada de `OkHttpClient`.
- **`synchronized` bloquea el hilo**: es aceptable porque `authenticate()` corre en hilos de background de OkHttp, pero con muchas requests concurrentes esperando el mismo refresh, todas quedan bloqueadas hasta que termine. Con corrutinas, un `Mutex` es más idiomático.
- **`TokenStore` debe ser thread-safe**: se lee y escribe desde múltiples hilos. `EncryptedSharedPreferences` y `DataStore` lo son; una implementación casera con un `var` no.
- **No cubre el caso de token expirado sin llegar a 401**: si la API devuelve 403 o un 200 con un cuerpo de error, `Authenticator` no se dispara. Hay que conocer el comportamiento real de la API.
- **Guardar tokens en `SharedPreferences` común es inseguro**: van en `EncryptedSharedPreferences` o en el Keystore de Android — el equivalente del Keychain de iOS.
- **`redactHeader("Authorization")` es obligatorio** si se loguean headers: sin eso, el token completo queda en Logcat, que otras apps pueden leer en dispositivos con depuración habilitada.

## Fuentes

- **OkHttp** (47k ⭐): la separación entre `Interceptor` (cada request) y `Authenticator` (solo ante 401, con reintento automático) es una decisión de diseño propia de OkHttp, y usarla correctamente es lo que evita implementar el reintento a mano. Retrofit se apoya en esto sin reemplazarlo.
- **Android architecture-samples** (45.8k ⭐): sus ejemplos muestran dónde ubicar el `TokenStore` en la capa de datos y cómo inyectarlo, que es la parte que este snippet asume resuelta.
- **Now in Android** (21.6k ⭐): referencia de configuración real de red en una app de producción, incluyendo el manejo de builds de debug y release.
- **Alamofire** (42.4k ⭐): resuelve exactamente el mismo problema en iOS con su `RequestInterceptor` y `RetryPolicy`; comparar ambos ayuda a ver que el patrón (agregar token + renovar sincronizado) es transversal a la plataforma.
