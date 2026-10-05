import '@fontsource/ibm-plex-sans/400.css';
import '@fontsource/ibm-plex-sans/500.css';
import '@fontsource/ibm-plex-sans/600.css';
import '@fontsource/ibm-plex-mono/500.css';
import '@fontsource-variable/source-serif-4';
import './styles/main.css';

import { initConfigs } from './components/configs';
import { initCostSimulator } from './components/costSimulator';
import { initHero } from './components/hero';
import { initNavigation } from './components/navigation';
import { initResults } from './components/results';
import { initRouter } from './components/routerView';

initHero();
initConfigs();
initResults();
initCostSimulator();
initRouter();
initNavigation();
