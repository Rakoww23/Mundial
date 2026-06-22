import type { TutorialStep } from '../hooks/useTutorial';

export const SIM_STEPS: TutorialStep[] = [
  {
    target: 'sim-home-team',
    title: 'Selección Local',
    body: 'Elige el equipo local. Despliega el selector para buscar entre las 48 selecciones del Mundial 2026. La formación se elige en el menú contiguo.',
  },
  {
    target: 'sim-away-team',
    title: 'Selección Visitante',
    body: 'Elige el rival. Puedes comparar cualquier combinación de selecciones y cambiarlas en cualquier momento antes de simular.',
  },
  {
    target: 'sim-pitch',
    title: 'Campo Táctico',
    body: 'El campo muestra la alineación completa con los once titulares. Toca cualquier jugador para abrir su ficha, ver sus estadísticas y cambiarlo por alguien del banquillo.',
  },
  {
    target: 'sim-tac-home',
    title: 'Análisis Táctico',
    body: 'Panel de análisis del equipo local: medias por línea, puntuación ofensiva/defensiva y ventajas o debilidades respecto al rival. Ajusta la mentalidad (Defensivo → Ultra-Ofensivo) para alterar las probabilidades.',
  },
  {
    target: 'sim-tac-away',
    title: 'Análisis del Rival',
    body: 'Panel equivalente para el equipo visitante. Compara ambos análisis para detectar dónde tienes ventaja posicional y dónde el rival te supera.',
  },
  {
    target: 'sim-type',
    title: 'Tipo de Partido',
    body: 'Selecciona si el partido es de Fase de Grupos (empate válido, sin prórroga) o Eliminatoria (prórroga y penales si hay empate al final del tiempo reglamentario).',
  },
  {
    target: 'sim-modes',
    title: 'Modos de Simulación',
    body: 'Predicción Rápida: resultado instantáneo con xG y probabilidades de victoria.\n\nDesde Minuto Específico: introduce un marcador y un minuto concreto y obtén la proyección del desenlace final.',
  },
  {
    target: 'sim-simulator',
    title: 'Simulación',
    body: 'Pulsa "Simulación Rápida" para obtener el resultado más probable al instante, incluyendo xG, probabilidades y goleadores probables. Todos los cálculos usan un modelo xG no lineal.',
  },
  {
    target: 'sim-reset',
    title: 'Reiniciar Alineación',
    body: 'Restaura la alineación de ambos equipos a su once titular original si realizaste cambios manuales de jugadores o formación.',
  },
];

export const WC_STEPS: TutorialStep[] = [
  {
    target: 'wc-team-grid',
    title: 'Elige tu Selección',
    body: 'Selecciona la selección con la que quieres competir en el Mundial. Busca por nombre o código. Una vez iniciado el torneo, no podrás cambiarla.',
  },
  {
    target: 'wc-group-card',
    title: 'Fase de Grupos',
    body: 'El Mundial consta de 12 grupos de 4 equipos. Los 2 primeros de cada grupo más los 8 mejores terceros clasifican a la Ronda de 32. Aquí ves la tabla en tiempo real.',
  },
  {
    target: 'wc-fixtures',
    title: 'Jornadas y Partidos',
    body: 'Cada jornada lista todos los partidos. Los partidos de tu selección tienen el botón "Jugar" para disputarlos en vivo. El resto se pueden auto-simular con "Auto-simular".',
  },
  {
    target: null,
    title: 'Sistema de Fatiga',
    body: 'Los jugadores acumulan fatiga partido a partido. Un jugador con fatiga >85% no puede salir de titular. Si supera el 93% en juego, sufre una lesión. La fatiga se recupera entre rondas.',
  },
  {
    target: null,
    title: 'Tarjetas y Suspensiones',
    body: 'Las tarjetas amarillas se acumulan a lo largo del torneo: 2 amarillas = suspensión para el siguiente partido (y se reinician). Una roja directa implica suspensión inmediata. Los jugadores suspendidos no pueden jugar.',
  },
  {
    target: null,
    title: 'Ficha del Jugador en el Mundial',
    body: 'Toca cualquier jugador del once titular para ver su ficha de torneo: amarillas acumuladas, fatiga actual, partidos jugados y si está suspendido o lesionado. Puedes hacer cambios de plantilla desde la ficha.',
  },
  {
    target: 'wc-knockout',
    title: 'Fase Eliminatoria',
    body: 'Una vez completada la fase de grupos, comienza la eliminatoria desde los Dieciseisavos de Final. Un partido por ronda: el perdedor queda eliminado, el ganador avanza hasta la Final.',
  },
  {
    target: 'wc-knockout',
    title: 'Gestión del Torneo',
    body: 'En cada ronda de eliminatoria puedes jugar tu partido, auto-simular los del resto y avanzar cuando todos los partidos estén jugados. El torneo guarda automáticamente el progreso.',
  },
];
