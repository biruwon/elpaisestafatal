// Generated from config/metric-registry.json by catalogue:compile.
// Edit the registry; this module also supports older Pages build parsers.
export default {
  "youth_unemployment_rate": {
    "aliases": [
      "paro juvenil",
      "desempleo juvenil",
      "jóvenes sin trabajo",
      "paro de los jóvenes"
    ],
    "definition": {
      "label": "Tasa de paro juvenil",
      "explanation": "Se refiere a jóvenes activos del grupo de edad de la serie (por ejemplo, 15–24 o 15–29 años). No es el porcentaje de todos los jóvenes que no tienen trabajo.",
      "numerator": "jóvenes desempleados del grupo de edad analizado",
      "denominator": "jóvenes activos, ocupados más desempleados, del mismo grupo de edad",
      "sources": [
        {
          "id": "definition-youth_unemployment_rate",
          "title": "Eurostat · Tasa de paro juvenil",
          "publisher": "Eurostat",
          "url": "https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Glossary:Youth_unemployment",
          "retrievedAt": "2026-10-29"
        }
      ]
    }
  },
  "unemployment_rate": {
    "aliases": [
      "paro",
      "desempleo",
      "tasa de paro",
      "personas sin trabajo",
      "no encuentra trabajo"
    ],
    "definition": {
      "label": "Tasa de paro",
      "explanation": "Expresa qué parte de la población activa está desempleada. La población activa suma personas ocupadas y desempleadas; no incluye a quienes están fuera del mercado laboral.",
      "numerator": "personas desempleadas del grupo y territorio analizados",
      "denominator": "personas activas del mismo grupo, territorio y periodo",
      "sources": [
        {
          "id": "definition-unemployment_rate",
          "title": "Eurostat · Tasa de paro",
          "publisher": "Eurostat",
          "url": "https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Glossary:Unemployment",
          "retrievedAt": "2026-10-29"
        }
      ]
    }
  },
  "employment_rate": {
    "aliases": [
      "empleo",
      "ocupación",
      "tasa de empleo",
      "trabajo"
    ],
    "definition": {
      "label": "Tasa de empleo",
      "explanation": "Expresa qué parte de una población definida tiene empleo. Su denominador incluye a toda la población de ese grupo, también a las personas inactivas.",
      "numerator": "personas ocupadas del grupo de edad analizado",
      "denominator": "población total del mismo grupo de edad, territorio y periodo",
      "sources": [
        {
          "id": "definition-employment_rate",
          "title": "Eurostat · Tasa de empleo",
          "publisher": "Eurostat",
          "url": "https://ec.europa.eu/eurostat/statistics-explained/index.php?title=Glossary:Employment_rate",
          "retrievedAt": "2026-10-29"
        }
      ]
    }
  }
};
