export function formatPhoneNumber(phone?: string | null): string {
  if (!phone) return "";
  const raw = phone.trim();
  
  // Extraer sólo los dígitos numéricos
  const digits = raw.replace(/\D/g, "");
  
  if (digits.length >= 10) {
    const tenDigits = digits.slice(-10);
    const part1 = tenDigits.slice(0, 3);
    const part2 = tenDigits.slice(3, 6);
    const part3 = tenDigits.slice(6, 10);
    const formattedTen = `${part1} ${part2} ${part3}`;
    
    if (raw.includes("+521") || (digits.startsWith("521") && digits.length === 13)) {
      return `+52 1 ${formattedTen}`;
    }
    if (raw.includes("+52") || (digits.startsWith("52") && digits.length === 12)) {
      return `+52 ${formattedTen}`;
    }
    
    return formattedTen;
  }
  
  return raw;
}
