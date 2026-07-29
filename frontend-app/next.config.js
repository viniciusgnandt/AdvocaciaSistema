/** @type {import('next').NextConfig} */
const nextConfig = {
  // gera .next/standalone com um server.js proprio - a imagem Docker final
  // nao precisa carregar node_modules inteiro, so o runtime minimo do build.
  output: 'standalone',
};
module.exports = nextConfig;
