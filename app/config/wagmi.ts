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
        "https://monad-testnet.g.alchemy.com/v2/iFUmhYjv1-nEs20EuldxzyBuyVgA_g42",
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
