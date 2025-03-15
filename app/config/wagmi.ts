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
      http: [
        "https://divine-flashy-road.monad-testnet.quiknode.pro/6c7d555d0f9bb65e072423a46e67136067b69e25/",
      ],
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
