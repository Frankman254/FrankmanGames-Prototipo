// Puente mínimo entre el juego y la ventana: sólo pedir un tamaño de la lista.
import { contextBridge, ipcRenderer } from 'electron';

const desktopBridge = {
    setFullScreen: (on: boolean): void => ipcRenderer.send('window:fullscreen', on === true),
    isFullScreen: (): Promise<boolean> => ipcRenderer.invoke('window:isfullscreen'),
    setWindowSize: (width: number, height: number): void => ipcRenderer.send('window:size', width, height),
};

if (process.env['VITE_DEV_SERVER_URL']) {
    Object.assign(desktopBridge, {
        setWindowStateForQa: (
            state: 'minimized' | 'normal' | 'status',
        ): Promise<{ minimized: boolean; visible: boolean; focused: boolean } | null> =>
            ipcRenderer.invoke('qa:window-state', state),
    });
}

contextBridge.exposeInMainWorld('frankmanDesktop', desktopBridge);
