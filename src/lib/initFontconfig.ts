import path from "path";

const fontconfigDir = path.join(process.cwd(), "src", "lib", "fontconfig");
process.env.FONTCONFIG_PATH = fontconfigDir;
process.env.PANGOCAIRO_BACKEND = "fontconfig";

console.log("[Fontconfig Init] Configured FONTCONFIG_PATH to:", process.env.FONTCONFIG_PATH);
