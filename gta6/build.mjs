// Genera index.html (documento completo, installabile come PWA) da app.html.
// app.html è il corpo della pagina ed è anche ciò che viene pubblicato come Artifact.
import { readFileSync, writeFileSync } from "node:fs";
const dir = new URL(".", import.meta.url);
const body = readFileSync(new URL("app.html", dir), "utf8");
const html = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<link rel="manifest" href="manifest.webmanifest">
<link rel="icon" href="icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="apple-touch-icon.png">
<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>
</head>
<body>
${body}
</body>
</html>
`;
writeFileSync(new URL("index.html", dir), html);
console.log("index.html generato");
