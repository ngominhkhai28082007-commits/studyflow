import dog0 from "../../assets/mascot/dog_0.svg";
import dog1 from "../../assets/mascot/dog_1.svg";
import dog2 from "../../assets/mascot/dog_2.svg";
import dog3 from "../../assets/mascot/dog_3.svg";
import dog4 from "../../assets/mascot/dog_4.svg";

const sprites = [dog0, dog1, dog2, dog3, dog4];

interface DogAvatarProps {
  level: number; // 0-4
  size?: number; // size in pixels
}

export function DogAvatar({ level, size = 80 }: DogAvatarProps) {
  const levelStyles = [
    { ring: "", glow: "" }, // Level 0
    { ring: "ring-2 ring-green-400/30", glow: "shadow-sm shadow-green-400/10" }, // Level 1
    { ring: "ring-3 ring-blue-400/40", glow: "shadow-md shadow-blue-400/20" }, // Level 2
    { ring: "ring-4 ring-purple-400/50", glow: "shadow-lg shadow-purple-400/30" }, // Level 3
    { ring: "ring-4 ring-yellow-400/50", glow: "shadow-xl shadow-yellow-400/40" }, // Level 4
  ];

  const lvl = Math.max(0, Math.min(4, level));
  const style = levelStyles[lvl];

  return (
    <div className="relative">
      <div
        className={`rounded-full overflow-hidden flex items-center justify-center ${style.ring} ${style.glow} bg-white/5`}
        style={{ width: `${size}px`, height: `${size}px` }}
      >
        <img
          src={sprites[lvl]}
          alt={`Dog level ${lvl}`}
          className="w-full h-full object-contain p-1"
          draggable={false}
        />
      </div>
    </div>
  );
}
