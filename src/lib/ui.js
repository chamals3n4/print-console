export const fieldLabel = "block text-xs font-medium text-neutral-600 mb-1.5";

export const inputBase =
  "w-full h-8 px-2.5 text-xs border border-neutral-300 rounded bg-white text-neutral-700 placeholder-neutral-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/20";

export const selectCls = `${inputBase} appearance-none cursor-pointer pr-7`;

export const selectArrow = {
  backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%2373737a' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
  backgroundPosition: "right 0.5rem center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "1.25em",
};

export const cardCls = "bg-white rounded border border-neutral-200 p-4";

export const cardTitleCls =
  "text-[11px] font-semibold uppercase tracking-wide text-neutral-400";

export const primaryBtnCls =
  "w-full py-2 rounded text-xs font-semibold bg-blue-500 hover:bg-blue-600 active:bg-blue-700 text-white transition-colors disabled:opacity-40 disabled:cursor-not-allowed";

export const secondaryBtnCls =
  "w-full flex items-center justify-center gap-1.5 py-1.5 rounded text-xs font-medium text-neutral-600 border border-neutral-200 bg-white hover:bg-neutral-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed";

export const formatBytes = (bytes) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
};
