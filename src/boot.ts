// Arranque: primero la geometría de Blender, para que las vistas la usen sin esperar.
import { loadStaticModels } from './render/staticModels';
import { showStartupError } from './ui/startupError';

void loadStaticModels()
    .then(() => import('./main'))
    .catch((err: unknown) => {
        console.error(err);
        showStartupError(err);
    });
