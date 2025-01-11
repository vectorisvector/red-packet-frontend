import { Chain, getDefaultConfig } from "@rainbow-me/rainbowkit";

// 自定义链
const monadDevnet: Chain = {
  id: 20143,
  name: "Monad Devnet",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: [
        "https://rpc-devnet.monadinfra.com/rpc/3fe540e310bbb6ef0b9f16cd23073b0a",
      ],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Devnet Explorer",
      url: "https://explorer.monad-devnet.devnet101.com",
    },
  },
};

const config = getDefaultConfig({
  appName: "Red Packet App",
  projectId: "YOUR_PROJECT_ID",
  chains: [monadDevnet],
});

export { config };
