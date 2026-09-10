import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // No canto inferior esquerdo, o indicador cobria o usuário no rodapé do menu.
  devIndicators: {
    position: "bottom-right",
  },
};

export default nextConfig;
