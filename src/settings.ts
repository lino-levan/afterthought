class Settings {
  fov: number;
  renderDistance: number;
  fullScreen: boolean;
  servers: { name: string; ip: string }[];
  mouseSensitivity: number;

  constructor() {
    this.fov = parseInt(localStorage.getItem("fov") || "60");
    this.renderDistance = parseInt(
      localStorage.getItem("renderDistance") || "3",
    );
    this.fullScreen = localStorage.getItem("fullScreen") === "true";
    this.servers = JSON.parse(localStorage.getItem("servers") || "[]");
    this.mouseSensitivity = parseInt(
      localStorage.getItem("mouseSensitivity") || "10",
    );
  }

  saveSettings() {
    localStorage.setItem("fov", this.fov.toString());
    localStorage.setItem("renderDistance", this.renderDistance.toString());
    localStorage.setItem("fullScreen", this.fullScreen.toString());
    localStorage.setItem("servers", JSON.stringify(this.servers));
    localStorage.setItem("mouseSensitivity", this.mouseSensitivity.toString());
  }
}

const settings = new Settings();

export default settings;
