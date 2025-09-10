type DieType = "normal" | "primary" | "dropped" | "exploded" | "vicious";
export type RollResult = {
  formula: string;
  value: number;
  dice: {
    sides: number;
    value: number;
    position: number;
    type: DieType;
    isMax: boolean;
    isMin: boolean;
  }[];
  isCrit: boolean;
  isMiss: boolean;
};
