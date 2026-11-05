// Niebla correcta en los modelos de Blender. Sus materiales PBR mezclan la niebla en espacio
// lineal y luego corrigen gama: sin convertir, el color de la niebla sale muy aclarado y un
// aguacero los deja casi blancos mientras el terreno y los árboles siguen bien.
import { MaterialPluginBase, PBRMaterial, type Material, type Scene } from '@babylonjs/core';

class LinearFogPlugin extends MaterialPluginBase {
  constructor(material: Material) {
    super(material, 'LinearFog', 210, { LINEAR_FOG: true });
    this._enable(true);
  }

  override prepareDefines(defines: Record<string, unknown>): void {
    defines['LINEAR_FOG'] = true;
  }

  override getClassName(): string {
    return 'LinearFogPlugin';
  }

  override getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType !== 'fragment') return null;
    return {
      CUSTOM_FRAGMENT_BEFORE_FOG: `
#ifdef FOG
  vec3 linearFogColor = pow(vFogColor, vec3(2.2));
  #define vFogColor linearFogColor
#endif
`,
    };
  }
}

/** Todo material PBR que entre en la escena usa la niebla convertida. */
export function useLinearFog(scene: Scene): void {
  scene.onNewMaterialAddedObservable.add((m) => {
    if (m instanceof PBRMaterial && !m.pluginManager?.getPlugin('LinearFog')) new LinearFogPlugin(m);
  });
}
