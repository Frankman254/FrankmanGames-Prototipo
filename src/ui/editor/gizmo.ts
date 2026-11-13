// TransformGizmo — gizmos 3D de Babylon.js para mover, girar y escalar objetos
// en el viewport del editor. Usa GizmoManager con PositionGizmo, RotationGizmo
// y ScaleGizmo, con snap y callbacks que actualizan el documento del editor.
import {
  GizmoManager,
  TransformNode,
  Vector3,
  Color3,
  MeshBuilder,
  StandardMaterial,
  type Scene,
  type AbstractMesh,
} from '@babylonjs/core';
import type { EditorObject } from '../../editor/doc';

const DEG = Math.PI / 180;

/** Callback invocado cuando el gizmo termina de arrastrar un objeto. */
export interface GizmoCallbacks {
  /** El objeto fue movido a (x, y) en el plano del suelo. */
  onMove(key: string, x: number, y: number): void;
  /** El objeto fue girado `steps` × 15 grados. */
  onRotate(key: string, steps: number): void;
  /** El objeto fue escalado por `factor`. */
  onScale(key: string, factor: number): void;
  /** Seleccionar otro objeto (null = deseleccionar). */
  onSelect(key: string | null): void;
}

/**
 * Representación visual de un objeto del editor como TransformNode con una
 * caja translúcida. El gizmo se adjunta a este nodo para que la transformación
// 3D sea visual y precisa.
 */
class EditorObjectProxy {
  readonly node: TransformNode;
  readonly box: AbstractMesh;
  private _disposed = false;

  constructor(
    scene: Scene,
    obj: EditorObject,
    color: Color3,
    private readonly _groundHeight: (x: number, z: number) => number,
  ) {
    const g = this.groundY(obj);
    this.node = new TransformNode(`gizmo_proxy_${obj.key}`, scene);
    this.node.position.set(obj.x, g, obj.y);
    if (obj.rotDeg) this.node.rotation.y = obj.rotDeg * DEG;

    // Caja visual que representa el objeto
    const shape = obj.shape;
    let w = 0.8, d = 0.8, h = 1.0;
    if (shape.type === 'box') { w = shape.w; d = shape.d; h = shape.h; }
    else if (shape.type === 'cyl') { w = shape.r * 2; d = shape.r * 2; h = shape.h; }

    this.box = MeshBuilder.CreateBox(`gizmo_box_${obj.key}`, { size: 1 }, scene);
    this.box.parent = this.node;
    this.box.position.y = h / 2;
    this.box.isPickable = false;

    const mat = new StandardMaterial(`gizmo_mat_${obj.key}`, scene);
    mat.diffuseColor = color;
    mat.emissiveColor = color.scale(0.4);
    mat.specularColor = Color3.Black();
    mat.alpha = 0.35;
    mat.backFaceCulling = false;
    this.box.material = mat;

    // Escalar la caja según el objeto
    this.box.scaling.set(w, h, d);
  }

  private groundY(obj: EditorObject): number {
    return this._groundHeight(obj.x, obj.y);
  }

  dispose(): void {
    if (this._disposed) return;
    this._disposed = true;
    this.box.dispose(false, true);
    this.node.dispose(false, true);
  }
}

/**
 * TransformGizmo gestiona los gizmos 3D del editor. Crea un proxy visual
 * para el objeto seleccionado y adjunta los gizmos de Babylon.js para
 * mover, girar y escalar con snap.
 */
export class TransformGizmo {
  private readonly _manager: GizmoManager;
  private _proxy: EditorObjectProxy | null = null;
  private _currentKey: string | null = null;
  private _enabled = false;
  private _mode: 'move' | 'rotate' | 'scale' = 'move';

  // Snap settings
  snapDistance = 0.5;       // Posición: 0.5m
  snapRotation = 15 * DEG;  // Rotación: 15°
  snapScale = 0.1;          // Escala: 0.1

  private _dragging = false;
  private _dragStartPos: Vector3 | null = null;
  private _dragStartRot: number = 0;
  private _dragStartScale = Vector3.One();

  constructor(
    private readonly _scene: Scene,
    private readonly _groundHeight: (x: number, z: number) => number,
    private readonly _callbacks: GizmoCallbacks,
  ) {
    // Crear GizmoManager
    this._manager = new GizmoManager(_scene, 0.06);
    this._manager.usePointerToAttachGizmos = false; // Control manual
    this._manager.enableAutoPicking = false;
    this._manager.clearGizmoOnEmptyPointerEvent = false;

    // GizmoManager los crea de forma perezosa. Deben existir antes de conectar
    // observables; antes este bloque recibía tres null y ningún drag se aplicaba.
    this._manager.positionGizmoEnabled = true;
    this._manager.rotationGizmoEnabled = true;
    this._manager.scaleGizmoEnabled = true;

    // Configurar gizmos individuales con snap
    if (this._manager.gizmos.positionGizmo) {
      this._manager.gizmos.positionGizmo.snapDistance = this.snapDistance;
    }
    if (this._manager.gizmos.rotationGizmo) {
      this._manager.gizmos.rotationGizmo.snapDistance = this.snapRotation;
    }

    // Observables de arrastre
    this._setupDragObservables();
    this._updateGizmoVisibility();
  }

  private _setupDragObservables(): void {
    const pg = this._manager.gizmos.positionGizmo;
    const rg = this._manager.gizmos.rotationGizmo;
    const sg = this._manager.gizmos.scaleGizmo;

    if (pg) {
      pg.onDragStartObservable.add(() => {
        this._dragging = true;
        this._dragStartPos = this._proxy?.node.position.clone() ?? null;
      });
      pg.onDragObservable.add(() => {
        // Actualizar posición en tiempo real (sin escribir en el documento aún)
        if (this._proxy && this._currentKey) {
          // El gizmo ya mueve el nodo; solo necesitamos actualizar la visualización
        }
      });
      pg.onDragEndObservable.add(() => {
        this._dragging = false;
        this._applyPositionChange();
      });
    }

    if (rg) {
      rg.onDragStartObservable.add(() => {
        this._dragging = true;
        if (this._proxy) {
          this._dragStartRot = this._proxy.node.rotation.y;
        }
      });
      rg.onDragEndObservable.add(() => {
        this._dragging = false;
        this._applyRotationChange();
      });
    }

    if (sg) {
      sg.onDragStartObservable.add(() => {
        this._dragging = true;
        if (this._proxy) {
          this._dragStartScale.copyFrom(this._proxy.node.scaling);
        }
      });
      sg.onDragEndObservable.add(() => {
        this._dragging = false;
        this._applyScaleChange();
      });
    }
  }

  private _applyPositionChange(): void {
    if (!this._proxy || !this._currentKey) return;
    const pos = this._proxy.node.position;
    // Snap a la rejilla
    const snappedX = Math.round(pos.x / this.snapDistance) * this.snapDistance;
    const snappedY = Math.round(pos.z / this.snapDistance) * this.snapDistance;
    // Actualizar posición del proxy
    this._proxy.node.position.x = snappedX;
    this._proxy.node.position.z = snappedY;
    // Notificar al callback
    this._callbacks.onMove(this._currentKey, snappedX, snappedY);
  }

  private _applyRotationChange(): void {
    if (!this._proxy || !this._currentKey) return;
    const currentRot = this._proxy.node.rotation.y;
    // Snap a 15°
    const rotDeg = (currentRot / DEG) % 360;
    const snappedDeg = Math.round(rotDeg / 15) * 15;
    const steps = Math.round((snappedDeg - (this._dragStartRot / DEG)) / 15);
    this._proxy.node.rotation.y = snappedDeg * DEG;
    this._callbacks.onRotate(this._currentKey, steps);
  }

  private _applyScaleChange(): void {
    if (!this._proxy || !this._currentKey) return;
    const current = this._proxy.node.scaling;
    const ratios = [
      current.x / this._dragStartScale.x,
      current.y / this._dragStartScale.y,
      current.z / this._dragStartScale.z,
    ].filter((v) => Number.isFinite(v) && v > 0);
    // El documento sólo admite escala uniforme. Cualquier asa de eje se
    // convierte en el factor que más se alejó de 1 y se ajusta a décimas.
    const changed = ratios.reduce((best, value) => Math.abs(value - 1) > Math.abs(best - 1) ? value : best, 1);
    const factor = Math.max(this.snapScale, Math.round(changed / this.snapScale) * this.snapScale);
    this._proxy.node.scaling.copyFrom(this._dragStartScale).scaleInPlace(factor);
    this._callbacks.onScale(this._currentKey, factor);
  }

  /**
   * Activa o desactiva los gizmos.
   */
  setEnabled(on: boolean): void {
    this._enabled = on;
    if (!on) {
      this.detach();
    }
  }

  /**
   * Cambia el modo de transformación (move, rotate, scale).
   */
  setMode(mode: 'move' | 'rotate' | 'scale'): void {
    this._mode = mode;
    this._updateGizmoVisibility();
  }

  private _updateGizmoVisibility(): void {
    const enabled = this._enabled;
    this._manager.positionGizmoEnabled = enabled && this._mode === 'move';
    this._manager.rotationGizmoEnabled = enabled && this._mode === 'rotate';
    this._manager.scaleGizmoEnabled = enabled && this._mode === 'scale';
  }

  /**
   * Adjunta los gizmos a un objeto del editor. Crea un proxy visual y
   * adjunta los gizmos al nodo del proxy.
   */
  attach(obj: EditorObject): void {
    // Limpiar proxy anterior
    this.detach();

    // Color según categoría
    const colors: Record<string, Color3> = {
      props: new Color3(0.95, 0.65, 0.25),
      trees: new Color3(0.35, 0.85, 0.35),
      npcs: new Color3(0.35, 0.65, 1),
      start: new Color3(1, 1, 1),
      water: new Color3(0.3, 0.75, 1),
      zones: new Color3(1, 0.85, 0.3),
    };
    const color = colors[obj.category] ?? new Color3(0.8, 0.8, 0.8);

    this._proxy = new EditorObjectProxy(this._scene, obj, color, this._groundHeight);
    this._currentKey = obj.key;

    // Adjuntar gizmos al proxy node
    this._manager.attachToNode(this._proxy.node);
    this._updateGizmoVisibility();
  }

  /**
   * Despega los gizmos del objeto actual y limpia el proxy.
   */
  detach(): void {
    if (this._proxy) {
      this._proxy.dispose();
      this._proxy = null;
    }
    this._currentKey = null;
    this._manager.attachToNode(null);
    this._dragging = false;
    this._dragStartPos = null;
  }

  /**
   * Actualiza la posición del proxy si el objeto fue movido por otros medios
   * (por ejemplo, arrastre en el plano del suelo).
   */
  updateFromObject(obj: EditorObject): void {
    if (!this._proxy || this._currentKey !== obj.key) return;
    this._proxy.node.position.set(obj.x, this._proxy.node.position.y, obj.y);
    this._proxy.node.rotation.y = obj.rotDeg * DEG;
  }

  /**
   * Devuelve true si el gizmo está arrastrando actualmente.
   */
  get isDragging(): boolean {
    return this._dragging;
  }

  /** El puntero está sobre un control del gizmo; el editor no debe capturarlo. */
  get isHovered(): boolean {
    const g = this._manager.gizmos;
    return !!(g.positionGizmo?.isHovered || g.rotationGizmo?.isHovered || g.scaleGizmo?.isHovered);
  }

  /**
   * Devuelve la clave del objeto actualmente adjunto.
   */
  get attachedKey(): string | null {
    return this._currentKey;
  }

  /** Posición mundial del pivote; sólo para aserciones de QA tras entrada real. */
  get position(): { x: number; y: number; z: number } | null {
    const p = this._proxy?.node.getAbsolutePosition();
    return p ? { x: p.x, y: p.y, z: p.z } : null;
  }

  /** Centro mundial de un collider del eje X, para QA de entrada real. */
  get moveAxisPoint(): { x: number; y: number; z: number } | null {
    const axis = this._manager.gizmos.positionGizmo?.xGizmo;
    if (!axis || !this._proxy) return null;
    axis._rootMesh.computeWorldMatrix(true);
    const origin = axis._rootMesh.getAbsolutePosition();
    let point: Vector3 | null = null;
    let distance = -1;
    for (const mesh of axis._rootMesh.getChildMeshes(false)) {
      if (!mesh.isPickable || !mesh.isEnabled()) continue;
      mesh.computeWorldMatrix(true);
      const center = mesh.getBoundingInfo().boundingBox.centerWorld;
      const d = Vector3.DistanceSquared(origin, center);
      if (d > distance) {
        point = center.clone();
        distance = d;
      }
    }
    return point ? { x: point.x, y: point.y, z: point.z } : null;
  }

  /** Punto real de la geometría pickable de la herramienta activa (sólo QA). */
  get activeHandlePoint(): { x: number; y: number; z: number } | null {
    const gizmos = this._manager.gizmos;
    const root = this._mode === 'move'
      ? gizmos.positionGizmo?.xGizmo._rootMesh
      : this._mode === 'rotate'
        ? gizmos.rotationGizmo?.yGizmo._rootMesh
        : gizmos.scaleGizmo?.uniformScaleGizmo._rootMesh;
    if (!root) return null;
    root.computeWorldMatrix(true);
    const origin = root.getAbsolutePosition();
    let point: Vector3 | null = null;
    let distance = -1;
    for (const mesh of root.getChildMeshes(false)) {
      if (!mesh.isPickable || !mesh.isEnabled()) continue;
      mesh.computeWorldMatrix(true);
      const positions = mesh.getVerticesData('position');
      if (!positions) continue;
      for (let i = 0; i < positions.length; i += 3) {
        const candidate = Vector3.TransformCoordinates(
          new Vector3(positions[i]!, positions[i + 1]!, positions[i + 2]!),
          mesh.getWorldMatrix(),
        );
        const d = Vector3.DistanceSquared(origin, candidate);
        if (d > distance) {
          point = candidate;
          distance = d;
        }
      }
    }
    return point ? { x: point.x, y: point.y, z: point.z } : null;
  }

  /**
   * Limpia todos los recursos del gizmo.
   */
  dispose(): void {
    this.detach();
    this._manager.dispose();
  }
}
