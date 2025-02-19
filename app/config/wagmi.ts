import { Chain, getDefaultConfig } from "@rainbow-me/rainbowkit";

// 自定义链
const monadDevnet: Chain = {
  id: 10143,
  name: "Monad Testnet",
  nativeCurrency: {
    name: "Monad",
    symbol: "MON",
    decimals: 18,
  },
  rpcUrls: {
    default: {
      http: ["https://testnet-rpc.monad.xyz"],
    },
  },
  blockExplorers: {
    default: {
      name: "Monad Testnet Explorer",
      url: "https://testnet.monadexplorer.com",
    },
  },
};

const config = getDefaultConfig({
  appName: "Red Packet App",
  projectId: "YOUR_PROJECT_ID",
  chains: [monadDevnet],
});

export { config };
