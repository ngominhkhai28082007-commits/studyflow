export interface MascotDef {
  id: string;
  name: string;
  desc: string;
  price: number;        // 0 = free
  purchasable: boolean; // dog is not purchasable (owned by default)
}

export const MASCOTS: MascotDef[] = [
  { id: "dog", name: "Cún Chăm Chỉ", desc: "Lên cấp theo giờ học", price: 0, purchasable: false },
  { id: "bunny", name: "Thỏ Siêng Năng", desc: "Chăm chỉ không ngừng", price: 1200, purchasable: true },
  { id: "owl", name: "Cú Thông Thái", desc: "Càng học càng sáng dạ", price: 2400, purchasable: true },
  { id: "dragon", name: "Rồng Học Tập", desc: "Sức mạnh tri thức", price: 4800, purchasable: true },
];

export const DEFAULT_MASCOT = "dog";

export function findMascot(id: string): MascotDef | undefined {
  return MASCOTS.find((m) => m.id === id);
}
