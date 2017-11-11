interface AnyColor {
  toHexString: () => string;
  getAlpha: () => number | undefined;
}

export const noneColor: AnyColor = {
  toHexString: () => "none",
  getAlpha: () => undefined
};
