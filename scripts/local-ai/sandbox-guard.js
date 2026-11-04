// Hook de OMP: bloquea antes de ejecutarse cualquier herramienta de archivos dirigida fuera de la copia aislada.
import path from "node:path";

const FILE_TOOLS = new Set(["read", "grep", "glob", "edit", "write"]);

export default function sandboxGuard(pi) {
  const root = path.resolve(process.env.LOCAL_AI_SANDBOX ?? "");

  pi.on("tool_call", (event) => {
    if (!FILE_TOOLS.has(event.toolName)) return { block: true, reason: `Tool ${event.toolName} is not allowed in this task.` };
    // El modo hashline de edit lleva la ruta dentro de input: "[ruta#hash]".
    const target = event.input?.path ?? /^\[(.+?)#/.exec(event.input?.input ?? "")?.[1];
    if (!target) return undefined;
    const resolved = path.resolve(root, String(target));
    const relative = path.relative(root, resolved);
    if (String(target).includes("://") || relative.startsWith("..") || path.isAbsolute(relative)) {
      return { block: true, reason: `Path ${target} is outside your working directory. Use relative paths inside it.` };
    }
    return undefined;
  });
}
