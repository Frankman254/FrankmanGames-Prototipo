// TransformGizmo — gizmos 3D de Babylon.js para mover, girar y escalar objetos
// en el viewport del editor. Usa GizmoManager con PositionGizmo, RotationGizmo
// y ScaleGizmo, con snap y callbacks que actualizan el documento del editor.
import {
  GizmoManager,
  PositionGizmo,
  RotationGizmo,
  ScaleGizmo,
  TransformNode,
  Vector3,
  Color3,
  MeshBuilder,
  StandardMaterial,
  type Scene,
  type AbstractMesh,
  type TargetCamera,
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

  constructor(scene: Scene, obj: EditorObject, color: Color3) {
    const g = this.groundY(obj);
    this.node = new TransformNode(`gizmo_proxy_${obj.key}`, scene);
    this.node.position.set(obj.x, g, obj.y);
    if (obj.rotDeg) this.node.rotation.y = obj.rotDeg * DEG;

    // Caja visual que representa el objeto
    const shape = obj.shape;
    let w = 0.8, d = 0.8, h = 1.0;
    if (shape.type === 'box') { w = shape.w; d = shape.d; h = shape.h; }
    else if (shape.type === 'cyl') { w = shape.r * 2; d = shape.r * 2; h = shape.h; }

    this.box = MeshBuilder.CreateBox(`gizmo_box_${obj.key}`, { size: 0.7 }, scene);
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
    // Para dungeons el suelo está en Y=0; para overworld se calcula desde heights
    // Aquí usamos 0 como base y el gizmo se ajusta
    const shape = obj.shape;
    let h = 1.0;
    if (shape.type === 'box') h = shape.h;
    else if (shape.type === 'cyl') h = shape.h;
    return -h + 0.1; // Un poco hundido para que la base esté en el suelo
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
  private _dragStartScale: number = 1;

  constructor(
    private readonly _scene: Scene,
    private readonly _camera: TargetCamera,
    private readonly _callbacks: GizmoCallbacks,
  ) {
    // Crear GizmoManager
    this._manager = new GizmoManager(_scene, 0.06);
    this._manager.usePointerToAttachGizmos = false; // Control manual
    this._manager.enableAutoPicking = false;
    this._manager.clearGizmoOnEmptyPointerEvent = false;

    // Configurar gizmos individuales con snap
    if (this._manager.gizmos.positionGizmo) {
      this._manager.gizmos.positionGizmo.snapDistance = this.snapDistance;
    }
    if (this._manager.gizmos.rotationGizmo) {
      this._manager.gizmos.rotationGizmo.snapDistance = this.snapRotation;
    }

    // Observables de arrastre
    this._setupDragObservables();
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
          this._dragStartScale = this._proxy.node.scaling.x;
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
    const currentScale = this._proxy.node.scaling.x;
    // Snap a 0.1
    const snappedScale = Math.round(currentScale / this.snapScale) * this.snapScale;
    const factor = snappedScale / this._dragStartScale;
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

    this._proxy = new EditorObjectProxy(this._scene, obj, color);
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
    if (obj.rotDeg) {
      this._proxy.node.rotation.y = obj.rotDeg * DEG;
    }
  }

  /**
   * Devuelve true si el gizmo está arrastrando actualmente.
   */
  get isDragging(): boolean {
    return this._dragging;
  }

  /**
   * Devuelve la clave del objeto actualmente adjunto.
   */
  get attachedKey(): string | null {
    return this._currentKey;
  }

  /**
   * Limpia todos los recursos del gizmo.
   */
  dispose(): void {
    this.detach();
    this._manager.dispose();
  }
}
