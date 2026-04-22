const MODULE_ID = "sharrku-spotlight-actor";
const SOCKET_EVENT = `module.${MODULE_ID}`;
const OVERLAY_ID = `${MODULE_ID}-overlay`;

class SharrkuSpotlightActor {
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
    return {
      action: "show",
      actorId: actor?.id ?? null,
      image: options.image || this.getActorImage(actor),
      name: options.name ?? actor?.name ?? game.i18n.localize(`${MODULE_ID}.UnknownActor`),
      subtitle: options.subtitle ?? "",
      showName: options.showName ?? true,
      side: options.side === "left" ? "left" : "right",
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

  static showForSelectedToken(options = {}) {
    const actor = this.getSelectedActor();
    if (!actor) {
      ui.notifications?.warn(game.i18n.localize(`${MODULE_ID}.NoTokenSelected`));
      return;
    }
    this.showForActor(actor, options);
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

  static renderOverlay({ image, name, subtitle = "", showName = true, side = "right" }) {
    this.removeOverlay();

    const safeName = foundry.utils.escapeHTML(showName ? name : "Portrait");
    const safeSubtitle = subtitle ? foundry.utils.escapeHTML(subtitle) : "";

    const overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.classList.add(MODULE_ID, `is-${side}`);
    overlay.innerHTML = `
      <div class="ssa-backdrop"></div>
      <div class="ssa-stage">
        <button type="button" class="ssa-close" aria-label="Close">×</button>
        <div class="ssa-panel">
          <div class="ssa-image-wrap">
            <img class="ssa-image" src="${image}" alt="${safeName}">
          </div>
          ${showName ? `
            <div class="ssa-caption">
              <div class="ssa-name">${safeName}</div>
              ${safeSubtitle ? `<div class="ssa-subtitle">${safeSubtitle}</div>` : ""}
            </div>
          ` : ""}
        </div>
      </div>
    `;

    overlay.querySelector(".ssa-backdrop")?.addEventListener("click", () => this.hide());
    overlay.querySelector(".ssa-close")?.addEventListener("click", () => this.hide());
    overlay.addEventListener("contextmenu", (event) => {
      event.preventDefault();
      this.hide();
    });

    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("is-visible"));
  }

  static removeOverlay() {
    const existing = document.getElementById(OVERLAY_ID);
    if (!existing) return;
    existing.remove();
  }
}

Hooks.once("init", () => {
  SharrkuSpotlightActor.init();

  game.modules.get(MODULE_ID).api = {
    showForActor: (actor, options = {}) => SharrkuSpotlightActor.showForActor(actor, options),
    showForSelectedToken: (options = {}) => SharrkuSpotlightActor.showForSelectedToken(options),
    hide: () => SharrkuSpotlightActor.hide()
  };
});

Hooks.on("getActorDirectoryEntryContext", (_html, contextOptions) => {
  contextOptions.push({
    name: game.i18n.localize(`${MODULE_ID}.ContextShowPortraitRight`),
    icon: '<i class="fas fa-images"></i>',
    condition: (li) => !!game.actors?.get(li?.data("entryId")),
    callback: (li) => {
      const actor = game.actors?.get(li?.data("entryId"));
      SharrkuSpotlightActor.showForActor(actor, { side: "right" });
    }
  });

  contextOptions.push({
    name: game.i18n.localize(`${MODULE_ID}.ContextShowPortraitLeft`),
    icon: '<i class="fas fa-images"></i>',
    condition: (li) => !!game.actors?.get(li?.data("entryId")),
    callback: (li) => {
      const actor = game.actors?.get(li?.data("entryId"));
      SharrkuSpotlightActor.showForActor(actor, { side: "left" });
    }
  });
});

Hooks.on("getActorSheetHeaderButtons", (sheet, buttons) => {
  buttons.unshift({
    label: game.i18n.localize(`${MODULE_ID}.HeaderButtonRight`),
    class: "sharrku-spotlight-actor-show-right",
    icon: "fas fa-right-long",
    onclick: () => SharrkuSpotlightActor.showForActor(sheet.actor, { side: "right" })
  });

  buttons.unshift({
    label: game.i18n.localize(`${MODULE_ID}.HeaderButtonLeft`),
    class: "sharrku-spotlight-actor-show-left",
    icon: "fas fa-left-long",
    onclick: () => SharrkuSpotlightActor.showForActor(sheet.actor, { side: "left" })
  });
});

Hooks.on("getSceneControlButtons", (controls) => {
  controls.push({
    name: MODULE_ID,
    title: game.i18n.localize(`${MODULE_ID}.ControlsTitle`),
    icon: "fas fa-images",
    layer: "tokens",
    tools: [
      {
        name: "show-selected-right",
        title: game.i18n.localize(`${MODULE_ID}.ToolShowSelectedRight`),
        icon: "fas fa-right-long",
        button: true,
        onClick: () => SharrkuSpotlightActor.showForSelectedToken({ side: "right" })
      },
      {
        name: "show-selected-left",
        title: game.i18n.localize(`${MODULE_ID}.ToolShowSelectedLeft`),
        icon: "fas fa-left-long",
        button: true,
        onClick: () => SharrkuSpotlightActor.showForSelectedToken({ side: "left" })
      },
      {
        name: "hide-overlay",
        title: game.i18n.localize(`${MODULE_ID}.ToolHideOverlay`),
        icon: "fas fa-eye-slash",
        button: true,
        onClick: () => SharrkuSpotlightActor.hide()
      }
    ]
  });
});
