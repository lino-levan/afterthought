import { World } from "./world";
import { Player } from "./player";
import { textures } from "./textures";
import { setServer } from "./server";
import settings from "./settings";
import config from "./config.json";

const guiScale = 8;

export class Gui {
  player?: Player;
  world: World;
  ctx: CanvasRenderingContext2D;
  screen = "title";

  mouse = {
    x: 0,
    y: 0,
    down: false,
    clicked: false,
    released: false,
    scroll: 0,
  };

  keys: Record<string, boolean> = {};

  startFunc = () => {};

  data: Record<string, any> = {};

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;

    document.body.addEventListener("mousemove", (ev) => {
      this.mouse.x = ev.clientX;
      this.mouse.y = ev.clientY;
    });

    document.body.addEventListener("mousedown", (ev) => {
      this.mouse.down = true;
      this.mouse.clicked = true;

      if (settings.fullScreen) {
        document.body.requestFullscreen();
      }
    });

    document.body.addEventListener("mouseup", (ev) => {
      this.mouse.down = false;
      this.mouse.released = true;
    });

    document.body.addEventListener("keydown", (e) => {
      this.keys[e.key] = true;

      e.preventDefault();
    });

    document.body.addEventListener("keyup", (e) => {
      this.keys[e.key] = false;

      e.preventDefault();
    });

    document.addEventListener("wheel", (e) => {
      this.mouse.scroll = e.deltaY;
      e.preventDefault();
    }, { passive: false });
  }

  update() {
    const canvas = this.ctx.canvas;
    const ctx = this.ctx;

    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    switch (this.screen) {
      case "title": {
        ctx.fillStyle = "#ccfffc";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const logo = textures["gui"].images["logo"].image;
        ctx.drawImage(
          logo,
          canvas.width / 2 - (logo.width * guiScale) / 2,
          50,
          logo.width * guiScale,
          logo.height * guiScale,
        );

        const offset = 50 + logo.height * guiScale + 100;

        const grassSide = textures["blocks"].images["grass_side"].image;
        const dirt = textures["blocks"].images["dirt"].image;

        for (let x = 0; x < Math.ceil(canvas.width / (16 * guiScale)); x++) {
          ctx.drawImage(
            grassSide,
            x * 16 * guiScale,
            offset,
            16 * guiScale,
            16 * guiScale,
          );
          for (let y = 1; y < Math.ceil(canvas.height / (16 * guiScale)); y++) {
            ctx.drawImage(
              dirt,
              x * 16 * guiScale,
              y * 16 * guiScale + offset,
              16 * guiScale,
              16 * guiScale,
            );
          }
        }

        this.drawButton(
          "Singleplayer",
          canvas.width / 2,
          canvas.height / 2,
          guiScale / 2,
          () => {
            console.log("singleplayer");

            setServer();

            this.screen = "game";
            this.startFunc();
          },
          {
            width: 15,
          },
        );

        this.drawButton(
          "Multiplayer",
          canvas.width / 2,
          canvas.height / 2 + guiScale * 8,
          guiScale / 2,
          () => {
            this.screen = "multiplayer";
          },
          {
            width: 15,
          },
        );

        this.drawButton(
          "Options...",
          canvas.width / 2,
          canvas.height / 2 + guiScale * 20,
          guiScale / 2,
          () => {
            this.screen = "options";
          },
          {
            width: 15,
          },
        );
        break;
      }

      case "multiplayer": {
        this.drawBackground();

        this.drawText("Play Multiplayer", canvas.width / 2, 50, guiScale / 2, {
          align: "center",
        });

        this.drawServers();

        this.drawButton(
          "Join Server",
          canvas.width / 2 - (guiScale * 55),
          canvas.height - 120,
          guiScale / 2,
          () => {
            setServer(settings.servers[this.data["SERVERS"].selected].ip);

            this.screen = "game";
            this.startFunc();
          },
          {
            width: 17,
            enabled: this.data["SERVERS"].selected != -1,
          },
        );
        this.drawButton(
          "Direct Connection",
          canvas.width / 2,
          canvas.height - 120,
          guiScale / 2,
          () => {
            this.screen = "direct_connect";
          },
          {
            width: 17,
          },
        );
        this.drawButton(
          "Add Server",
          canvas.width / 2 + (guiScale * 55),
          canvas.height - 120,
          guiScale / 2,
          () => {
            this.screen = "edit_server";
          },
          {
            width: 17,
          },
        );
        this.drawButton(
          "Delete",
          canvas.width / 2 - (guiScale * 55),
          canvas.height - 60,
          guiScale / 2,
          () => {
            settings.servers.splice(this.data["SERVERS"].selected, 1);
            this.data["SERVERS"].selected = -1;
            settings.saveSettings();
          },
          {
            width: 17,
            enabled: this.data["SERVERS"].selected != -1,
          },
        );
        this.drawButton(
          "Refresh",
          canvas.width / 2,
          canvas.height - 60,
          guiScale / 2,
          () => {
          },
          {
            width: 17,
          },
        );
        this.drawButton(
          "Cancel",
          canvas.width / 2 + (guiScale * 55),
          canvas.height - 60,
          guiScale / 2,
          () => {
            this.screen = "title";
            this.data["SERVERS"].selected = -1;
          },
          {
            width: 17,
          },
        );

        if (this.keys["Escape"]) {
          this.screen = "title";
          this.data["SERVERS"].selected = -1;
          this.keys["Escape"] = false;
        }
        break;
      }

      case "direct_connect": {
        this.drawBackground();

        this.drawText("Direct Connection", canvas.width / 2, 50, guiScale / 2, {
          align: "center",
        });

        const joinMultiplayer = (ip: string) => {
          console.log("joining server", ip);

          setServer(ip);

          this.screen = "game";
          this.startFunc();
        };

        this.drawText(
          "Server Address",
          canvas.width / 2 -
            ((120 * (guiScale / 2)) + guiScale + guiScale) / 2 +
            6,
          canvas.height / 2 - (guiScale * 6),
          guiScale / 2,
          { align: "left" },
        );

        const textbox = this.drawTextbox(
          "SERVER_ADDRESS",
          canvas.width / 2,
          canvas.height / 2,
          20,
          guiScale / 2,
          {
            callback: (text) => {
              joinMultiplayer(text);
            },
          },
        );

        this.drawButton(
          "Join Server",
          canvas.width / 2,
          canvas.height / 2 + 60,
          guiScale / 2,
          () => {
            joinMultiplayer(textbox.text);
          },
          { width: 20 },
        );

        this.drawButton(
          "Cancel",
          canvas.width / 2,
          canvas.height / 2 + 120,
          guiScale / 2,
          () => {
            this.screen = "multiplayer";
            textbox.text = "";
          },
          { width: 20 },
        );

        if (this.keys["Escape"]) {
          this.screen = "multiplayer";
          textbox.text = "";
          this.keys["Escape"] = false;
        }
        break;
      }

      case "edit_server": {
        this.drawBackground();

        this.drawText("Edit Server Info", canvas.width / 2, 50, guiScale / 2, {
          align: "center",
        });

        this.drawText(
          "Server Name",
          canvas.width / 2 -
            ((120 * (guiScale / 2)) + guiScale + guiScale) / 2 +
            6,
          canvas.height / 2 - (guiScale * 6) - 120,
          guiScale / 2,
          { align: "left" },
        );

        const name = this.drawTextbox(
          "SERVER_NAME",
          canvas.width / 2,
          canvas.height / 2 - 120,
          20,
          guiScale / 2,
        );

        this.drawText(
          "Server Address",
          canvas.width / 2 -
            ((120 * (guiScale / 2)) + guiScale + guiScale) / 2 +
            6,
          canvas.height / 2 - (guiScale * 6),
          guiScale / 2,
          { align: "left" },
        );

        const address = this.drawTextbox(
          "SERVER_ADDRESS",
          canvas.width / 2,
          canvas.height / 2,
          20,
          guiScale / 2,
        );

        this.drawButton(
          "Done",
          canvas.width / 2,
          canvas.height / 2 + 60,
          guiScale / 2,
          () => {
            this.screen = "multiplayer";
            settings.servers.push({
              name: name.text,
              ip: address.text,
            });
            settings.saveSettings();
            address.text = "";
            name.text = "";
          },
          { width: 20 },
        );

        this.drawButton(
          "Cancel",
          canvas.width / 2,
          canvas.height / 2 + 120,
          guiScale / 2,
          () => {
            this.screen = "multiplayer";
            address.text = "";
            name.text = "";
          },
          { width: 20 },
        );

        if (this.keys["Escape"]) {
          this.screen = "multiplayer";
          address.text = "";
          name.text = "";
          this.keys["Escape"] = false;
        }
        break;
      }

      case "options": {
        this.drawBackground();

        this.drawText("Options", canvas.width / 2, 50, guiScale / 2, {
          align: "center",
        });

        this.drawSlider(
          "FOV_SLIDER",
          canvas.width / 2,
          140,
          20,
          guiScale / 2,
          (slider) => {
            settings.fov = Math.round((slider) * 80) + 30;
            settings.saveSettings();
          },
          {
            text: `FOV: ${settings.fov}`,
            defaultSlider: (settings.fov - 30) / 80,
          },
        );

        this.drawSlider(
          "RENDER_DISTANCE_SLIDER",
          canvas.width / 2,
          200,
          20,
          guiScale / 2,
          (slider) => {
            settings.renderDistance = Math.round(slider * 8) + 2;
            settings.saveSettings();
          },
          {
            text: `Render Distance: ${settings.renderDistance}`,
            defaultSlider: (settings.renderDistance - 2) / 8,
          },
        );

        this.drawSlider(
          "MOUSE_SENSITIVITY_SLIDER",
          canvas.width / 2,
          260,
          20,
          guiScale / 2,
          (slider) => {
            settings.mouseSensitivity = Math.round(slider * 20) + 1;
            settings.saveSettings();
          },
          {
            text: `Sensitivity: ${settings.mouseSensitivity}`,
            defaultSlider: (settings.mouseSensitivity - 1) / 20,
          },
        );

        this.drawButton(
          `Fullscreen: ${settings.fullScreen ? "On" : "Off"}`,
          canvas.width / 2,
          320,
          guiScale / 2,
          () => {
            settings.fullScreen = !settings.fullScreen;
            settings.saveSettings();

            if (settings.fullScreen) {
              document.body.requestFullscreen();
            } else {
              document.exitFullscreen();
            }
          },
          {
            width: 20,
          },
        );

        this.drawButton(
          "Done",
          canvas.width / 2,
          440,
          guiScale / 2,
          () => {
            this.screen = "title";
          },
          {
            width: 20,
          },
        );

        if (this.keys["Escape"]) {
          this.screen = "title";
        }
        break;
      }

      case "game": {
        ctx.fillStyle = "white";
        ctx.fillRect(canvas.width / 2 - 1, canvas.height / 2 - 10, 2, 20);
        ctx.fillRect(canvas.width / 2 - 10, canvas.height / 2 - 1, 20, 2);

        this.drawText("Afterthought v0.1.4", 5, 5, guiScale / 4);

        // draw hotbar
        const hotbar_selected = textures["gui"].images["hotbar_selected"].image;
        const hotbar = textures["gui"].images["hotbar"].image;

        ctx.strokeStyle = "#2e222f";
        ctx.lineWidth = guiScale / 2;
        ctx.strokeRect(
          canvas.width / 2 - (9 / 2 * hotbar.width * guiScale / 2) -
            guiScale / 4,
          canvas.height - (hotbar_selected.height * guiScale / 2) -
            guiScale / 2 - guiScale / 4,
          9 * hotbar.width * guiScale / 2 + guiScale / 2,
          hotbar.height * guiScale / 2 + guiScale / 2,
        );

        if (!this.player) break;

        for (let i = 0; i < 9; i++) {
          if (this.player.inventory[i]) {
            // TODO: Generalize this to any block model (?)
            const block_config: { textures: string[]; model: string } =
              config.blocks[this.player.inventory[i]];
            if (
              block_config.model === "all" || block_config.model === "block"
            ) {
              const top_name = block_config.model === "all"
                ? block_config.textures[0]
                : block_config.textures[0];
              const north_name = block_config.model === "all"
                ? block_config.textures[0]
                : block_config.textures[4];
              const west_name = block_config.model === "all"
                ? block_config.textures[0]
                : block_config.textures[2];
              const top_image = textures["blocks"].images[top_name].image;
              const north_image = textures["blocks"].images[north_name].image;
              const west_image = textures["blocks"].images[west_name].image;

              const size = guiScale / 2 * 7.25;
              const diff = guiScale / 3;
              const skew = 0.6;
              // north side
              ctx.save();
              ctx.translate(
                diff + canvas.width / 2 -
                  (9 / 2 * hotbar.width * guiScale / 2) +
                  (i * hotbar.width * guiScale / 2) + guiScale / 2 +
                  guiScale / 2 + guiScale / 2,
                canvas.height - (hotbar_selected.height * guiScale / 2) +
                  guiScale / 2 + guiScale / 2 + size * skew,
              );
              ctx.transform(1, skew, 0, 1, 0, 0);
              ctx.drawImage(north_image, 0, 0, size, size);
              ctx.fillStyle = "rgba(0, 0, 0, 0.1)";
              ctx.fillRect(0, 0, size, size);
              ctx.restore();

              // west side
              ctx.save();
              ctx.translate(
                diff + canvas.width / 2 -
                  (9 / 2 * hotbar.width * guiScale / 2) +
                  (i * hotbar.width * guiScale / 2) + guiScale / 2 +
                  guiScale / 2 + guiScale / 2 + size,
                canvas.height - (hotbar_selected.height * guiScale / 2) +
                  guiScale / 2 + guiScale / 2 + size * (skew * 2),
              );
              ctx.transform(1, -skew, 0, 1, 0, 0);
              ctx.drawImage(west_image, 0, 0, size, size);
              ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
              ctx.fillRect(0, 0, size, size);
              ctx.restore();

              // top side
              ctx.save();
              ctx.translate(
                diff + canvas.width / 2 -
                  (9 / 2 * hotbar.width * guiScale / 2) +
                  (i * hotbar.width * guiScale / 2) + guiScale / 2 +
                  guiScale / 2 + guiScale / 2,
                (canvas.height - (hotbar_selected.height * guiScale / 2) +
                  guiScale / 2 + guiScale / 2 + size * skew) + 1,
              );
              ctx.transform(1, -skew, 1, skew, 0, 0);
              ctx.drawImage(top_image, 0, 0, size, size);
              ctx.restore();
            } else {
              const texture_name = block_config.textures[0];
              const block_image = textures["blocks"].images[texture_name].image;
              ctx.drawImage(
                block_image,
                canvas.width / 2 - (9 / 2 * hotbar.width * guiScale / 2) +
                  (i * hotbar.width * guiScale / 2) + guiScale / 2 +
                  guiScale / 2 + guiScale / 2,
                canvas.height - (hotbar_selected.height * guiScale / 2) +
                  guiScale / 2 + guiScale / 2,
                block_image.width * guiScale / 2,
                block_image.height * guiScale / 2,
              );
            }
          }
          if (this.player.place.selected === i) continue;
          ctx.drawImage(
            hotbar,
            canvas.width / 2 - (9 / 2 * hotbar.width * guiScale / 2) +
              (i * hotbar.width * guiScale / 2),
            canvas.height - (hotbar_selected.height * guiScale / 2) -
              guiScale / 2,
            hotbar.width * guiScale / 2,
            hotbar.height * guiScale / 2,
          );
        }
        for (let i = 0; i < 9; i++) {
          if (this.player.place.selected !== i) continue;
          ctx.strokeRect(
            canvas.width / 2 - (9 / 2 * hotbar.width * guiScale / 2) +
              (i * hotbar.width * guiScale / 2) - guiScale / 2 - guiScale / 4,
            canvas.height - (hotbar_selected.height * guiScale / 2) -
              guiScale / 2 - guiScale / 2 - guiScale / 4,
            hotbar_selected.width * guiScale / 2 + guiScale / 2,
            hotbar_selected.height * guiScale / 2 + guiScale / 2,
          );
          ctx.drawImage(
            hotbar_selected,
            canvas.width / 2 - (9 / 2 * hotbar.width * guiScale / 2) +
              (i * hotbar.width * guiScale / 2) - guiScale / 2,
            canvas.height - (hotbar_selected.height * guiScale / 2) -
              guiScale / 2 - guiScale / 2,
            hotbar_selected.width * guiScale / 2,
            hotbar_selected.height * guiScale / 2,
          );
        }

        // if (this.player.settings.typing) {
        //   ctx.fillStyle = "rgba(0, 0, 0, 0.5)";
        //   ctx.fillRect(
        //     0,
        //     canvas.height - (hotbar_selected.height * guiScale / 2) -
        //       guiScale * 9,
        //     guiScale * 60,
        //     guiScale * 6,
        //   );
        //   const textbox = this.drawTextbox(
        //     "CHAT_BOX",
        //     guiScale * 30,
        //     canvas.height - (hotbar_selected.height * guiScale / 2) -
        //       guiScale * 8,
        //     20,
        //     guiScale / 2,
        //     {
        //       hideBackground: true,
        //       callback: (text, textbox) => {
        //         alert(text);
        //         this.player.settings.typing = false;
        //         textbox.text = "";
        //       },
        //     },
        //   );
        //   textbox.selected = true;
        // }
        break;
      }

      default:
        throw "Invalid Screen State";
    }

    this.mouse.clicked = false;
    this.mouse.released = false;
    this.mouse.scroll = 0;
  }

  async start(): Promise<void> {
    const gui = this;
    return new Promise((resolve) => {
      gui.startFunc = resolve;
    });
  }

  drawText(
    text: string,
    x: number,
    y: number,
    scale: number,
    options?: { align?: "left" | "center" | "right"; color?: string },
  ) {
    const { align } = Object.assign({ align: "left", color: "white" }, options);

    const ctx = this.ctx;

    const alphabetText =
      "⚠abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.:/-_~!?#[]@$&'()*+,;%=^`{}|\\\"<> "
        .split("");
    const alphabet = textures["gui"].images["alphabet"].image;

    for (let i = 0; i < text.length; i++) {
      const letter = text[i];
      const imageIndex = Math.max(
        alphabetText.findIndex((val) => val === letter),
        0,
      );
      switch (align) {
        case "left": {
          ctx.drawImage(
            alphabet,
            6 * imageIndex,
            0,
            5,
            alphabet.height,
            x + (6 * i * scale),
            y,
            5 * scale,
            alphabet.height * scale,
          );
          break;
        }
        case "right": {
          ctx.drawImage(
            alphabet,
            6 * imageIndex,
            0,
            5,
            alphabet.height,
            x + (6 * i * scale) - (6 * text.length * scale) + scale,
            y,
            5 * scale,
            alphabet.height * scale,
          );
          break;
        }

        case "center": {
          ctx.drawImage(
            alphabet,
            6 * imageIndex,
            0,
            5,
            alphabet.height,
            x + (6 * i * scale) - ((6 * text.length * scale) + scale) / 2,
            y,
            5 * scale,
            alphabet.height * scale,
          );
          break;
        }
      }
    }
  }

  drawButton(
    text: string,
    x: number,
    y: number,
    scale: number,
    callback: () => void,
    options?: {
      width?: number;
      enabled?: boolean;
    },
  ) {
    const ctx = this.ctx;
    const mouseX = this.mouse.x;
    const mouseY = this.mouse.y;

    const width = (options?.width || text.length) * 6;
    const enabled = options?.enabled ?? true;

    if (
      mouseX >
        x - (width * scale + scale + (scale * 2)) / 2 - (scale * 2) &&
      mouseX <
        x - (width * scale + scale + (scale * 2)) / 2 - (scale * 2) +
          width * scale + (scale * 4) &&
      mouseY > y - (scale * 3) &&
      mouseY < y - (scale * 3) + scale * 14 &&
      enabled
    ) {
      ctx.fillStyle = "white";

      if (this.mouse.clicked) {
        callback();
      }
    } else {
      ctx.fillStyle = "black";
    }

    ctx.fillRect(
      x - (width * scale + scale + (scale * 2)) / 2 - (scale * 2),
      y - (scale * 3),
      width * scale + (scale * 4),
      scale * 14,
    );
    ctx.fillStyle = enabled ? "#997799" : "#664466";
    ctx.fillRect(
      x - (width * scale + scale + (scale * 2)) / 2 - scale,
      y,
      width * scale + (scale * 2),
      scale * 10,
    );
    ctx.fillStyle = enabled ? "#ffeeff" : "#998899";
    ctx.fillRect(
      x - (width * scale + scale + (scale * 2)) / 2 - scale,
      y - (scale * 2),
      width * scale + (scale * 2),
      scale * 11,
    );
    ctx.fillStyle = enabled ? "#bbaabb" : "#666666";
    ctx.fillRect(
      x - (width * scale + scale + (scale * 2)) / 2,
      y - scale,
      width * scale - scale + (scale * 2),
      scale * 10,
    );

    this.drawText(text, x, y, scale, { align: "center" });
  }

  drawTextbox(
    id: string,
    x: number,
    y: number,
    width: number,
    scale: number,
    options?: {
      callback?: (text: string, textbox: {
        text: string;
        selected: boolean;
        cursorPosition: number;
        blinkTimer: number;
        show: boolean;
      }) => void;
      hideBackground?: boolean;
    },
  ): {
    text: string;
    selected: boolean;
    cursorPosition: number;
    blinkTimer: number;
    show: boolean;
  } {
    if (!this.data.hasOwnProperty(id)) {
      this.data[id] = {
        text: "",
        selected: false,
        cursorPosition: 0,
        blinkTimer: 0,
        show: true,
      };
    }

    const ctx = this.ctx;
    const mouseX = this.mouse.x;
    const mouseY = this.mouse.y;

    if (this.mouse.clicked) {
      if (
        mouseX > x - (width * 6 * scale + scale + (scale * 4)) / 2 &&
        mouseX <
          x - (width * 6 * scale + scale + (scale * 4)) / 2 +
            width * 6 * scale - scale + (scale * 4) &&
        mouseY > y - (scale * 2) &&
        mouseY < y - (scale * 2) + scale * 12
      ) {
        this.data[id].selected = true;

        this.data[id].show = false;
        this.data[id].blinkTimer = 0;
      } else {
        this.data[id].selected = false;
      }
    }

    if (!options?.hideBackground) {
      ctx.fillStyle = this.data[id].selected ? "#ffffff" : "#dddddd";
      ctx.fillRect(
        x - (width * 6 * scale + scale + (scale * 4)) / 2,
        y - (scale * 2),
        width * 6 * scale - scale + (scale * 4),
        scale * 12,
      );
      ctx.fillStyle = "black";
      ctx.fillRect(
        x - (width * 6 * scale + scale + (scale * 2)) / 2,
        y - scale,
        width * 6 * scale - scale + (scale * 2),
        scale * 10,
      );
    }

    if (this.data[id].selected) {
      let pressedKeys = Object.entries(this.keys).filter((v) => v[1]).map((v) =>
        v[0]
      );

      pressedKeys.forEach((key) => {
        this.keys[key] = false;

        if (key === "Enter") {
          return options?.callback
            ? options.callback(this.data[id].text, this.data[id])
            : undefined;
        }
        if (key === "Escape") {
          this.data[id].selected = false;
          return;
        }
        if (key === "Backspace") {
          this.data[id].text = this.data[id].text.slice(0, -1);
          return;
        }
        if (key.length > 1) return;

        this.data[id].text += key;
      });

      this.data[id].cursorPosition = Math.min(
        this.data[id].text.length,
        width - 1,
      );

      this.drawText(
        this.data[id].text.slice(-width + 1),
        x - (width * 6 * scale + scale + (scale * 2)) / 2 + 6,
        y,
        scale,
        { align: "left" },
      );

      this.data[id].blinkTimer--;

      if (this.data[id].blinkTimer < 0) {
        this.data[id].blinkTimer = 60;
        this.data[id].show = !this.data[id].show;
      }

      if (this.data[id].show) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(
          x - (width * 6 * scale + scale + (scale * 2)) / 2 + 6 +
            (6 * scale * this.data[id].cursorPosition),
          y,
          4,
          scale * 8,
        );
      }
    } else {
      this.drawText(
        this.data[id].text.slice(0, width - 1),
        x - (width * 6 * scale + scale + (scale * 2)) / 2 + 6,
        y,
        scale,
        { align: "left" },
      );
    }

    return this.data[id];
  }

  drawSlider(
    id: string,
    x: number,
    y: number,
    width: number,
    scale: number,
    callback: (slider: number) => void,
    options?: {
      defaultSlider?: number;
      text?: string;
    },
  ) {
    if (!this.data.hasOwnProperty(id)) {
      this.data[id] = {
        slider: options?.defaultSlider || 0,
        selected: false,
      };
    }

    const t = this.data[id];

    const ctx = this.ctx;
    const mouseX = this.mouse.x;
    const mouseY = this.mouse.y;
    const minX = x - (width * 6 * scale + scale + (scale * 4)) / 2;
    const maxX = minX + width * 6 * scale - scale + (scale * 4);

    if (this.mouse.clicked) {
      if (
        mouseX > minX &&
        mouseX < maxX &&
        mouseY > y - (scale * 2) &&
        mouseY < y - (scale * 2) + scale * 12
      ) {
        t.selected = true;
      }
    }

    if (!this.mouse.down) {
      t.selected = false;
    }

    if (t.selected) {
      t.slider = (Math.max(Math.min(mouseX, maxX), minX) - minX) /
        (maxX - minX);

      callback(t.slider);
    }

    ctx.fillStyle = "black";
    ctx.fillRect(
      x - (width * 6 * scale + scale + (scale * 4)) / 2,
      y - (scale * 2),
      width * 6 * scale - scale + (scale * 4),
      scale * 12,
    );
    ctx.fillStyle = "#333333";
    ctx.fillRect(
      x - (width * 6 * scale + scale + (scale * 2)) / 2,
      y - scale,
      width * 6 * scale - scale + (scale * 2),
      scale * 10,
    );

    // outline
    ctx.fillStyle = t.selected ? "#dddddd" : "black";
    ctx.fillRect(
      minX + (t.slider * (maxX - minX - (scale * 7))),
      y - (scale * 2),
      width + (scale * 2),
      scale * 12,
    );

    // top outline
    ctx.fillStyle = "#ffeeff";
    ctx.fillRect(
      minX + (scale) + (t.slider * (maxX - minX - (scale * 7))),
      y - scale,
      width,
      scale * 10,
    );

    // main center block
    ctx.fillStyle = "#bbaabb";
    ctx.fillRect(
      minX + (scale * 2) + (t.slider * (maxX - minX - (scale * 7))),
      y,
      width - scale,
      scale * 8,
    );

    // bottom line
    ctx.fillStyle = "#997799";
    ctx.fillRect(
      minX + (scale) + (t.slider * (maxX - minX - (scale * 7))),
      y + (scale * 8),
      width,
      scale,
    );

    if (options?.text) {
      this.drawText(options.text, x, y, scale, { align: "center" });
    }

    return t;
  }

  drawBackground() {
    const ctx = this.ctx;
    const canvas = ctx.canvas;
    const grassSide = textures["blocks"].images["grass_side"].image;
    const dirt = textures["blocks"].images["dirt"].image;

    for (let x = 0; x < Math.ceil(canvas.width / (16 * guiScale)); x++) {
      ctx.drawImage(
        grassSide,
        x * 16 * guiScale,
        0,
        16 * guiScale,
        16 * guiScale,
      );
      for (let y = 1; y < Math.ceil(canvas.height / (16 * guiScale)); y++) {
        ctx.drawImage(
          dirt,
          x * 16 * guiScale,
          y * 16 * guiScale,
          16 * guiScale,
          16 * guiScale,
        );
      }
    }
  }

  drawServers() {
    if (!this.data.hasOwnProperty("SERVERS")) {
      this.data["SERVERS"] = {
        scroll: 0,
        selected: -1,
      };
    }

    const ctx = this.ctx;
    const canvas = ctx.canvas;
    const mouseX = this.mouse.x;
    const mouseY = this.mouse.y;

    this.data["SERVERS"].scroll += this.mouse.scroll;
    if (this.data["SERVERS"].scroll < 0) this.data["SERVERS"].scroll = 0;
    if (this.data["SERVERS"].scroll > settings.servers.length * 110 - 110) {
      this.data["SERVERS"].scroll = settings.servers.length * 110 - 110;
    }

    const startY = 50 + guiScale * 6;
    const endY = startY + canvas.height - 250;

    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(0, startY, canvas.width, endY - startY);

    ctx.save();
    ctx.translate(0, 50 + guiScale * 6 - this.data["SERVERS"].scroll);
    for (const [i, server] of settings.servers.entries()) {
      ctx.lineWidth = guiScale / 2;
      ctx.strokeStyle = "#aaaaaa";

      if (startY + 110 + (i * 110) - this.data["SERVERS"].scroll > endY) {
        continue;
      }
      if (startY + 10 + (i * 110) - this.data["SERVERS"].scroll < startY) {
        continue;
      }
      if (i === this.data["SERVERS"].selected) ctx.strokeStyle = "white";

      ctx.strokeRect(10, 10 + (i * 110), canvas.width - 20, 100);
      this.drawText(server.name, 20, 20 + (i * 110), guiScale / 2);
      this.drawText(
        server.ip,
        canvas.width - 20,
        20 + (i * 110),
        guiScale / 2,
        { align: "right" },
      );

      ctx.lineWidth = 1;
      ctx.strokeStyle = "black";

      // select code
      if (
        mouseX > 10 &&
        mouseX < canvas.width - 10 &&
        mouseY > startY + 10 + (i * 110) - this.data["SERVERS"].scroll &&
        mouseY < startY + 110 + (i * 110) - this.data["SERVERS"].scroll
      ) {
        if (this.mouse.clicked) {
          this.data["SERVERS"].selected = i;
        }
      }
    }
    ctx.restore();
  }
}
