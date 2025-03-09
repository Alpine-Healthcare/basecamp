import { BrowserWindow } from "electron";

export let CommInstance: Comm;
export class Comm {
  private mainWindow: BrowserWindow

  constructor(mainWindow: BrowserWindow) {
    this.mainWindow = mainWindow
    CommInstance = this
  }

  send(message: string, type: string = "compute-log") {
    this.mainWindow.webContents.send(type, message)
  }

    
}