# En-IntelliSense

Asistente de escritura en inglés que comprende el contexto completo. Infiere la intención, completa palabras/frases/oraciones, detecta problemas y propone correcciones localizadas.

Demo en línea: [en-intellisense-85d4szue.edgeone.cool](https://en-intellisense-85d4szue.edgeone.cool/)

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

## Modelo, cuota y privacidad de la demo

La demo usa actualmente Cloudflare Workers AI con `@cf/meta/llama-3.1-8b-instruct-fp8`. La asignación gratuita actual es de [10.000 Neurons al día](https://developers.cloudflare.com/workers-ai/platform/pricing/), se restablece a las `00:00 UTC` y se comparte entre todos los visitantes y las demás aplicaciones Workers AI de la cuenta. Usa las funciones de IA con moderación y evita repetir Review, Polish o Chat sobre texto sin cambios.

En esta arquitectura, el aislamiento entre usuarios depende del almacenamiento local del navegador, no de cuentas en el servidor. Los borradores se guardan únicamente en `localStorage`; no existe una base de datos de borradores en el servidor. Distintos dispositivos, navegadores y perfiles están aislados, pero las personas que comparten el mismo perfil del navegador también comparten sus datos locales. Las funciones de IA envían el texto necesario al proveedor configurado, por lo que la demo pública no debe utilizarse con información confidencial.

## Demostración de correo

![Elegir un proveedor y transferir el correo terminado](docs/assets/demo-email.png)

## Configuración

Copia `.env.example` como `.env` y configura `OPENAI_API_KEY`. También puedes definir `OPENAI_MODEL`, `OPENAI_AUTOCOMPLETE_MODEL` y `OPENAI_BASE_URL`.

```powershell
python -m pip install -r requirements.txt
python server.py
```

Abre `http://127.0.0.1:8000`.

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

La demo está desplegada en [en-intellisense-85d4szue.edgeone.cool](https://en-intellisense-85d4szue.edgeone.cool/). Si devuelve `401 Authorization Required`, desactiva la protección de acceso en la consola de EdgeOne antes de compartirla públicamente. No compartas ni guardes en Git enlaces temporales que contengan `eo_token`. La aceleración en China continental con un dominio personalizado requiere el registro ICP correspondiente.

## Pruebas

```powershell
python -m unittest discover -p "test_*.py"
npm test
```

## Licencia

[MIT](LICENSE)
