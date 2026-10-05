import { SETUP } from '../data/experiment';
import { byId, h } from '../lib/dom';
import { formatInt } from '../lib/format';

/** Cifras de contexto de la portada. */
export function initHero(): void {
  const stats: { label: string; value: string; note: string }[] = [
    {
      label: 'Modelo base',
      value: `${SETUP.baseModelParamsMillions} M`,
      note: 'DistilBERT, congelado',
    },
    { label: 'Tareas', value: String(SETUP.numTasks), note: 'clasificación de reseñas' },
    {
      label: 'Datos por tarea',
      value: formatInt(SETUP.trainPerTask),
      note: `entrenamiento · ${SETUP.testPerTask} de prueba`,
    },
    { label: 'Semilla', value: '1', note: `${SETUP.trainSteps} pasos en una ${SETUP.gpu}` },
  ];
  byId('hero-stats').replaceChildren(
    ...stats.map((st) =>
      h(
        'div',
        { class: 'stat' },
        h('dt', {}, st.label),
        h('dd', {}, st.value, h('small', {}, st.note)),
      ),
    ),
  );
}
