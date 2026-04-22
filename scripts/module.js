const MODULE_ID = "spotlight-portraits";
const SOCKET_EVENT = `module.${MODULE_ID}`;
const OVERLAY_ID = `${MODULE_ID}-overlay`;

class SpotlightPortraits {
  static init() {
    game.socket.on(SOCKET_EVENT, (payload) => this._onSocketMessage(payload));

    game.keybindings.register(MODULE_ID, "showSelectedTokenPortrait", {
      name: "Show selected token portrait",
      hint: "Displays the portrait artwork for the first selected token actor on all connected clients.",
      editable: [{ key: "KeyP", modifiers: ["Shift"] }],
      restricted: false,
      onDown: () => {
        this.showForSelectedToken();
        return true;
      }
    });
  }

  static getSelectedActor() {
    const token = canvas?.tokens?.controlled?.[0];
    return token?.actor ?? null;
  }

  static getActorImage(actor) {
    return actor?.img || actor?.prototypeToken?.texture?.src || "icons/svg/mystery-man.svg";
  }

  static buildPayload(actor, options = {}) {
    const image = options.image || this.getActorImage(actor);
    const name = options.name ?? actor?.name ?? game.i18n.localize(`${MODULE_ID}.UnknownActor`);

    return {
      action: "show",
      actorId: actor?.id ?? null,
      image,
      name,
      subtitle: options.subtitle ?? "",
      showName: options.showName ?? true,
      showTo: options.showTo ?? "all",
      timestamp: Date.now()
    };
  }

  static showForActor(actor, options = {}) {
    if (!actor) {
      ui.notifications?.warn(game.i18n.localize(`${MODULE_ID}.NoActor`));
      return;
    }

    const payload = this.buildPayload(actor, options);
    game.socket.emit(SOCKET_EVENT, payload);
    this._onSocketMessage(payload);
  }

  static showForSelectedToken() {
    const actor = this.getSelectedActor();
    if (!actor) {
      ui.notifications?.warn(game.i18n.localize(`${MODULE_ID}.NoTokenSelected`));
      return;
    }
    this.showForActor(actor);
  }

  static hide() {
    const payload = { action: "hide", timestamp: Date.now() };
    game.socket.emit(SOCKET_EVENT, payload);
    this._onSocketMessage(payload);
  }

  static _onSocketMessage(payload) {
    if (!payload || typeof payload !== "object") return;
    if (payload.action === "show") this.renderOverlay(payload);
    if (payload.action === "hide") this.removeOverlay();
  }

  static renderOverlay({ image, name, subtitle = "", showName = true }) {
    this.removeOverlay();

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.classList.add(MODULE_ID);
    overlay.innerHTML = `
      <div class="sp-backdrop"></div>
      <div class="sp-stage">
        <button type="button" class="sp-close" aria-label="Close">×</button>
        <div class="sp-card">
          <img class="sp-image" src="${image}" alt="${showName ? foundry.utils.escapeHTML(name) : "Portrait"}">
          ${showName ? `
            <div class="sp-caption">
              <div class="sp-name">${foundry.utils.escapeHTML(name)}</div>
              ${subtitle ? `<div class="sp-subtitle">${foundry.utils.escapeHTML(subtitle)}</div>` : ""}
            </div>
          ` : ""}
        </div>
      </div>
    `;

    overlay.querySelector(".sp-backdrop")?.addEventListener("click", () => this.hide());
    overlay.querySelector(".sp-close")?.addEventListener("click", () => this.hide());
    overlay.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      this.hide();
    });

    document.body.appendChild(overlay);
  }

  static removeOverlay() {
    document.getElementById(OVERLAY_ID)?.remove();
  }
}

Hooks.once("init", () => {
  SpotlightPortraits.init();

  game.modules.get(MODULE_ID).api = {
    showForActor: (actor, options = {}) => SpotlightPortraits.showForActor(actor, options),
    showForSelectedToken: () => SpotlightPortraits.showForSelectedToken(),
    hide: () => SpotlightPortraits.hide()
  };
});

Hooks.on("getActorDirectoryEntryContext", (_html, contextOptions) => {
  contextOptions.push({
    name: game.i18n.localize(`${MODULE_ID}.ContextShowPortrait`),
    icon: '<i class="fas fa-image"></i>',
    condition: (li) => {
      const actor = game.actors?.get(li?.data("entryId"));
      return !!actor;
    },
    callback: (li) => {
      const actor = game.actors?.get(li?.data("entryId"));
      SpotlightPortraits.showForActor(actor);
    }
  });
});

Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
  buttons.unshift({
    label: game.i18n.localize(`${MODULE_ID}.HeaderButton`),
    class: "spotlight-portraits-show",
    icon: "fas fa-image-portrait",
    onclick: () => SpotlightPortraits.showForActor(sheet.actor)
  });
});

Hooks.on("getSceneControlButtons", (controls) => {
  controls.push({
    name: MODULE_ID,
    title: game.i18n.localize(`${MODULE_ID}.ControlsTitle`),
    icon: "fas fa-image",
    layer: "tokens",
    tools: [
      {
        name: "show-selected",
        title: game.i18n.localize(`${MODULE_ID}.ToolShowSelected`),
        icon: "fas fa-user-large",
        button: true,
        onClick: () => SpotlightPortraits.showForSelectedToken()
      },
      {
        name: "hide-overlay",
        title: game.i18n.localize(`${MODULE_ID}.ToolHideOverlay`),
        icon: "fas fa-eye-slash",
        button: true,
        onClick: () => SpotlightPortraits.hide()
      }
    ]
  });
});
