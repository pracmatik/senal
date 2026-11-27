# DjCJA

Web pública con novedades sobre polineuropatía de fibra pequeña, dolor neuropático, células iPS y sistema nervioso, explicadas en castellano llano.

- Página: https://pracmatik.github.io/senal/
- Actualización: cada día a las 04:15 UTC (GitHub Actions, `Actualizar noticias`). Se puede lanzar a mano desde la pestaña Actions.
- Recogida: `scripts/collect.mjs` (PubMed, Europe PMC, ClinicalTrials.gov, ScienceDaily, Medical Xpress).
- Resumen: flujo n8n `Neuro Avances · Resumir noticias` (webhook protegido con cabecera `x-neuro-key`).
- Chat: flujo n8n `Neuro Avances · Chat` (límite 15 preguntas por persona y 250 al día en total).
- Secretos del repositorio: `N8N_RESUMIR_URL`, `N8N_KEY`. Ninguna clave va en el código.

## Si algo falla
- Acción en rojo: abrir el registro en Actions. La web sigue mostrando lo último bueno.
- Volver atrás: `git revert` del último commit de noticias.
- Cambiar la clave del resumidor: crear otra en la credencial de n8n y actualizar el secreto `N8N_KEY`.
