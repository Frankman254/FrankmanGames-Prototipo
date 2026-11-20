// Puente mínimo entre el juego y la ventana: sólo pedir un tamaño de la lista.
import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('frankmanDesktop', {
    setFullScreen: (on: boolean): void => ipcRenderer.send('window:fullscreen', on === true),
    isFullScreen: (): Promise<boolean> => ipcRenderer.invoke('window:isfullscreen'),
    setWindowSize: (width: number, height: number): void => ipcRenderer.send('window:size', width, height),
});
