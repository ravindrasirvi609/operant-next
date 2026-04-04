import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

function resolveWorkspaceSpecifier(targetPath) {
    if (path.extname(targetPath)) {
        return targetPath;
    }

    const candidates = [
        `${targetPath}.ts`,
        `${targetPath}.tsx`,
        path.join(targetPath, "index.ts"),
        path.join(targetPath, "index.tsx"),
    ];

    return candidates.find((candidate) => fs.existsSync(candidate)) ?? targetPath;
}

export async function resolve(specifier, context, defaultResolve) {
    if (specifier.startsWith("@/")) {
        const resolved = resolveWorkspaceSpecifier(
            path.join("/Users/rc/Projects/operant-next/src", specifier.slice(2))
        );

        return defaultResolve(pathToFileURL(resolved).href, context, defaultResolve);
    }

    return defaultResolve(specifier, context, defaultResolve);
}
