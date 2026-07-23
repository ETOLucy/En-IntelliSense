<div align="center">
  <picture><source media="(prefers-color-scheme: dark)" srcset="docs/assets/logo-dark.svg"><img src="docs/assets/en-intellisense-logo.svg" width="340" alt="Logotipo de En-IntelliSense" /></picture>
  <h1>En-IntelliSense</h1>
</div>

Asistente de escritura en inglés que comprende el contexto completo. Infiere la intención, completa palabras/frases/oraciones, detecta problemas y propone correcciones localizadas.

Documentación: [English](README.md) | [简体中文](README.zh-CN.md) | **Español** | [日本語](README.ja.md) | [Русский](README.ru.md)

## Funciones

- Autocompletado local de palabras y autocompletado de frases/oraciones mediante un modelo.
- Inferencia de intención basada en todo el borrador.
- Revisión automática de gramática, claridad, vocabulario, repetición y tono.
- Resaltado exacto, explicación en chino y sustitución con un clic.
- Pulido del asunto y del texto, traducción, explicación y simplificación.
- Las frases útiles sustituyen la selección o la oración actual; no se añaden al final.
- Al terminar una carta, abre QQ Mail, 163 Mail, Gmail o un correo web personalizado con destinatario, asunto y cuerpo preparados.
- Conserva los documentos terminados localmente y permite volver a editarlos como una copia.

## Modelo de IA, coste y privacidad

En-IntelliSense no incluye un modelo de lenguaje, una clave API compartida ni crédito gratuito de IA. El autocompletado mediante modelo, la revisión, la reescritura y el chat requieren que cada usuario configure su propio proveedor compatible con OpenAI. Los costes, límites y condiciones de privacidad pertenecen al proveedor elegido; el proyecto no proporciona ni recomienda servicios intermediarios no oficiales.

Sin una clave API, la aplicación sigue ofreciendo autocompletado local de palabras, borradores, documentos terminados y transferencia al correo. Las funciones de IA permanecen desactivadas y el asistente muestra `Add API key for AI`.

En esta arquitectura, el aislamiento entre usuarios depende del almacenamiento local del navegador, no de cuentas en el servidor. Los borradores se guardan únicamente en `localStorage`; no existe una base de datos de borradores en el servidor. Las funciones de IA envían el texto necesario al proveedor configurado por el usuario. El archivo `.env` es texto local sin cifrar: no lo añadas a Git, no publiques una clave en una incidencia y revisa la privacidad del proveedor antes de procesar información confidencial.

## Demostración de correo

![Elegir un proveedor y transferir el correo terminado](docs/assets/demo-email.png)

## Configuración

Copia `.env.example` como `.env` y configura las credenciales de tu propio proveedor:

```dotenv
OPENAI_API_KEY=your_own_api_key
OPENAI_BASE_URL=https://api.openai.com
OPENAI_MODEL=gpt-4.1-mini
OPENAI_AUTOCOMPLETE_MODEL=gpt-4.1-mini
OPENAI_API_STYLE=chat
```

Usa nombres de modelos admitidos por el proveedor seleccionado.

```powershell
python -m pip install -r requirements.txt
python server.py
```

Abre `http://127.0.0.1:8000`.

## Aplicación de escritorio para Windows

Para usarlo normalmente, descarga `En-IntelliSense.exe` desde la [última versión](https://github.com/ETOLucy/En-IntelliSense/releases/latest) y haz doble clic; no necesitas ejecutar comandos. La versión `v1.0.1` todavía no está firmada y Windows Smart App Control puede bloquearla. El proyecto ha solicitado la firma de SignPath Foundation y publicará versiones firmadas después de la aprobación.

`powershell -ExecutionPolicy Bypass -File .\scripts\build_windows.ps1` solo sirve para volver a compilar después de modificar el código. El ejecutable no incorpora claves de API, modelos ni recursos personales del mantenedor. Descarga `En-IntelliSense.env.example`, renómbralo como `.env`, añade los datos de tu proveedor y reinicia la aplicación.

## Despliegue en Cloudflare

Cloudflare Workers AI funciona como proveedor predeterminado y no requiere una clave externa. Los secretos son opcionales para usar otro proveedor compatible con OpenAI.

```powershell
npx wrangler login
npx wrangler deploy

# Proveedor externo opcional
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put OPENAI_BASE_URL
```

## Despliegue en EdgeOne Pages

Importa este repositorio en EdgeOne Pages, selecciona `main` como rama de producción y deja vacío el comando de compilación. `edgeone.json` publica `public/` y despliega las funciones de `node-functions/`.

## Pruebas

```powershell
python -m unittest discover -p "test_*.py"
npm test
```

## Licencia

[MIT](LICENSE)
