type CookieBannerProps = {
  primaryColor: string;
  onAccept: () => void;
  onReject: () => void;
};

export function CookieBanner({ primaryColor, onAccept, onReject }: CookieBannerProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="text-center">
          <div className="text-4xl mb-3">🍪</div>
          <h2 className="text-lg font-semibold mb-1">Usamos cookies</h2>
          <p className="text-sm text-gray-500 mb-5">
            Usamos cookies para mejorar tu experiencia.
          </p>
        </div>
        <button
          type="button"
          onClick={onAccept}
          className="w-full py-3.5 rounded-xl text-sm font-semibold text-white mb-3"
          style={{ backgroundColor: primaryColor }}
        >
          ACEPTAR COOKIES
        </button>
        <div
          className="text-center text-xs text-[#999] cursor-pointer select-none"
          onClick={onReject}
        >
          Continuar sin aceptar
        </div>
      </div>
    </div>
  );
}

