import { World } from "./world";
import { Player } from "./player";
import { textures } from "./textures";
import { setServer } from "./server";

const guiScale = 8;

export class Gui {
  player: Player;
  world: World;
  ctx: CanvasRenderingContext2D;
  screen = "title";

  mouse = {
    x: 0,
    y: 0,
    down: false,
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
    });

    document.body.addEventListener("mouseup", (ev) => {
      this.mouse.down = false;
    });

    document.body.addEventListener("keydown", (e) => {
      this.keys[e.key] = true;

      e.preventDefault();
    });

    document.body.addEventListener("keyup", (e) => {
      this.keys[e.key] = false;

      e.preventDefault();
    });
  }

  update() {
    const canvas = this.ctx.canvas;
    const ctx = this.ctx;

    ctx.imageSmoothingEnabled = false;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (this.screen === "title") {
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

      this.renderButton(
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
      );
      this.renderButton(
        "Multiplayer",
        canvas.width / 2,
        canvas.height / 2 + guiScale * 8,
        guiScale / 2,
        () => {
          this.screen = "multiplayer";
        },
      );

      return;
    }

    if (this.screen === "multiplayer") {
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

      const joinMultiplayer = (ip: string) => {
        console.log("joining server", ip);

        setServer(ip);

        this.screen = "game";
        this.startFunc();
      };

      this.renderText(
        "Server Address",
        canvas.width / 2 - ((120 * (guiScale / 2)) + guiScale + guiScale) / 2 +
          6,
        canvas.height / 2 - (guiScale * 6),
        guiScale / 2,
        { align: "left" },
      );

      let text = this.renderTextbox(
        "SERVER_ADDRESS",
        canvas.width / 2,
        canvas.height / 2,
        20,
        guiScale / 2,
        (text) => {
          joinMultiplayer(text);
        },
      );
    }

    if (this.screen === "game") {
      ctx.fillStyle = "white";
      ctx.fillRect(canvas.width / 2 - 1, canvas.height / 2 - 10, 2, 20);
      ctx.fillRect(canvas.width / 2 - 10, canvas.height / 2 - 1, 20, 2);

      this.renderText("Afterthought v0.1.1", 5, 5, guiScale / 4);

      // TODO: Hotbar
      // for(let i = 0; i < 9; i++) {
      //   ctx.strokeStyle = "#aaaaaa"
      //   ctx.strokeRect(canvas.width/2 - (9/2 * 70) + (i * 70), canvas.height - 90, 70, 70)
      // }
    }
  }

  async start(): Promise<void> {
    const gui = this;
    return new Promise((resolve) => {
      gui.startFunc = resolve;
    });
  }

  renderText(
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

  renderButton(
    text: string,
    x: number,
    y: number,
    scale: number,
    callback: () => void,
  ) {
    const ctx = this.ctx;
    const mouseX = this.mouse.x;
    const mouseY = this.mouse.y;

    if (
      mouseX >
        x - (text.length * 6 * scale + scale + (scale * 2)) / 2 - (scale * 2) &&
      mouseX <
        x - (text.length * 6 * scale + scale + (scale * 2)) / 2 - (scale * 2) +
          text.length * 6 * scale + (scale * 4) &&
      mouseY > y - (scale * 3) &&
      mouseY < y - (scale * 3) + scale * 14
    ) {
      ctx.fillStyle = "white";

      if (this.mouse.down) {
        callback();
        this.mouse.down = false;
      }
    } else {
      ctx.fillStyle = "black";
    }

    ctx.fillRect(
      x - (text.length * 6 * scale + scale + (scale * 2)) / 2 - (scale * 2),
      y - (scale * 3),
      text.length * 6 * scale + (scale * 4),
      scale * 14,
    );
    ctx.fillStyle = "#997799";
    ctx.fillRect(
      x - (text.length * 6 * scale + scale + (scale * 2)) / 2 - scale,
      y,
      text.length * 6 * scale + (scale * 2),
      scale * 10,
    );
    ctx.fillStyle = "#ffeeff";
    ctx.fillRect(
      x - (text.length * 6 * scale + scale + (scale * 2)) / 2 - scale,
      y - (scale * 2),
      text.length * 6 * scale + (scale * 2),
      scale * 11,
    );
    ctx.fillStyle = "#bbaabb";
    ctx.fillRect(
      x - (text.length * 6 * scale + scale + (scale * 2)) / 2,
      y - scale,
      text.length * 6 * scale - scale + (scale * 2),
      scale * 10,
    );

    this.renderText(text, x, y, scale, { align: "center" });
  }

  renderTextbox(
    id: string,
    x: number,
    y: number,
    width: number,
    scale: number,
    callback: (text: string) => void,
  ) {
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

    if (this.mouse.down) {
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

    if (this.data[id].selected) {
      let pressedKeys = Object.entries(this.keys).filter((v) => v[1]).map((v) =>
        v[0]
      );

      pressedKeys.forEach((key) => {
        this.keys[key] = false;

        if (key === "Enter") return callback(this.data[id].text);
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

      this.renderText(
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
      this.renderText(
        this.data[id].text.slice(0, width - 1),
        x - (width * 6 * scale + scale + (scale * 2)) / 2 + 6,
        y,
        scale,
        { align: "left" },
      );
    }

    return this.data[id].text;
  }
}
