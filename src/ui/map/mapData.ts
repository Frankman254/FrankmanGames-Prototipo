// Datos de `data/ui/map.json`, validados una vez (los comparten los menús y `mapFeed`).
import mapJson from '../../../data/ui/map.json';
import { parseMapDef } from './mapLogic';

export const MAP_DEF = parseMapDef(mapJson);
