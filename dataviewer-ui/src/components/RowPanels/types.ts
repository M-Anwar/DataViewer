export type RowPanelType = "default" | "custom";

export type RowPanelOpenParams = {
  id: string;
  type: RowPanelType;
};

export type RowPanelParams = {
  id: string;
  type: RowPanelType;
  panelId: string;
  onReload?: () => void;
};
