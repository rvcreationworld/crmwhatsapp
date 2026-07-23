import React from "react";
import { PhoneCall } from "lucide-react";
import { getTelLink } from "../utils/phoneUtils";

export default function CallButton({ phone, className = "" }) {
  const telLink = getTelLink(phone);

  if (!telLink) {
    return (
      <span
        title="Invalid number"
        className={`inline-flex items-center justify-center opacity-40 cursor-not-allowed ${className}`}
        onClick={(e) => e.stopPropagation()}
      >
        <PhoneCall size={16} />
      </span>
    );
  }

  return (
    <a
      href={telLink}
      aria-label={`Call ${phone}`}
      title={`Call ${phone}`}
      className={`inline-flex items-center justify-center rounded-full p-2 bg-green-100 text-green-700 hover:bg-green-200 transition ${className}`}
      onClick={(e) => e.stopPropagation()}
    >
      <PhoneCall size={16} />
    </a>
  );
}
