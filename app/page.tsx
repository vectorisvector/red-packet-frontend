"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import { Hex, parseEther, formatEther } from "viem";
import { REDPACKET_ADDRESS, REDPACKET_ABI } from "./config/contracts";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useReadContract,
  useWatchContractEvent,
} from "wagmi";
import Image from "next/image";

type TabType = "ETH" | "ERC20" | "ERC721";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  // 使用 useEffect 确保组件只在客户端渲染
  useEffect(() => {
    setMounted(true);
  }, []);

  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>("ETH");
  const [count, setCount] = useState("10");
  const [amount, setAmount] = useState("1");
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenIds, setTokenIds] = useState("");
  const [isRandom, setIsRandom] = useState(false);
  const [packetId, setPacketId] = useState("");
  const [coverURI, setCoverURI] = useState(
    "https://pbs.twimg.com/media/Gg3Wf5JWMAAPQDr?format=jpg&name=4096x4096"
  );
  const [createEvent, setCreateEvent] = useState<{
    packetId: Hex;
    creator: Hex;
    totalAmount: bigint;
    count: bigint;
    coverURI: string;
    token: Hex;
    packetType: number;
  } | null>(null);
  const [claimEvent, setClaimEvent] = useState<{
    packetId: Hex;
    claimer: Hex;
    amount: bigint;
    tokenId: bigint;
  } | null>(null);

  const { writeContract, data: hash } = useWriteContract();
  const { writeContract: writeClaimContract, data: claimHash } =
    useWriteContract();

  const {
    isLoading: isCreating,
    isSuccess: isCreateSuccess,
    isError: isCreateError,
    error: createError,
  } = useWaitForTransactionReceipt({ hash });
  const {
    isLoading: isClaiming,
    isSuccess: isClaimSuccess,
    isError: isClaimError,
    error: claimError,
  } = useWaitForTransactionReceipt({
    hash: claimHash,
  });

  // 查询红包信息
  const { data: packetInfo } = useReadContract({
    address: REDPACKET_ADDRESS,
    abi: REDPACKET_ABI,
    functionName: "getPacketInfo",
    args: packetId ? [packetId as Hex] : undefined,
  });

  // Watch for PacketCreated events
  useWatchContractEvent({
    address: REDPACKET_ADDRESS,
    abi: REDPACKET_ABI,
    eventName: "PacketCreated",
    onLogs: (logs) => {
      const event = logs[0];
      if (event) {
        setCreateEvent({
          packetId: event.args.packetId as Hex,
          creator: event.args.creator as Hex,
          totalAmount: event.args.totalAmount as bigint,
          count: event.args.count as bigint,
          coverURI: event.args.coverURI as string,
          token: event.args.token as Hex,
          packetType: event.args.packetType as number,
        });
      }
    },
  });

  // Watch for PacketClaimed events
  useWatchContractEvent({
    address: REDPACKET_ADDRESS,
    abi: REDPACKET_ABI,
    eventName: "PacketClaimed",
    onLogs: (logs) => {
      const event = logs[0];
      if (event) {
        setClaimEvent({
          packetId: event.args.packetId as Hex,
          claimer: event.args.claimer as Hex,
          amount: event.args.amount as bigint,
          tokenId: event.args.tokenId as bigint,
        });
      }
    },
  });

  // 创建红包
  const handleCreate = async () => {
    const expireTime = Math.floor(Date.now() / 1000) + 3600; // 1小时后过期

    if (activeTab === "ETH") {
      writeContract({
        address: REDPACKET_ADDRESS,
        abi: REDPACKET_ABI,
        functionName: "createETHPacket",
        args: [BigInt(count), BigInt(expireTime), isRandom, coverURI],
        value: parseEther(amount),
      });
    } else if (activeTab === "ERC20") {
      writeContract({
        address: REDPACKET_ADDRESS,
        abi: REDPACKET_ABI,
        functionName: "createERC20Packet",
        args: [
          BigInt(count),
          BigInt(expireTime),
          isRandom,
          coverURI,
          tokenAddress as Hex,
          parseEther(amount),
        ],
      });
    } else {
      const tokenIdArray = tokenIds.split(",").map((id) => BigInt(id.trim()));
      writeContract({
        address: REDPACKET_ADDRESS,
        abi: REDPACKET_ABI,
        functionName: "createERC721Packet",
        args: [
          BigInt(count),
          BigInt(expireTime),
          coverURI,
          tokenAddress as Hex,
          tokenIdArray,
        ],
      });
    }
  };

  // 领取红包
  const handleClaim = async () => {
    writeClaimContract({
      address: REDPACKET_ADDRESS,
      abi: REDPACKET_ABI,
      functionName: "claimPacket",
      args: [packetId as Hex],
    });
  };

  // Tab切换按钮组件
  const TabButton = ({ tab }: { tab: TabType }) => (
    <button
      onClick={() => setActiveTab(tab)}
      className={`px-4 py-2 rounded-lg transition-all duration-200 ${
        activeTab === tab
          ? "bg-gradient-to-r from-indigo-500 to-purple-500 text-white"
          : "text-gray-400 hover:text-white"
      }`}
    >
      {tab}
    </button>
  );

  // 处理 IPFS URI 转换为 HTTP URL
  const getImageUrl = (uri: string) => {
    if (!uri) return "";
    if (uri.startsWith("ipfs://")) {
      return `https://ipfs.io/ipfs/${uri.replace("ipfs://", "")}`;
    }
    return uri;
  };

  // 如果组件未挂载，返回null或加载占位符
  if (!mounted) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-48 mb-12"></div>
            <div className="h-[400px] bg-gray-800/50 rounded-2xl"></div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
      {/* Social Links */}
      <div className="w-full bg-gradient-to-r from-indigo-500/10 to-purple-500/10 backdrop-blur-sm border-b border-gray-800/50">
        <div className="max-w-4xl mx-auto px-6 py-3 flex justify-end space-x-6 text-sm">
          <a
            href="https://github.com/vectorisvector"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 text-white/90 hover:text-white hover:scale-105 transition-all duration-200 bg-gray-800/40 rounded-full px-4 py-1.5"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path
                fillRule="evenodd"
                d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
                clipRule="evenodd"
              />
            </svg>
            <span className="font-medium">GitHub</span>
          </a>
          <a
            href="https://x.com/cybervector_"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-2 text-white/90 hover:text-white hover:scale-105 transition-all duration-200 bg-gray-800/40 rounded-full px-4 py-1.5"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            <span className="font-medium">X</span>
          </a>
          <div className="h-7 w-px bg-gray-700/50"></div>
          <div className="text-gray-400 flex items-center">
            <span className="animate-pulse mr-2">💡</span>
            <span>
              Built by <span className="text-white font-medium">CyberV</span>
            </span>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-12">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
            Red Packet DApp
          </h1>
          <ConnectButton />
        </div>

        {address ? (
          <div className="space-y-8">
            {/* Create Red Packet Card */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-xl">
              <h2 className="text-xl font-bold mb-6 flex items-center">
                <span className="bg-indigo-500 p-2 rounded-lg mr-3">🎁</span>
                Create Red Packet
              </h2>

              {/* Tabs */}
              <div className="flex space-x-4 mb-6">
                <TabButton tab="ETH" />
                <TabButton tab="ERC20" />
                <TabButton tab="ERC721" />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Cover URI
                  </label>
                  <div className="space-y-4">
                    <input
                      type="text"
                      value={coverURI}
                      onChange={(e) => setCoverURI(e.target.value)}
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="ipfs://..."
                    />
                    {/* Cover Preview */}
                    <div className="relative w-full h-48 rounded-lg overflow-hidden bg-gray-800">
                      {coverURI && (
                        <Image
                          src={getImageUrl(coverURI)}
                          alt="Cover Preview"
                          fill
                          className="object-cover transition-opacity duration-300"
                        />
                      )}
                      <div className="absolute inset-0 flex items-center justify-center">
                        {!coverURI && (
                          <span className="text-gray-500">
                            Enter URI to preview cover image
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {(activeTab === "ERC20" || activeTab === "ERC721") && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Token Address
                    </label>
                    <input
                      type="text"
                      value={tokenAddress}
                      onChange={(e) => setTokenAddress(e.target.value)}
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="0x..."
                    />
                  </div>
                )}

                {activeTab !== "ERC721" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Number of Packets
                      </label>
                      <input
                        type="number"
                        value={count}
                        onChange={(e) => setCount(e.target.value)}
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Total Amount{" "}
                        {activeTab === "ETH" ? "(ETH)" : "(Tokens)"}
                      </label>
                      <input
                        type="number"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>

                    <label className="flex items-center space-x-3 text-gray-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={isRandom}
                        onChange={(e) => setIsRandom(e.target.checked)}
                        className="w-5 h-5 rounded border-gray-600 text-indigo-500 focus:ring-indigo-500 bg-gray-700"
                      />
                      <span>Random Amount Distribution</span>
                    </label>
                  </>
                )}

                {activeTab === "ERC721" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      Token IDs (comma separated)
                    </label>
                    <input
                      type="text"
                      value={tokenIds}
                      onChange={(e) => setTokenIds(e.target.value)}
                      className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="1, 2, 3"
                    />
                  </div>
                )}

                <button
                  onClick={handleCreate}
                  disabled={isCreating}
                  className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg px-4 py-2 hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isCreating ? (
                    <span className="flex items-center justify-center">
                      <svg
                        className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Creating...
                    </span>
                  ) : (
                    "Create Packet"
                  )}
                </button>

                {isCreateSuccess && (
                  <div className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg">
                    ✨ Created Successfully!
                  </div>
                )}
              </div>
            </div>

            {/* Query and Claim Card */}
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-xl">
              <h2 className="text-xl font-bold mb-6 flex items-center">
                <span className="bg-pink-500 p-2 rounded-lg mr-3">🔍</span>
                Query/Claim Red Packet
              </h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Packet ID
                  </label>
                  <input
                    type="text"
                    value={packetId}
                    onChange={(e) => setPacketId(e.target.value)}
                    placeholder="Enter packet ID"
                    className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-pink-500"
                  />
                </div>

                {packetInfo && (
                  <div className="space-y-4 mt-6 p-4 bg-gray-700/30 rounded-lg">
                    <div className="relative w-full h-48 rounded-lg overflow-hidden mb-4">
                      <Image
                        src={getImageUrl(packetInfo[6])}
                        alt="Red Packet Cover"
                        fill
                        className="object-cover"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-gray-400 text-sm">Creator</p>
                        <p className="font-mono">
                          {packetInfo[0].slice(0, 6)}...
                          {packetInfo[0].slice(-4)}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-gray-400 text-sm">Total Amount</p>
                        <p className="font-mono">
                          {packetInfo[1].toString()} wei
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-gray-400 text-sm">Total Count</p>
                        <p>{packetInfo[2].toString()}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-gray-400 text-sm">Remaining</p>
                        <p>{packetInfo[3].toString()}</p>
                      </div>
                      <div className="col-span-2 space-y-1">
                        <p className="text-gray-400 text-sm">Expire Time</p>
                        <p>
                          {new Date(
                            Number(packetInfo[4]) * 1000
                          ).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleClaim}
                      disabled={isClaiming}
                      className="w-full mt-4 bg-gradient-to-r from-pink-500 to-rose-500 text-white rounded-lg px-4 py-2 hover:from-pink-600 hover:to-rose-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isClaiming ? (
                        <span className="flex items-center justify-center">
                          <svg
                            className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                          >
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            ></circle>
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            ></path>
                          </svg>
                          Claiming...
                        </span>
                      ) : (
                        "Claim Packet"
                      )}
                    </button>

                    {isClaimSuccess && (
                      <div className="bg-green-500/20 text-green-400 px-4 py-2 rounded-lg mt-4">
                        🎉 Claimed Successfully!
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-center py-20">
            <h2 className="text-2xl font-bold text-gray-400 mb-4">
              Connect your wallet to continue
            </h2>
            <p className="text-gray-500">
              You need to connect your wallet to create or claim red packets
            </p>
          </div>
        )}
      </div>

      {/* Event Information Display */}
      <div className="space-y-6 mt-8">
        {createEvent && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-green-400">
              🎉 Packet Created
            </h3>
            <div className="relative w-full h-48 rounded-lg overflow-hidden mb-4">
              <Image
                src={getImageUrl(createEvent.coverURI)}
                alt="Red Packet Cover"
                fill
                className="object-cover"
              />
            </div>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-400">Packet ID:</span>{" "}
                {createEvent.packetId}
              </p>
              <p>
                <span className="text-gray-400">Creator:</span>{" "}
                {createEvent.creator}
              </p>
              <p>
                <span className="text-gray-400">Total Amount:</span>{" "}
                {formatEther(createEvent.totalAmount)} {activeTab}
              </p>
              <p>
                <span className="text-gray-400">Count:</span>{" "}
                {Number(createEvent.count)}
              </p>
              <p>
                <span className="text-gray-400">Cover URI:</span>{" "}
                {createEvent.coverURI}
              </p>
              {(activeTab === "ERC20" || activeTab === "ERC721") && (
                <p>
                  <span className="text-gray-400">Token Address:</span>{" "}
                  {createEvent.token}
                </p>
              )}
              <p>
                <span className="text-gray-400">Type:</span>{" "}
                {["ETH", "ERC20", "ERC721"][Number(createEvent.packetType)]}
              </p>
            </div>
          </div>
        )}

        {isCreateError && (
          <div className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg mt-4">
            ❌ Error: {createError?.message || "Transaction failed"}
          </div>
        )}

        {claimEvent && (
          <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-xl">
            <h3 className="text-lg font-bold mb-4 text-pink-400">
              🎊 Packet Claimed
            </h3>
            <div className="space-y-2 text-sm">
              <p>
                <span className="text-gray-400">Packet ID:</span>{" "}
                {claimEvent.packetId}
              </p>
              <p>
                <span className="text-gray-400">Claimer:</span>{" "}
                {claimEvent.claimer}
              </p>
              <p>
                <span className="text-gray-400">Amount:</span>{" "}
                {formatEther(claimEvent.amount)} {activeTab}
              </p>
              {activeTab === "ERC721" && (
                <p>
                  <span className="text-gray-400">Token ID:</span>{" "}
                  {Number(claimEvent.tokenId)}
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {isClaimError && (
        <div className="bg-red-500/20 text-red-400 px-4 py-2 rounded-lg mt-4">
          ❌ Error: {claimError?.message || "Transaction failed"}
        </div>
      )}
    </main>
  );
}
