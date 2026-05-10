import { isoAlpha2ToFlagEmoji } from "@/lib/countryFlag";

type Props = {
  country?: string;
  city?: string;
  /** Tamaño del emoji de bandera (el resto hereda el tamaño del contenedor). */
  flagClassName?: string;
};

export function GeoCountryCityInline({
  country,
  city,
  flagClassName = "text-xl leading-none shrink-0",
}: Props) {
  const ctry = typeof country === "string" ? country.trim() : "";
  const ct = typeof city === "string" ? city.trim() : "";
  const flag = ctry ? isoAlpha2ToFlagEmoji(ctry) : null;

  if (flag && ct) {
    return (
      <span className="inline-flex min-w-0 max-w-full items-center gap-1">
        <span className={flagClassName}>{flag}</span>
        <span className="min-w-0 truncate">· {ct}</span>
      </span>
    );
  }
  if (flag) {
    return <span className={flagClassName}>{flag}</span>;
  }
  if (ctry && ct) {
    return <span className="truncate">{`${ctry} · ${ct}`}</span>;
  }
  return <span className="truncate">{ctry || ct}</span>;
}
