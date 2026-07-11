# Investigaciones: fuente editorial y datos estructurados

## Inventario

Cada preocupación visible debe disponer de un archivo `investigaciones/<slug>.md`. El Markdown es la copia editorial completa y legible. Los archivos con `status: pending-research` son marcadores explícitos y no deben publicarse como investigación terminada.

## ¿Puede Markdown ser la única fuente de verdad?

Sí, pero el texto Markdown por sí solo no conserva suficiente estructura para gráficos, métricas, límites metodológicos y enlaces de fuente. La solución recomendada es **Markdown/MDX con frontmatter tipado y bloques de datos estructurados**.

Ejemplo:

```md
---
slug: vivienda
title: Vivienda
kicker: Investigación · vivienda
finding: España carece de vivienda asequible donde crece la demanda.
status: published
---

# La crisis de vivienda

:::metrics
[{"value":"12,9 %","label":"precio interanual"}]
:::

:::chart
{"title":"Hogares y viviendas","labels":["Hogares","Viviendas"],"values":[240,92],"unit":"miles","source":"bde-2025"}
:::
```

## Arquitectura recomendada

1. Guardar texto, orden de capítulos y metadatos en Markdown o MDX.
2. Mantener un registro común de fuentes con identificadores estables.
3. Validar frontmatter y bloques gráficos durante `astro check` o antes del build.
4. Transformar el documento a la forma `InvestigationSection[]` que ya consume la plantilla.
5. Rechazar el build si faltan etiquetas, valores, unidades, fuente o límites.

## Por qué no importar el Markdown actual directamente

Los documentos existentes contienen prosa, listas y encabezados, pero los gráficos del sitio viven hoy en objetos TypeScript. Inferir automáticamente qué números forman un gráfico sería frágil y podría alterar el significado estadístico.

La migración segura debe ser progresiva: añadir frontmatter y bloques explícitos a cada Markdown, comprobar que la página generada coincide con la actual y después retirar el archivo TypeScript duplicado.

## Resultado

Markdown puede ser la fuente de verdad sin perder paneles ni gráficos siempre que los datos visuales sean explícitos y validados, no extraídos heurísticamente de la prosa.
