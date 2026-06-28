const path = require("path");
process.env.FONTCONFIG_PATH = path.join(__dirname, "src", "lib", "fontconfig");
process.env.PANGOCAIRO_BACKEND = "fontconfig";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    domains: ['images.unsplash.com', 'randomuser.me'],
  },
};

module.exports = nextConfig;
