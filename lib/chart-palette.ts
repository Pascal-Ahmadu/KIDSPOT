/**
 * Chart colours and series shared by server pages and client chart components.
 * (Kept out of "use client" files: constants exported from those become client references on the server.)
 */
export const SERIES_COLORS = ["#F37021", "#0A72E8", "#EC1A73", "#F5A400", "#525252"] as const;

export const FINANCE_SERIES = [
  { key: "revenue", label: "Revenue", color: SERIES_COLORS[0] },
  { key: "profit", label: "Profit", color: SERIES_COLORS[1] },
  { key: "cost", label: "Cost", color: SERIES_COLORS[2] },
] as const;
