import type { CSSProperties, ComponentType } from "react";
import type { IconProps } from "@phosphor-icons/react";
import {
  Phone,
  Clock,
  Users,
  User,
  Calendar,
  Megaphone,
  Warning,
  Check,
  X,
  ChartBar,
  Robot,
  ChatCircle,
  Gift,
  Handshake,
  SlidersHorizontal,
  FunnelSimple,
  DeviceMobile,
  SmileySad,
} from "@phosphor-icons/react";

const defaultSize = 22;

type IconComp = ComponentType<IconProps>;

const MAP: Record<string, IconComp> = {
  Phone,
  Clock,
  Users,
  User,
  Calendar,
  Megaphone,
  MegaphoneSimple: Megaphone,
  Warning,
  Check,
  X,
  ChartBar,
  Robot,
  ChatCircle,
  Gift,
  Handshake,
  SlidersHorizontal,
  Funnel: FunnelSimple,
  FunnelSimple,
  DeviceMobile,
  SmileySad,
};

export function ResultsIcon({
  name,
  className,
  style,
  weight = "duotone",
}: {
  name?: string;
  className?: string;
  style?: CSSProperties;
  weight?: IconProps["weight"];
}) {
  const Comp = (name && MAP[name]) || ChartBar;
  return <Comp className={className} style={style} weight={weight} size={defaultSize} aria-hidden />;
}

export const RESULTS_ICON_OPTIONS = Object.keys(MAP).sort();
