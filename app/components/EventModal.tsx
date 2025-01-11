import Image from "next/image";
import { formatEther, Hex } from "viem";
import { useState } from "react";

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
  onClose?: (packetId: string) => void;
}

export const EventModal = ({
  showEventModal,
  setShowEventModal,
  eventType,
  createEvent,
  claimEvent,
  activeTab,
  getImageUrl,
  onClose,
}: EventModalProps) => {
  const [copyStatus, setCopyStatus] = useState<string>("");

  const handleCopy = async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyStatus(field);
      setTimeout(() => setCopyStatus(""), 2000); // 2秒后清除提示
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  const handleClose = () => {
    if (eventType === "create" && createEvent && onClose) {
      onClose(createEvent.packetId);
    }
    setShowEventModal(false);
  };

  if (!showEventModal) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
      />

      {/* Modal Content */}
      <div className="relative bg-gray-900 rounded-2xl p-6 max-w-lg w-full mx-4 border border-gray-700 shadow-xl transform transition-all">
        {/* Close Button */}
        <button
          onClick={handleClose}
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
                  <div
                    onClick={() => handleCopy(createEvent.packetId, "packetId")}
                    className="relative font-mono bg-gray-800 p-2 rounded group cursor-pointer hover:bg-gray-700/50 transition-colors duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        {createEvent.packetId.slice(0, 6)}...
                        {createEvent.packetId.slice(-4)}
                      </span>
                      <svg
                        className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors duration-200"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    {copyStatus === "packetId" && (
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs py-1 px-2 rounded shadow-lg">
                        Copied!
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-400">Creator</p>
                  <p className="font-mono bg-gray-800 p-2 rounded">
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
                  <div
                    onClick={() => handleCopy(claimEvent.packetId, "packetId")}
                    className="relative font-mono bg-gray-800 p-2 rounded group cursor-pointer hover:bg-gray-700/50 transition-colors duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <span>
                        {claimEvent.packetId.slice(0, 6)}...
                        {claimEvent.packetId.slice(-4)}
                      </span>
                      <svg
                        className="w-4 h-4 text-gray-400 group-hover:text-white transition-colors duration-200"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                      </svg>
                    </div>
                    {copyStatus === "packetId" && (
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white text-xs py-1 px-2 rounded shadow-lg">
                        Copied!
                      </div>
                    )}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-gray-400">Claimer</p>
                  <p className="font-mono bg-gray-800 p-2 rounded">
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
          onClick={handleClose}
          className="w-full mt-6 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg px-4 py-2 hover:from-indigo-600 hover:to-purple-600 transition-all duration-200"
        >
          Close
        </button>
      </div>
    </div>
  );
};
