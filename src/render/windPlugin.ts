// Balanceo de viento por shader para la vegetación: desplaza los vértices en XZ
// según su altura local (la base no se mueve) y una fase que depende de la
// posición en el mundo, así cada planta se mueve a destiempo.
import { MaterialPluginBase, type Material, type MaterialDefines, type UniformBuffer } from '@babylonjs/core';

export class WindPlugin extends MaterialPluginBase {
  /** Segundos acumulados (los actualiza la vista una vez por fotograma). */
  static time = 0;
  /** Multiplicador global (data/vegetation.json → wind.strength). */
  static strength = 1;
  static speed = 1;

  constructor(material: Material, private readonly amplitude: number) {
    super(material, 'Wind', 200, { WIND: false });
    this._enable(true);
  }

  override getClassName(): string {
    return 'WindPlugin';
  }

  override prepareDefines(defines: MaterialDefines): void {
    defines['WIND'] = this.amplitude > 0;
  }

  override getUniforms(): { ubo: Array<{ name: string; size: number; type: string }>; vertex: string } {
    return {
      ubo: [{ name: 'windParams', size: 4, type: 'vec4' }],
      vertex: '#ifdef WIND\nuniform vec4 windParams;\n#endif\n',
    };
  }

  override bindForSubMesh(ubo: UniformBuffer): void {
    ubo.updateFloat4('windParams', WindPlugin.time * WindPlugin.speed, this.amplitude * WindPlugin.strength, 0, 0);
  }

  override getCustomCode(shaderType: string): { [pointName: string]: string } | null {
    if (shaderType !== 'vertex') return null;
    return {
      CUSTOM_VERTEX_UPDATE_WORLDPOS: `
#ifdef WIND
  {
    float hLocal = max(positionUpdated.y, 0.0);
    float phase = worldPos.x * 0.21 + worldPos.z * 0.17;
    float t = windParams.x;
    float gust = 0.6 + 0.4 * sin(t * 0.31 + worldPos.x * 0.02);
    vec2 sway = vec2(sin(t + phase), 0.6 * cos(t * 1.27 + phase * 1.3));
    // Pequeño temblor de hojas encima del balanceo principal.
    sway += 0.25 * vec2(sin(t * 4.1 + worldPos.y * 3.0 + phase * 5.0), cos(t * 3.7 + phase * 4.0));
    worldPos.xz += sway * windParams.y * gust * 0.06 * hLocal * (0.5 + hLocal);
  }
#endif
`,
    };
  }
}
