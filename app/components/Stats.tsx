import { useAccount, useReadContract } from "wagmi";
import { REDPACKET_ADDRESS, REDPACKET_ABI } from "../config/contracts";

export const Stats = () => {
  const { address } = useAccount();

  const { data: totalPackets } = useReadContract({
    address: REDPACKET_ADDRESS,
    abi: REDPACKET_ABI,
    functionName: "getTotalPackets",
  });

  const { data: userCreatedCount } = useReadContract({
    address: REDPACKET_ADDRESS,
    abi: REDPACKET_ABI,
    functionName: "getUserCreatedPacketsCount",
    args: [address as `0x${string}`],
    query: {
      enabled: !!address,
    },
  });

  const { data: userClaimedCount } = useReadContract({
    address: REDPACKET_ADDRESS,
    abi: REDPACKET_ABI,
    functionName: "getUserClaimedPacketsCount",
    args: [address as `0x${string}`],
    query: {
      enabled: !!address,
    },
  });

  return (
    <div className="grid grid-cols-3 gap-6 mb-12">
      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <div className="text-3xl font-bold text-pink-500 mb-2">
          {totalPackets ? Number(totalPackets).toLocaleString() : "-"}
        </div>
        <div className="text-gray-400 text-sm">Total Red Packets</div>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <div className="text-3xl font-bold text-indigo-500 mb-2">
          {userCreatedCount ? Number(userCreatedCount).toLocaleString() : "-"}
        </div>
        <div className="text-gray-400 text-sm">Your Created Packets</div>
      </div>

      <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl p-6 border border-gray-700">
        <div className="text-3xl font-bold text-purple-500 mb-2">
          {userClaimedCount ? Number(userClaimedCount).toLocaleString() : "-"}
        </div>
        <div className="text-gray-400 text-sm">Your Claimed Packets</div>
      </div>
    </div>
  );
};
