import { useState, useEffect } from "react";
import { useAccount, useReadContract } from "wagmi";
import { REDPACKET_ADDRESS, REDPACKET_ABI } from "../config/contracts";
import Image from "next/image";
import { formatEther, Hex } from "viem";

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

interface UserPacketsProps {
  onPacketClick: (packetId: string) => void;
}

export const UserPackets = ({ onPacketClick }: UserPacketsProps) => {
  const { address } = useAccount();
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [packetDetails, setPacketDetails] = useState<PacketInfo[]>([]);

  // 获取用户红包ID列表
  const { data: userPacketsData } = useReadContract({
    address: REDPACKET_ADDRESS,
    abi: REDPACKET_ABI,
    functionName: "getUserCreatedPackets",
    args: [
      address as `0x${string}`,
      BigInt((currentPage - 1) * pageSize),
      BigInt(pageSize),
    ],
    query: {
      enabled: !!address,
    },
  });

  const userPacketIds = userPacketsData?.[0];
  const totalPackets = userPacketsData?.[1];

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
  }, [userPacketIds, currentPage, refetchPacketInfos]);

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

  return (
    <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl p-6 border border-gray-700 shadow-xl">
      <h2 className="text-xl font-bold mb-6 flex items-center">
        <span className="bg-indigo-500 p-2 rounded-lg mr-3">📦</span>
        Your Created Packets
      </h2>

      <div className="space-y-4">
        {packetDetails.length > 0 ? (
          <>
            <div className="grid gap-4">
              {packetDetails.map((packet, index) => (
                <div
                  key={index}
                  onClick={() => onPacketClick(packet.packetId.toString())}
                  className="bg-gray-700/30 rounded-lg p-4 flex items-center space-x-4 cursor-pointer hover:bg-gray-700/50 transition-colors duration-200"
                >
                  <div className="relative w-16 aspect-[3/4] rounded-lg overflow-hidden flex-shrink-0">
                    <Image
                      src={getImageUrl(packet.coverURI)}
                      alt="Packet Cover"
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex-grow">
                    <div className="font-mono text-sm text-gray-400">
                      ID: {packet.packetId.slice(0, 6)}...
                      {packet.packetId.slice(-4)}
                    </div>
                    <div className="text-sm mt-1">
                      {formatEther(packet.totalAmount)}{" "}
                      {packet.packetType === 0
                        ? "MON"
                        : packet.packetType === 1
                        ? "ERC20"
                        : "ERC721"}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Claimed: {Number(packet.remaining)}/{Number(packet.count)}
                    </div>
                  </div>
                  <div className="flex-shrink-0">
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
