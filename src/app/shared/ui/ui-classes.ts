/** Clases de botón compartidas por los diálogos y formularios de usuarios. */
export const BTN = {
  primary:
    'h-9 px-4 rounded-[4px] bg-primary text-on-primary hover:bg-brand-hover active:bg-brand-active text-label-default inline-flex items-center justify-center gap-1.5 border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
  danger:
    'h-9 px-4 rounded-[4px] bg-error text-on-error hover:bg-on-error-container text-label-default inline-flex items-center justify-center gap-1.5 border-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed',
  quiet:
    'h-9 px-4 rounded-[4px] bg-transparent text-on-surface-variant hover:text-on-surface hover:bg-surface-container text-label-default inline-flex items-center justify-center gap-1.5 border-0 cursor-pointer',
  outline:
    'h-9 px-4 rounded-[4px] bg-surface-container-lowest text-on-surface border border-outline-variant hover:bg-surface-container-low text-label-default inline-flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50',
} as const;

export const INPUT_CLASS =
  'w-full h-9 px-3 text-body-default bg-surface-container-lowest border border-outline-variant rounded-[4px] text-on-surface placeholder:text-on-surface-variant/70 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition-colors disabled:bg-surface-container-low disabled:text-on-surface-variant disabled:cursor-not-allowed';
