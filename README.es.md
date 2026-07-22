# En-IntelliSense

Asistente de escritura en inglés que comprende el contexto completo. Infiere la intención, completa palabras/frases/oraciones, detecta problemas y propone correcciones localizadas.

Documentación: [English](README.md) | [简体中文](README.zh-CN.md) | **Español** | [日本語](README.ja.md)

## Funciones

- Autocompletado local de palabras y autocompletado de frases/oraciones mediante un modelo.
- Inferencia de intención basada en todo el borrador.
- Revisión automática de gramática, claridad, vocabulario, repetición y tono.
- Resaltado exacto, explicación en chino y sustitución con un clic.
- Pulido del asunto y del texto, traducción, explicación y simplificación.
- Las frases útiles sustituyen la selección o la oración actual; no se añaden al final.

## Configuración

Copia `.env.example` como `.env` y configura `OPENAI_API_KEY`. También puedes definir `OPENAI_MODEL`, `OPENAI_AUTOCOMPLETE_MODEL` y `OPENAI_BASE_URL`.

```powershell
python -m pip install -r requirements.txt
python server.py
```

Abre `http://127.0.0.1:8000`.

## Despliegue en Cloudflare

```powershell
npx wrangler login
npx wrangler secret put OPENAI_API_KEY
npx wrangler secret put OPENAI_BASE_URL
npx wrangler deploy
```

## Pruebas

```powershell
python -m unittest discover -p "test_*.py"
node test_completion.js
```
