"use client";

import { ConnectButton } from "@rainbow-me/rainbowkit";
import { useEffect, useState } from "react";
import { decodeEventLog, formatUnits, Hex, parseEther, parseUnits } from "viem";
import { REDPACKET_ADDRESS, REDPACKET_ABI } from "./config/contracts";
import {
  useWriteContract,
  useWaitForTransactionReceipt,
  useAccount,
  useReadContract,
  useSimulateContract,
} from "wagmi";
import Image from "next/image";
import { EventModal } from "./components/EventModal";
import { erc20Abi, erc721Abi } from "viem";
import { Stats } from "./components/Stats";
import { UserPackets } from "./components/UserPackets";
import { waitForTransactionReceipt, writeContract } from "wagmi/actions";
import { config } from "./config/wagmi";

type TabType = "MON" | "ERC20" | "ERC721";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  // 使用 useEffect 确保组件只在客户端渲染
  useEffect(() => {
    setMounted(true);
  }, []);

  const { address } = useAccount();
  const [activeTab, setActiveTab] = useState<TabType>("MON");
  const [count, setCount] = useState("10");
  const [amount, setAmount] = useState("1");
  const [tokenAddress, setTokenAddress] = useState("");
  const [tokenIds, setTokenIds] = useState("");
  const [isRandom, setIsRandom] = useState(false);
  const [packetId, setPacketId] = useState("");
  const [coverURI, setCoverURI] = useState(
    "https://pbs.twimg.com/media/Gg3Wf5JWMAAPQDr?format=jpg&name=4096x4096"
  );
  const [showEventModal, setShowEventModal] = useState(false);
  const [eventType, setEventType] = useState<"create" | "claim" | null>(null);
  const [createEvent, setCreateEvent] = useState<{
    packetId: Hex;
    creator: Hex;
    totalAmount: bigint;
    count: bigint;
    expireTime: bigint;
    isRandom: boolean;
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
  const [tokenDecimals, setTokenDecimals] = useState<number>(18);
  const [expireTime, setExpireTime] = useState("86400"); // 默认 1 天 (86400 秒)
  const [isApproving, setIsApproving] = useState(false);

  const { writeContract: writeCreateContract, data: hash } = useWriteContract();
  const { writeContract: writeClaimContract, data: claimHash } =
    useWriteContract();

  const {
    isLoading: isCreating,
    isSuccess: isCreateSuccess,
    data: createReceipt,
  } = useWaitForTransactionReceipt({
    hash,
    query: {
      enabled: !!hash,
    },
  });
  const {
    isLoading: isClaiming,
    isSuccess: isClaimSuccess,
    data: claimReceipt,
  } = useWaitForTransactionReceipt({
    hash: claimHash,
    query: {
      enabled: !!claimHash,
    },
  });

  // 查询红包信息
  const { data: packetInfo } = useReadContract({
    address: REDPACKET_ADDRESS,
    abi: REDPACKET_ABI,
    functionName: "getPacketInfo",
    args: packetId ? [packetId as Hex] : undefined,
    query: {
      enabled: !!packetId && packetId.length === 66,
    },
  });

  // 获取 ERC20 代币精度
  const { data: decimals } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "decimals",
    query: {
      enabled: activeTab === "ERC20" && tokenAddress.length === 42,
    },
  });

  // 预估用户领取红包是否成功
  const { data: userClaimedPacketData } = useSimulateContract({
    address: REDPACKET_ADDRESS,
    abi: REDPACKET_ABI,
    functionName: "claimPacket",
    args: [packetId as `0x${string}`],
    query: {
      enabled: !!packetId && packetId.length === 66,
    },
  });
  const userCanClaim = !!userClaimedPacketData?.result?.[0];

  // 当获取到精度时更新状态
  useEffect(() => {
    if (decimals !== undefined) {
      setTokenDecimals(Number(decimals));
    }
  }, [decimals]);

  // 检查 ERC20 授权
  const { data: erc20Allowance } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: "allowance",
    args: [address as `0x${string}`, REDPACKET_ADDRESS],
    query: {
      enabled: !!address && !!tokenAddress && activeTab === "ERC20",
    },
  });

  // 检查 ERC721 授权
  const { data: isERC721Approved } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: erc721Abi,
    functionName: "isApprovedForAll",
    args: [address as `0x${string}`, REDPACKET_ADDRESS],
    query: {
      enabled: !!address && !!tokenAddress && activeTab === "ERC721",
    },
  });

  // 创建红包
  const handleCreate = async () => {
    // 将过期时间转换为 BigInt
    const expireTimeBigInt =
      BigInt(Math.floor(Date.now() / 1000)) + BigInt(parseInt(expireTime));

    try {
      if (activeTab === "MON") {
        await writeCreateContract({
          address: REDPACKET_ADDRESS,
          abi: REDPACKET_ABI,
          functionName: "createETHPacket",
          args: [BigInt(count), expireTimeBigInt, isRandom, coverURI],
          value: parseEther(amount),
        });
      } else if (activeTab === "ERC20") {
        const amountBigInt = parseUnits(amount, tokenDecimals);

        // 检查授权
        if (erc20Allowance && erc20Allowance < amountBigInt) {
          setIsApproving(true);
          try {
            const hash = await writeContract(config, {
              address: tokenAddress as `0x${string}`,
              abi: erc20Abi,
              functionName: "approve",
              args: [REDPACKET_ADDRESS, amountBigInt],
            });
            // 等待授权确认
            await waitForTransactionReceipt(config, { hash });
          } finally {
            setIsApproving(false);
          }
        }

        await writeCreateContract({
          address: REDPACKET_ADDRESS,
          abi: REDPACKET_ABI,
          functionName: "createERC20Packet",
          args: [
            BigInt(count),
            expireTimeBigInt,
            isRandom,
            coverURI,
            tokenAddress as `0x${string}`,
            amountBigInt,
          ],
        });
      } else {
        const tokenIdArray = tokenIds.split(",").map((id) => BigInt(id.trim()));

        // 检查授权
        if (!isERC721Approved) {
          setIsApproving(true);
          try {
            const hash = await writeContract(config, {
              address: tokenAddress as `0x${string}`,
              abi: erc721Abi,
              functionName: "setApprovalForAll",
              args: [REDPACKET_ADDRESS, true],
            });
            // 等待授权确认
            await waitForTransactionReceipt(config, { hash });
          } finally {
            setIsApproving(false);
          }
        }

        await writeCreateContract({
          address: REDPACKET_ADDRESS,
          abi: REDPACKET_ABI,
          functionName: "createERC721Packet",
          args: [
            BigInt(count),
            expireTimeBigInt,
            coverURI,
            tokenAddress as `0x${string}`,
            tokenIdArray,
          ],
        });
      }
    } catch (error) {
      console.error("Create packet error:", error);
    }
  };

  // 监听交易完成
  useEffect(() => {
    if (isCreateSuccess && createReceipt) {
      setShowEventModal(true);
      setEventType("create");
      // 解析日志
      for (const log of createReceipt.logs) {
        const decodedLog = decodeEventLog({
          abi: REDPACKET_ABI,
          data: log.data,
          topics: log.topics,
        });

        // 根据日志类型设置事件
        if (decodedLog.eventName === "PacketCreated") {
          setCreateEvent({
            packetId: decodedLog.args.packetId,
            creator: decodedLog.args.creator,
            totalAmount: decodedLog.args.totalAmount,
            count: decodedLog.args.count,
            expireTime: decodedLog.args.expireTime,
            isRandom: decodedLog.args.isRandom,
            coverURI: decodedLog.args.coverURI,
            token: decodedLog.args.token,
            packetType: decodedLog.args.packetType,
          });
          setEventType("create");
          setShowEventModal(true);
        }
      }
    }

    if (isClaimSuccess) {
      setShowEventModal(true);
      setEventType("claim");
      // 解析日志
      for (const log of claimReceipt.logs) {
        const decodedLog = decodeEventLog({
          abi: REDPACKET_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (decodedLog.eventName === "PacketClaimed") {
          setClaimEvent({
            packetId: decodedLog.args.packetId,
            claimer: decodedLog.args.claimer,
            amount: decodedLog.args.amount,
            tokenId: decodedLog.args.tokenId,
          });
        }
      }
    }
  }, [isCreateSuccess, isClaimSuccess, createReceipt, claimReceipt]);

  // 领取红包
  const handleClaim = async () => {
    try {
      await writeClaimContract({
        address: REDPACKET_ADDRESS,
        abi: REDPACKET_ABI,
        functionName: "claimPacket",
        args: [packetId as `0x${string}`],
      });
    } catch (error) {
      console.error("Claim packet error:", error);
    }
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

  // 点击红包
  const handlePacketClick = (packetId: string) => {
    setPacketId(packetId);
  };

  // 如果组件未挂载，返回null或加载占位符
  if (!mounted) {
    return (
      <main className="min-h-screen bg-gradient-to-b from-gray-900 to-gray-800 text-white">
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-700 rounded w-48 mb-8"></div>
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
        <div className="max-w-7xl mx-auto px-6 py-2 flex justify-end space-x-6 text-sm">
          <a
            href="https://github.com/vectorisvector/red-packet-frontend"
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

      {/* Main Content */}
      <div className="max-w-7xl mx-auto p-6 flex gap-6">
        {/* Left Column */}
        <div className="w-[350px] space-y-6">
          {/* User Packets List */}
          <UserPackets onPacketClick={handlePacketClick} />
        </div>

        {/* Right Column */}
        <div className="flex-1">
          {/* Stats Section */}
          <Stats />

          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-violet-500 bg-clip-text text-transparent">
              Red Packet DApp
            </h1>
            <ConnectButton />
          </div>

          {/* Create Red Packet */}
          {address ? (
            <div className="grid grid-cols-2 gap-8">
              {/* Left Column - Create Red Packet */}
              <div className="space-y-8">
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-xl">
                  <h2 className="text-xl font-bold mb-6 flex items-center">
                    <span className="bg-indigo-500 p-2 rounded-lg mr-3">
                      🎁
                    </span>
                    Create Red Packet
                  </h2>

                  {/* Create Form */}
                  <div className="space-y-4">
                    {/* Tab Buttons */}
                    <div className="flex space-x-2 mb-4">
                      <TabButton tab="MON" />
                      <TabButton tab="ERC20" />
                      <TabButton tab="ERC721" />
                    </div>
                    {/* Cover URI */}
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
                      </div>
                    </div>

                    {/* Token Address */}
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
                        {/* Number of Packets */}
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

                        {/* Total Amount */}
                        <div>
                          <label className="block text-sm font-medium text-gray-300 mb-2">
                            Total Amount{" "}
                            {activeTab === "MON" ? "(MON)" : "(Tokens)"}
                          </label>
                          <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                      </>
                    )}

                    {/* Expire Time */}
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">
                        Expire Time
                      </label>
                      <select
                        value={expireTime}
                        onChange={(e) => setExpireTime(e.target.value)}
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      >
                        <option value="3600">1 Hour</option>
                        <option value="7200">2 Hours</option>
                        <option value="14400">4 Hours</option>
                        <option value="86400">1 Day</option>
                        <option value="172800">2 Days</option>
                      </select>
                    </div>

                    {/* Token IDs */}
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

                    {activeTab !== "ERC721" && (
                      <>
                        {/* Random Amount Distribution */}
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

                    <button
                      onClick={handleCreate}
                      disabled={isCreating || isApproving}
                      className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg px-4 py-2 hover:from-indigo-600 hover:to-purple-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isApproving ? (
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
                          Approving...
                        </span>
                      ) : isCreating ? (
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

                    {/* Cover Preview */}
                    <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden bg-gray-800">
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
              </div>

              {/* Right Column - Query and Claim */}
              <div className="space-y-8">
                <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-xl">
                  <h2 className="text-xl font-bold mb-6 flex items-center">
                    <span className="bg-pink-500 p-2 rounded-lg mr-3">🔍</span>
                    Query & Claim Packet
                  </h2>

                  {/* Query and Claim Form */}
                  <div className="space-y-4">
                    <div>
                      <div className="relative block text-sm font-medium text-gray-300 mb-2">
                        <div className="flex items-center gap-2">
                          <div>Packet ID</div>
                          {userCanClaim ? (
                            <span className="text-green-500 text-lg">✓</span>
                          ) : (
                            <span className="text-red-500 text-lg">✗</span>
                          )}
                        </div>
                      </div>
                      <input
                        type="text"
                        value={packetId}
                        onChange={(e) => setPacketId(e.target.value)}
                        className="w-full bg-gray-700/50 border border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="0x..."
                      />
                    </div>

                    {/* Packet Info Display */}
                    {packetInfo && (
                      <div className="mt-6 space-y-4">
                        <div className="grid gap-4">
                          <div className="space-y-1">
                            <p className="text-gray-400 text-sm">Packet ID</p>
                            <p className="font-mono">
                              {packetInfo.packetId.slice(0, 6)}...
                              {packetInfo.packetId.slice(-4)}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-gray-400 text-sm">Creator</p>
                            <p className="font-mono">
                              {packetInfo.creator.slice(0, 6)}...
                              {packetInfo.creator.slice(-4)}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-gray-400 text-sm">
                              Total Amount
                            </p>
                            <p className="font-mono">
                              {packetInfo.packetType !== 2
                                ? formatUnits(
                                    packetInfo.totalAmount,
                                    tokenDecimals
                                  )
                                : packetInfo.totalAmount.toString()}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-gray-400 text-sm">
                              Remaining Amount
                            </p>
                            <p className="font-mono">
                              {packetInfo.packetType !== 2
                                ? formatUnits(
                                    packetInfo.remainingAmount,
                                    tokenDecimals
                                  )
                                : packetInfo.remainingAmount.toString()}
                            </p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-gray-400 text-sm">Total Count</p>
                            <p>{packetInfo.count.toString()}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-gray-400 text-sm">Remaining</p>
                            <p>{packetInfo.remaining.toString()}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-gray-400 text-sm">Is Random</p>
                            <p>{packetInfo.isRandom ? "Yes" : "No"}</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-gray-400 text-sm">Token Type</p>
                            <p>
                              {packetInfo.packetType === 0
                                ? "MON"
                                : packetInfo.packetType === 1
                                ? "ERC20"
                                : "ERC721"}
                            </p>
                          </div>
                          {packetInfo.packetType !== 0 && (
                            <div className="col-span-2 space-y-1">
                              <p className="text-gray-400 text-sm">
                                Token Address
                              </p>
                              <p>
                                {packetInfo.token.slice(0, 6)}...
                                {packetInfo.token.slice(-4)}
                              </p>
                            </div>
                          )}
                          {packetInfo.packetType === 2 && (
                            <div className="col-span-2 space-y-1">
                              <p className="text-gray-400 text-sm">Token IDs</p>
                              <p>
                                {packetInfo.nftIds
                                  .map((id) => id.toString())
                                  .join(", ")}
                              </p>
                            </div>
                          )}
                          <div className="col-span-2 space-y-1">
                            <p className="text-gray-400 text-sm">Expire Time</p>
                            <p>
                              {new Date(
                                Number(packetInfo.expireTime) * 1000
                              ).toLocaleString()}
                            </p>
                          </div>
                        </div>

                        <div>
                          {!userCanClaim && (
                            <div className="text-yellow-500 text-sm mb-2">
                              {address
                                ? "You cannot claim this red packet"
                                : "Connect wallet to claim"}
                            </div>
                          )}
                          <button
                            onClick={handleClaim}
                            disabled={isClaiming || !userCanClaim}
                            className="w-full bg-gradient-to-r from-pink-500 to-purple-500 text-white rounded-lg px-4 py-2 hover:from-pink-600 hover:to-purple-600 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {isClaiming
                              ? "Claiming..."
                              : !address
                              ? "Connect Wallet"
                              : !userCanClaim
                              ? "Cannot Claim"
                              : "Claim Packet"}
                          </button>
                        </div>

                        <div className="relative w-full aspect-[3/4] rounded-lg overflow-hidden mb-4">
                          <Image
                            src={getImageUrl(packetInfo.coverURI)}
                            alt="Red Packet Cover"
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>
                    )}
                  </div>
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

          {/* Event Modal */}
          <EventModal
            showEventModal={showEventModal}
            setShowEventModal={setShowEventModal}
            eventType={eventType}
            createEvent={createEvent}
            claimEvent={claimEvent}
            activeTab={activeTab}
            getImageUrl={getImageUrl}
            onClose={handlePacketClick}
          />
        </div>
      </div>
    </main>
  );
}
