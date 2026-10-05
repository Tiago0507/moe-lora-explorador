# MoE-LoRA multitarea: explorador interactivo

Página web interactiva que acompaña el paper **"Organización de adaptadores LoRA en fine-tuning multitarea: compartido, por tarea y mezcla de expertos"** (Inteligencia Artificial, Universidad Icesi, 2026). Está pensada para presentar los resultados en clase de forma dinámica: el público vota, se revelan los datos y los parámetros se mueven en vivo.

**Sitio publicado:** https://tiago0507.github.io/moe-lora-explorador/

## Qué muestra

| Sección         | Interacción                                                                                                                                                  |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pregunta        | El dilema central: compartir parámetros entre tareas o aislarlos.                                                                                            |
| Configuraciones | Eliges una tarea y ves qué adaptador la atiende en (i) LoRA compartido, (ii) LoRA por tarea y (iii) MoE-LoRA, con los pesos del enrutador.                   |
| Resultados      | El público vota antes de ver los datos. Luego se revelan la macro-F1 y la exactitud por tarea, y un gráfico de diferencias con la banda de ruido aproximada. |
| Costo           | Simulador de parámetros entrenables según el número de tareas _T_, de expertos _E_ y el rango _r_, con el punto donde MoE-LoRA empieza a salir más barato.   |
| Router          | Mapa tarea × experto con los pesos crudos del notebook o los efectivos (temperatura y top-k ajustables) y la entropía por tarea.                             |
| Conclusiones    | Respuestas a los dos problemas abiertos y lo que se puede y no se puede afirmar.                                                                             |

Teclas <kbd>1</kbd> a <kbd>6</kbd> saltan entre secciones durante la presentación.

## Origen de los datos

Todas las cifras se copian de las salidas ejecutadas del notebook del experimento (`moe_peft_multitarea.ipynb`). En [`src/data/experiment.ts`](src/data/experiment.ts) cada bloque indica su celda de origen. Las pruebas comprueban que el modelo de costo reproduce los parámetros medidos y la tabla de extrapolación del notebook.

Los **pesos efectivos** del enrutador no aparecen en el notebook: se reconstruyen desde su mapa de calor, redondeado a dos decimales. Como `softmax` es invariante a desplazamientos, dentro del top-k se cumple ω<sub>i</sub> ∝ p<sub>i</sub><sup>1/τ</sup>. Son valores aproximados y la página lo indica.

## Tecnología

- [Vite](https://vite.dev/) y TypeScript estricto, sin framework: es una sola página y las gráficas son SVG propias.
- Tipografías incluidas en el proyecto con [Fontsource](https://fontsource.org/) (IBM Plex Sans, Source Serif 4 e IBM Plex Mono), para que la página funcione sin depender de servicios externos.
- Modo claro y oscuro, navegación con teclado, `prefers-reduced-motion` y una vista en tabla para cada gráfica.
- Colores de las series tomados de una paleta categórica validada para daltonismo, los mismos tonos de las figuras del paper.

## Uso local

Requiere Node.js 20 o superior (ver `.nvmrc`).

```bash
npm ci
npm run dev       # servidor de desarrollo
npm run build     # compilación en dist/
npm run preview   # sirve la compilación
```

La compilación usa rutas relativas, así que `dist/` también se puede abrir sin conexión con cualquier servidor estático.

## Calidad

```bash
npm run check     # tipos + ESLint + Prettier + pruebas (Vitest)
```

El flujo de GitHub Actions ejecuta `check` y `build` en cada push y pull request, y publica en GitHub Pages los cambios que llegan a `main`. Dependabot propone actualizaciones mensuales.

## Estructura

```
src/
  data/experiment.ts      datos del notebook, con la celda de origen
  lib/                    lógica pura y probada: costo, router, estadística, escalas, formato
  components/             secciones interactivas (configuraciones, resultados, costo, router)
  styles/                 tokens de diseño y estilos
tests/                    pruebas unitarias de la lógica
```

## Autores

Juan Manuel Díaz Moreno y Santiago Valencia García. Universidad Icesi, Cali, Colombia.

Licencia [MIT](LICENSE).
