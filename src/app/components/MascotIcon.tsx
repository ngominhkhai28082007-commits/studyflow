import dog0 from "../../assets/mascot/dog_0.svg";
import dog1 from "../../assets/mascot/dog_1.svg";
import dog2 from "../../assets/mascot/dog_2.svg";
import dog3 from "../../assets/mascot/dog_3.svg";
import dog4 from "../../assets/mascot/dog_4.svg";
import owl0 from "../../assets/mascot/owl_0.svg";
import owl1 from "../../assets/mascot/owl_1.svg";
import owl2 from "../../assets/mascot/owl_2.svg";
import owl3 from "../../assets/mascot/owl_3.svg";
import owl4 from "../../assets/mascot/owl_4.svg";
import bunny0 from "../../assets/mascot/bunny_0.svg";
import bunny1 from "../../assets/mascot/bunny_1.svg";
import bunny2 from "../../assets/mascot/bunny_2.svg";
import bunny3 from "../../assets/mascot/bunny_3.svg";
import bunny4 from "../../assets/mascot/bunny_4.svg";
import dragon0 from "../../assets/mascot/dragon_0.svg";
import dragon1 from "../../assets/mascot/dragon_1.svg";
import dragon2 from "../../assets/mascot/dragon_2.svg";
import dragon3 from "../../assets/mascot/dragon_3.svg";
import dragon4 from "../../assets/mascot/dragon_4.svg";

// Every mascot now has 5 level variants (0 Newbie .. 4 Master), matching the
// dog's escalating "study intensity" expressions.
const SPRITES: Record<string, string[]> = {
  dog: [dog0, dog1, dog2, dog3, dog4],
  owl: [owl0, owl1, owl2, owl3, owl4],
  bunny: [bunny0, bunny1, bunny2, bunny3, bunny4],
  dragon: [dragon0, dragon1, dragon2, dragon3, dragon4],
};

interface MascotIconProps {
  id: string;       // "dog" | "owl" | "bunny" | "dragon"
  level?: number;   // 0-4 study-intensity level
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
