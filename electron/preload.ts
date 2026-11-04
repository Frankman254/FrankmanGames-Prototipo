// Puente mínimo entre el juego y la ventana: sólo pedir un tamaño de la lista.
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('frankmanDesktop', {
  setWindowSize: (width: number, height: number): void => ipcRenderer.send('window:size', width, height),
});
