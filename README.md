# La Comanda · Límites algebraicos

**con el Profe Anto** · Cálculo Diferencial

Una cafetería donde cada pedido es un límite. El estudiante construye la solución paso a paso: elige (tocando o arrastrando) la pieza correcta y esta vuela al procedimiento.

Sitio: https://u-anto-proyectos.github.io/limites-algebraicos/

## Contenido

- **Nivel 0 · Desde cero:** qué significa acercarse, cómo se lee la notación, sustitución directa y cuándo sale 0/0.
- **Nivel 1 · Fácil, Nivel 2 · Medio y Nivel 3 · Alto:** 8 pedidos por nivel.
- **Estaciones:** práctica por técnica: sustitución directa, factor común, diferencia de cuadrados, aspa simple, Ruffini, conjugada, mayor potencia (∞/∞) e ∞ − ∞.
- **Lectura de comandas:** solo reconocer la técnica.

## Técnico

- HTML, CSS y JavaScript (módulos ES), sin dependencias ni compilación.
- Generador aleatorio con verificación interna (`assets/js/generator.js`): cada ejercicio comprueba el límite numéricamente, la equivalencia de cada paso, que haya una sola opción correcta y cuatro pistas.
- Pruebas: `node tests/generator.test.mjs`
- Progreso guardado en `localStorage` (clave `la-comanda-limites-v1`).
- Fuentes autoalojadas con licencia OFL (Geist, Instrument Serif, Newsreader, IBM Plex Mono); licencias en `assets/fonts/`.
