import dog0 from "../../assets/mascot/dog_0.svg";
import dog1 from "../../assets/mascot/dog_1.svg";
import dog2 from "../../assets/mascot/dog_2.svg";
import dog3 from "../../assets/mascot/dog_3.svg";
import dog4 from "../../assets/mascot/dog_4.svg";
import owl from "../../assets/mascot/owl.svg";
import bunny from "../../assets/mascot/bunny.svg";
import dragon from "../../assets/mascot/dragon.svg";

// dog has 5 level variants; the others are a single hero pose for now
const SPRITES: Record<string, string[]> = {
  dog: [dog0, dog1, dog2, dog3, dog4],
  owl: [owl],
  bunny: [bunny],
  dragon: [dragon],
};

interface MascotIconProps {
  id: string;       // "dog" | "owl" | "bunny" | "dragon"
  level?: number;   // used for dog (0-4); ignored for single-pose mascots
  size?: number;
}

export function MascotIcon({ id, level = 2, size = 80 }: MascotIconProps) {
  const arr = SPRITES[id] || SPRITES.dog;
  const src = arr[Math.max(0, Math.min(arr.length - 1, level))] || arr[0];
  return (
    <img
      src={src}
      alt={id}
      width={size}
      height={size}
      className="object-contain"
      style={{ width: size, height: size }}
      draggable={false}
    />
  );
}
