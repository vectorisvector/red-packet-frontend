import Image from "next/image";
import { formatEther, Hex } from "viem";

interface EventModalProps {
  showEventModal: boolean;
  setShowEventModal: (show: boolean) => void;
  eventType: "create" | "claim" | null;
  createEvent: {
    packetId: Hex;
    creator: Hex;
    totalAmount: bigint;
    count: bigint;
    coverURI: string;
    token: Hex;
    packetType: number;
  } | null;
  claimEvent: {
    packetId: Hex;
    claimer: Hex;
    amount: bigint;
    tokenId: bigint;
  } | null;
  activeTab: string;
  getImageUrl: (uri: string) => string;
}

export const EventModal = ({
  showEventModal,
  setShowEventModal,
  eventType,
  createEvent,
  claimEvent,
  activeTab,
  getImageUrl,
}: EventModalProps) => {
  if (!showEventModal) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={() => setShowEventModal(false)}
      />

      {/* Modal Content */}
      <div className="relative bg-gray-900 rounded-2xl p-6 max-w-lg w-full mx-4 border border-gray-700 shadow-xl transform transition-all">
        {/* Close Button */}
        <button
          onClick={() => setShowEventModal(false)}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* Event Content */}
        {eventType === "create" && createEvent ? (
          <>
            <h3 className="text-xl font-bold mb-6 text-green-400 flex items-center">
              <span className="text-2xl mr-2">🎉</span>
              Red Packet Created Successfully!
            </h3>
            <div className="space-y-4">
              {/* Cover Image */}
              <div className="relative w-full h-48 rounded-lg overflow-hidden mb-4">
                <Image
                  src={getImageUrl(createEvent.coverURI)}
                  alt="Red Packet Cover"
                  fill
                  className="object-cover"
                />
              </div>
              {/* Event Details */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="space-y-1">
                  <p className="text-gray-400">Packet ID</p>
                  <p className="font-mono bg-gray-800 p-2 rounded">
                    {createEvent.packetId}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-400">Creator</p>
                  <p className="font-mono">
                    {createEvent.creator.slice(0, 6)}...
                    {createEvent.creator.slice(-4)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-400">Total Amount</p>
                  <p>
                    {formatEther(createEvent.totalAmount)} {activeTab}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-400">Count</p>
                  <p>{Number(createEvent.count)}</p>
                </div>
              </div>
            </div>
          </>
        ) : eventType === "claim" && claimEvent ? (
          <>
            <h3 className="text-xl font-bold mb-6 text-pink-400 flex items-center">
              <span className="text-2xl mr-2">🎊</span>
              Red Packet Claimed Successfully!
            </h3>
            <div className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-gray-400">Packet ID</p>
                  <p className="font-mono bg-gray-800 p-2 rounded">
                    {claimEvent.packetId}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-400">Claimer</p>
                  <p className="font-mono">
                    {claimEvent.claimer.slice(0, 6)}...
                    {claimEvent.claimer.slice(-4)}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-400">Amount</p>
                  <p>
                    {formatEther(claimEvent.amount)} {activeTab}
                  </p>
                </div>
                {activeTab === "ERC721" && (
                  <div className="space-y-1">
                    <p className="text-gray-400">Token ID</p>
                    <p>{Number(claimEvent.tokenId)}</p>
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}

        {/* Action Button */}
        <button
          onClick={() => setShowEventModal(false)}
          className="w-full mt-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg px-4 py-2 hover:from-indigo-600 hover:to-purple-600 transition-all duration-200"
        >
          Close
        </button>
      </div>
    </div>
  );
};
