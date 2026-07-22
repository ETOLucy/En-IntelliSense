# En-IntelliSense

Asistente de escritura en inglés que comprende el contexto completo. Infiere la intención, completa palabras/frases/oraciones, detecta problemas y propone correcciones localizadas.

Demo pública permanente: [en-intellisense.etolucy.workers.dev](https://en-intellisense.etolucy.workers.dev)

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

También existe un despliegue de producción en EdgeOne Pages. El dominio preestablecido `en-intellisense-85d4szue.edgeone.cool` está protegido y debe abrirse mediante **Visit site** en la consola de EdgeOne. No compartas ni guardes en Git enlaces temporales que contengan `eo_token`. Una URL pública permanente requiere un dominio personalizado; la aceleración en China continental también requiere el registro ICP correspondiente.

## Pruebas

```powershell
python -m unittest discover -p "test_*.py"
npm test
```

## Licencia

[MIT](LICENSE)
