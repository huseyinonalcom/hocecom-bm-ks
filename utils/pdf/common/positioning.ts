export type PageSize = "A4";

export interface Box {
  x: number;
  y: number;
  width: number;
}

const pageSizesDimensions = {
  A4: {
    width: 595,
    height: 842,
  },
};

export const flexBox = ({
  pageSize,
  originY,
  flex,
  column,
  columnCount,
}: {
  pageSize: PageSize;
  originY: number;
  flex: number;
  column: number;
  columnCount: number;
}): Box => {
  const pageWidth: number = pageSizesDimensions[pageSize].width;

  if (column < 0 || column >= columnCount) {
    throw new Error("Invalid column index.");
  }

  if (flex <= 0 || columnCount <= 0) {
    throw new Error("Flex and column count must be positive numbers.");
  }

  const columnWidth: number = pageWidth / columnCount;
  const boxWidth: number = columnWidth * flex;

  if (boxWidth > pageWidth) {
    throw new Error("Box width exceeds page width.");
  }

  const x: number = column * columnWidth;
  if (x + boxWidth > pageWidth) {
    throw new Error("Box exceeds page boundaries.");
  }

  return {
    x,
    y: originY,
    width: boxWidth,
  };
};
