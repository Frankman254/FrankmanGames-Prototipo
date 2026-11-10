await shot('01-titulo');
await click('button', 'Nueva partida');
await sleep(1500);
await shot('02-creacion');
log(await js(`[...document.querySelectorAll('button')].filter(b=>b.offsetParent).map(b=>b.textContent.trim()).join(' | ')`));
