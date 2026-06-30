import React, { useState } from "react";
import { Copy, Check } from "lucide-react";
import { formatIntencionComercial } from "@/lib/utils";

interface FormattedIntencionComercialProps {
  lead: any;
  title: React.ReactNode;
  maxHeightClass?: string;
  bgClass?: string;
  borderClass?: string;
  paddingClass?: string;
  textClass?: string;
  containerClass?: string;
}

export default function FormattedIntencionComercial({
  lead,
  title,
  maxHeightClass = "max-h-48",
  bgClass = "bg-[#f4f8fc]",
  borderClass = "border-[#e8f2fa]",
  paddingClass = "p-3",
  textClass = "text-[11px] text-slate-700 font-semibold",
  containerClass = "bg-[#fcfdfd] border border-[#e2edf6] p-4 rounded-2xl shadow-sm space-y-2"
}: FormattedIntencionComercialProps) {
  const [copied, setCopied] = useState(false);
  const text = formatIntencionComercial(lead);

  const handleCopy = async () => {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Error al copiar texto: ", err);
    }
  };

  if (!text) {
    return (
      <div className={containerClass}>
        <div className="flex items-center justify-between">
          {title}
        </div>
        <div className={`${textClass} ${bgClass} ${paddingClass} rounded-xl border ${borderClass} italic text-slate-400`}>
          Sin información de servicio.
        </div>
      </div>
    );
  }

  const renderContent = () => {
    const lines = text.split("\n");
    return lines.map((line, lineIndex) => {
      const parts = [];
      const regex = /\*(.*?)\*/g;
      let match;
      let lastIndex = 0;

      while ((match = regex.exec(line)) !== null) {
        if (match.index > lastIndex) {
          parts.push(line.substring(lastIndex, match.index));
        }
        parts.push(
          <strong key={match.index} className="font-extrabold text-[#026692]">
            {match[1]}
          </strong>
        );
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < line.length) {
        parts.push(line.substring(lastIndex));
      }

      return (
        <div key={lineIndex} className="min-h-[1.25rem]">
          {parts}
        </div>
      );
    });
  };

  return (
    <div className={containerClass}>
      <div className="flex items-center justify-between">
        {title}
        <button
          onClick={handleCopy}
          type="button"
          className="flex items-center gap-1 px-2.5 py-1 text-[9px] font-bold text-[#026692] bg-[#e8f2fa] hover:bg-[#d4e7f5] active:bg-[#b0d5f0] rounded-lg transition-all border border-[#d0e2f0] shadow-sm cursor-pointer"
          title="Copiar texto para WhatsApp"
        >
          {copied ? (
            <>
              <Check className="w-2.5 h-2.5 text-emerald-600 animate-scale-up" />
              <span className="text-emerald-600 font-extrabold">¡Copiado!</span>
            </>
          ) : (
            <>
              <Copy className="w-2.5 h-2.5 text-[#026692]" />
              <span>Copiar</span>
            </>
          )}
        </button>
      </div>
      <div className={`${textClass} ${bgClass} ${paddingClass} rounded-xl border ${borderClass} overflow-y-auto ${maxHeightClass} custom-scrollbar whitespace-pre-wrap`}>
        {renderContent()}
      </div>
    </div>
  );
}
