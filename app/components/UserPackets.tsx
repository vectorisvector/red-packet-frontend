import { useState, useEffect } from "react";
import { useAccount, useReadContract, useReadContracts } from "wagmi";
import { REDPACKET_ADDRESS, REDPACKET_ABI } from "../config/contracts";
import Image from "next/image";
import { erc20Abi, erc721Abi, formatEther, formatUnits, Hex } from "viem";
import { writeContract } from "wagmi/actions";
import { config } from "../config/wagmi";

type TabType = "created" | "claimed";

interface PacketInfo {
  packetId: Hex;
  creator: Hex;
  totalAmount: bigint;
  remainingAmount: bigint;
  count: bigint;
  remaining: bigint;
  expireTime: bigint;
  isRandom: boolean;
  coverURI: string;
  token: Hex;
  packetType: number;
  nftIds: bigint[];
}

export const UserPackets = ({
  onPacketClick,
}: {
  onPacketClick: (packetId: string) => void;
}) => {
  const { address } = useAccount();
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState<TabType>("created");
  const pageSize = 10;
  const [packetDetails, setPacketDetails] = useState<PacketInfo[]>([]);

  // 获取用户创建的红包
  const { data: createdPacketsData } = useReadContract({
    address: REDPACKET_ADDRESS,
    abi: REDPACKET_ABI,
    functionName: "getUserCreatedPackets",
    args: [
      address as `0x${string}`,
      BigInt((currentPage - 1) * pageSize),
      BigInt(pageSize),
    ],
    query: {
      enabled: !!address && activeTab === "created",
    },
  });

  // 获取用户领取的红包
  const { data: claimedPacketsData } = useReadContract({
    address: REDPACKET_ADDRESS,
    abi: REDPACKET_ABI,
    functionName: "getUserClaimedPackets",
    args: [
      address as `0x${string}`,
      BigInt((currentPage - 1) * pageSize),
      BigInt(pageSize),
    ],
    query: {
      enabled: !!address && activeTab === "claimed",
    },
  });

  const userPacketIds =
    activeTab === "created" ? createdPacketsData?.[0] : claimedPacketsData?.[0];
  const totalPackets =
    activeTab === "created" ? createdPacketsData?.[1] : claimedPacketsData?.[1];

  // 批量获取红包详情
  const { data: packetInfos, refetch: refetchPacketInfos } = useReadContract({
    address: REDPACKET_ADDRESS,
    abi: REDPACKET_ABI,
    functionName: "getPacketsInfo",
    args: [userPacketIds as Hex[]],
    query: {
      enabled: !!userPacketIds && userPacketIds.length > 0,
    },
  });

  // 当页码改变或获取到新的ID列表时，重新获取详情
  useEffect(() => {
    if (userPacketIds && userPacketIds.length > 0) {
      refetchPacketInfos();
    }

    if (!address) {
      setPacketDetails([]);
    }
  }, [userPacketIds, currentPage, refetchPacketInfos, address]);

  // 当获取到详情时更新状态
  useEffect(() => {
    if (packetInfos) {
      const details = packetInfos.map((info, index: number) => ({
        packetId: userPacketIds?.[index] as Hex,
        creator: info.creator,
        totalAmount: info.totalAmount,
        remainingAmount: info.remainingAmount,
        count: info.count,
        remaining: info.remaining,
        expireTime: info.expireTime,
        isRandom: info.isRandom,
        coverURI: info.coverURI,
        token: info.token,
        packetType: info.packetType,
        nftIds: info.nftIds as bigint[],
      }));
      setPacketDetails(details);
    }
  }, [packetInfos, userPacketIds]);

  const totalPages = totalPackets
    ? Math.ceil(Number(totalPackets) / pageSize)
    : 0;

  // Tab 切换时重置页码
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab]);

  const getImageUrl = (uri: string) => {
    if (!uri) return "";
    if (uri.startsWith("ipfs://")) {
      return `https://ipfs.io/ipfs/${uri.replace("ipfs://", "")}`;
    }
    return uri;
  };

  const isExpired = (expireTime: bigint) => {
    return expireTime < BigInt(Math.floor(Date.now() / 1000));
  };

  // 处理退款
  const handleRefund = async (packetId: string) => {
    try {
      await writeContract(config, {
        address: REDPACKET_ADDRESS,
        abi: REDPACKET_ABI,
        functionName: "refund",
        args: [packetId as Hex],
      });
    } catch (error) {
      console.error("Refund packet error:", error);
    }
  };

  const erc20Packets = packetDetails.filter(
    (packet) => packet.packetType === 1
  );

  // 获取所有 erc20 红包的 symbol
  const { data: erc20Symbols } = useReadContracts({
    contracts: erc20Packets.map((packet) => ({
      address: packet.token,
      abi: erc20Abi,
      functionName: "symbol",
    })),
  });

  // 获取所有 erc20 红包的 decimals
  const { data: erc20Decimals } = useReadContracts({
    contracts: erc20Packets.map((packet) => ({
      address: packet.token,
      abi: erc20Abi,
      functionName: "decimals",
    })),
  });

  const erc20Map = new Map(
    erc20Packets.map((packet, index) => [
      packet.packetId,
      {
        symbol: erc20Symbols?.[index]?.result?.toString() || "TOKEN",
        decimals: Number(erc20Decimals?.[index]?.result?.valueOf()) || 18,
      },
    ])
  );

  const erc721Packets = packetDetails.filter(
    (packet) => packet.packetType === 2
  );

  // 获取所有 erc721 红包的 symbol
  const { data: erc721Symbols } = useReadContracts({
    contracts: erc721Packets.map((packet) => ({
      address: packet.token,
      abi: erc721Abi,
      functionName: "symbol",
    })),
  });

  const erc721Map = new Map(
    erc721Packets.map((packet, index) => [
      packet.packetId,
      {
        symbol: erc721Symbols?.[index]?.result?.toString() || "NFT",
      },
    ])
  );

  const getPacketTotalAmountView = (packet: PacketInfo) => {
    return packet.packetType === 0
      ? `${formatEther(packet.totalAmount)} MON`
      : packet.packetType === 1
      ? `${formatUnits(
          packet.totalAmount,
          erc20Map.get(packet.packetId)?.decimals || 18
        )} ${erc20Map.get(packet.packetId)?.symbol}`
      : `${packet.totalAmount} ${erc721Map.get(packet.packetId)?.symbol}`;
  };

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-xl">
      {/* Tabs */}
      <div className="flex space-x-4 mb-6">
        <button
          onClick={() => setActiveTab("created")}
          className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200 ${
            activeTab === "created"
              ? "bg-indigo-500 text-white"
              : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
          }`}
        >
          <span className="mr-2">📦</span>
          Created
        </button>
        <button
          onClick={() => setActiveTab("claimed")}
          className={`flex items-center px-4 py-2 rounded-lg transition-colors duration-200 ${
            activeTab === "claimed"
              ? "bg-pink-500 text-white"
              : "bg-gray-700/50 text-gray-400 hover:bg-gray-700"
          }`}
        >
          <span className="mr-2">🎁</span>
          Claimed
        </button>
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold bg-gradient-to-r from-indigo-400 to-pink-400 bg-clip-text text-transparent">
          {`Your ${
            activeTab === "created" ? "Created" : "Claimed"
          } Red Packets`}
        </h2>
      </div>

      <div className="space-y-4 ">
        {packetDetails.length > 0 ? (
          <>
            <div className="grid gap-4 max-h-[1000px] overflow-y-auto">
              {packetDetails.map((packet, index) => (
                <div
                  key={index}
                  onClick={() => onPacketClick(packet.packetId.toString())}
                  className="bg-gray-700/30 rounded-lg p-4 flex flex-col gap-4 cursor-pointer hover:bg-gray-700/50 transition-colors duration-200"
                >
                  <div className="flex items-center gap-3">
                    {/* 左侧图片 */}
                    <div className="relative w-24 aspect-[3/4] rounded-lg overflow-hidden">
                      <Image
                        src={getImageUrl(packet.coverURI)}
                        alt="Packet Cover"
                        fill
                        className="object-cover"
                      />
                    </div>

                    {/* 右侧信息 */}
                    <div className="space-y-2">
                      {/* Status Badge */}
                      <div>
                        {isExpired(packet.expireTime) ? (
                          <span className="text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded">
                            Expired
                          </span>
                        ) : (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded">
                            Active
                          </span>
                        )}
                      </div>

                      {/* Packet Info */}
                      <div className="font-mono text-sm text-gray-400">
                        ID: {packet.packetId.slice(0, 6)}...
                        {packet.packetId.slice(-4)}
                      </div>

                      <div className="text-sm text-green-400">
                        {getPacketTotalAmountView(packet)}
                      </div>

                      <div className="text-xs text-gray-500 flex gap-1">
                        <span className="text-gray-400">Claimed:</span>
                        <span
                          className={`${
                            Number(packet.remaining) === 0
                              ? "text-red-400"
                              : "text-green-400"
                          }`}
                        >
                          {Number(packet.remaining)}/{Number(packet.count)}
                        </span>
                      </div>

                      <div className="text-xs text-gray-500 flex flex-col items-start">
                        <span className="text-gray-400">Expire Time:</span>
                        <span
                          className={`${
                            isExpired(packet.expireTime)
                              ? "text-red-400"
                              : "text-green-400"
                          }`}
                        >
                          {new Date(
                            Number(packet.expireTime) * 1000
                          ).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {isExpired(packet.expireTime) &&
                    packet.creator === address &&
                    packet.remainingAmount > 0 && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRefund(packet.packetId);
                        }}
                        className="w-full text-xs bg-red-500/20 text-red-400 px-2 py-1 rounded hover:bg-red-500/30"
                      >
                        Refund
                      </button>
                    )}
                </div>
              ))}
            </div>

            {/* Pagination */}
            <div className="flex justify-center items-center space-x-2 mt-4">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-gray-400">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}
                className="px-3 py-1 rounded bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </>
        ) : (
          <div className="text-center py-12 text-gray-400">
            No red packets created yet
          </div>
        )}
      </div>
    </div>
  );
};
