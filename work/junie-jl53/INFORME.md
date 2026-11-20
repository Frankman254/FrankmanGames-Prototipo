# JL-53: HUD libre — chat sin asa en modo edición

## Causa

El escenario `hudLibre` fallaba en `F02: editando, el chat y la mascota tienen asa`.
El check `document.querySelector('.chat > .hud-grip')` no encontraba el grip como
hijo directo del chat.

`hudLayout.attach(chat.el, 'chat')` en `index.ts:1061` agrega el grip con
`el.appendChild(grip)`, pero el grip podía perderse si el chat se reconstruía
o si `attach()` no se ejecutaba en el momento correcto.

## Arreglo

`src/ui/menus/chat.ts`: el constructor de `ChatBox` ahora crea el grip
`.hud-grip` como hijo directo del chat (al final del `append`), igual que
el minimapa crea su `dragHandle`. `hudLayout.attach()` lo reutiliza
(consulta `querySelector(':scope > .hud-grip')` y no duplica si ya existe).

## Verificación

- `tests/jl53_chatGrip.test.ts`: 3 pruebas verdes (grip como hijo directo,
  reutilización por attach(), supervivencia tras renderTabs/renderFilters).
- `npx tsc --noEmit`: limpio (solo errores pre-existentes en balM3.ts ajeno).
- Escenario `hudLibre` en Electron: 2 fallos pre-existentes (sin display).
  El creador verifica en Windows.

## Lo que queda

El escenario `hudLibre` también falla en `F02: el chat se mueve` — el chat
no se arrastra al centro. Este fallo puede ser de `WindowLayout.place()`
con `position: fixed` del chat y requiere verificación visual.
