export const CAMERA_MODES = ['follow', 'autoFocus', 'smart', 'zone'] as const;
export type CameraMode = (typeof CAMERA_MODES)[number];

export interface CameraPose { yawDeg: number; pitchDeg: number; distance: number }
export interface CameraPoint { x: number; y: number; z: number }
export interface CameraThreat { x: number; z: number; radius?: number }

export interface CameraTuning {
  followDamping: number;
  rotationDamping: number;
  zoomDamping: number;
  smartTurnRateDeg: number;
  manualPauseSeconds: number;
  zoneCellSize: number;
}

export const DEFAULT_CAMERA_TUNING: CameraTuning = {
  followDamping: 8,
  rotationDamping: 7,
  zoomDamping: 8,
  smartTurnRateDeg: 32,
  manualPauseSeconds: 2.5,
  zoneCellSize: 32,
};
