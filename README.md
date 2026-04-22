# Spotlight Portraits

A lightweight Foundry VTT module for bringing NPC and player artwork to the foreground with a full-screen portrait overlay.

## Features

- Show portraits from the **Actor Directory** context menu
- Show portraits from an **Actor Sheet** header button
- Show or hide portraits from a **Scene Control** tool
- Broadcasts to **all connected clients** via Foundry socket messaging
- Works with the actor portrait image (`actor.img`), with token texture as fallback

## Installation

Copy this folder into your Foundry user data:

`Data/modules/spotlight-portraits`

Then enable **Spotlight Portraits** in your world.

## Usage

### Actor Directory
Right-click an actor and choose **Porträt anzeigen** / **Show portrait**.

### Actor Sheet
Open an actor and click **Spotlight** in the sheet header.

### Scene Controls
Use the **Spotlight Portraits** tool and choose:
- **Show selected token portrait**
- **Hide portrait overlay**

### Keybinding
Default hotkey: **Shift+P**

This shows the portrait of the first selected token.

## API

You can call the module from macros:

```js
const actor = game.actors.getName("Goblin Boss");
game.modules.get("spotlight-portraits").api.showForActor(actor, {
  subtitle: "Captain of the Red Knives"
});
```

Hide overlay:

```js
game.modules.get("spotlight-portraits").api.hide();
```
