import { useState, useEffect } from "react";
import Icon from "@/components/ui/icon";
import * as api from "@/lib/api";
import type { SteamProfile, User } from "@/lib/api";

const AUTH_URL = "https://functions.poehali.dev/e329aae7-e93b-4b16-8b31-c4ee65a04bde";

interface Props {
  onSuccess: (user: User) => void;
  onBack: () => void;
}

type Mode = "choose" | "qr" | "manual";

export default function SteamConnect({ onSuccess, onBack }: Props) {
  const [mode, setMode] = useState<Mode>("choose");
  const [manualId, setManualId] = useState("");
  const [preview, setPreview] = useState<SteamProfile | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [openidUrl, setOpenidUrl] = useState("");
  const [qrValue, setQrValue] = useState("");

  // URL куда Steam будет редиректить после авторизации
  const callbackUrl = window.location.origin + "/?steam_callback=1";

  // Обработка callback от Steam OpenID (если вернулись после редиректа)
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("steam_callback") === "1" && sp.get("openid.mode")) {
      const qs = sp.toString();
      setLoading(true);
      api.completeSteamCallback(qs)
        .then(user => {
          window.history.replaceState({}, "", "/");
          onSuccess(user);
        })
        .catch(e => {
          setError(e.message);
          setLoading(false);
        });
    }
  }, []);

  // Загружаем OpenID URL при выборе QR
  useEffect(() => {
    if (mode !== "qr") return;
    api.getSteamLoginUrl(callbackUrl)
      .then(url => {
        setOpenidUrl(url);
        // QR-код через бесплатный API (без внешних зависимостей)
        setQrValue(`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}`);
      })
      .catch(() => setError("Не удалось получить ссылку Steam"));
  }, [mode]);

  // Предпросмотр профиля при вводе Steam ID
  useEffect(() => {
    const raw = manualId.trim();
    if (!raw || raw.length < 17) { setPreview(null); return; }
    const t = setTimeout(async () => {
      setLoadingPreview(true);
      const p = await api.previewSteamProfile(raw).catch(() => null);
      setPreview(p);
      setLoadingPreview(false);
    }, 700);
    return () => clearTimeout(t);
  }, [manualId]);

  const handleManualAuth = async () => {
    if (!manualId.trim()) { setError("Введите Steam ID"); return; }
    setLoading(true); setError("");
    const user = await api.steamManualAuth(manualId.trim()).catch(e => { setError(e.message); return null; });
    setLoading(false);
    if (user) onSuccess(user);
  };

  const handleOpenInBrowser = () => {
    if (openidUrl) window.location.href = openidUrl;
  };

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center z-50" style={{ backgroundColor: "var(--ash-surface)" }}>
        <div className="text-center space-y-4">
          <div className="w-12 h-12 rounded-lg mx-auto flex items-center justify-center" style={{ backgroundColor: "var(--ash-orange)" }}>
            <span className="font-display font-black text-black text-xl">A</span>
          </div>
          <div className="text-sm animate-pulse-orange" style={{ color: "var(--ash-text-dim)" }}>Авторизация через Steam...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 flex flex-col z-50" style={{ backgroundColor: "var(--ash-surface)" }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-4 h-14 flex-shrink-0" style={{ borderBottom: "1px solid var(--ash-border)" }}>
        <button onClick={onBack} className="flex items-center gap-2 hover:opacity-70 transition-opacity">
          <Icon name="ArrowLeft" size={16} style={{ color: "var(--ash-text-dim)" }} />
          <span className="text-sm" style={{ color: "var(--ash-text-dim)" }}>Назад</span>
        </button>
        <div className="flex items-center gap-2 ml-2">
          <div className="w-6 h-6 rounded flex items-center justify-center" style={{ backgroundColor: "var(--ash-orange)" }}>
            <span className="font-display font-black text-black text-xs">A</span>
          </div>
          <span className="font-display font-bold text-sm tracking-widest text-white">ASH</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-md mx-auto px-4 py-8">

          {/* Choose mode */}
          {mode === "choose" && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                {/* Steam logo simulation */}
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #1b2838, #2a475e)" }}>
                  <Icon name="Gamepad2" size={32} style={{ color: "#66c0f4" }} />
                </div>
                <h1 className="font-display font-bold text-2xl text-white mb-2">Подключение Steam</h1>
                <p className="text-sm leading-relaxed" style={{ color: "var(--ash-text-dim)" }}>
                  Ваш профиль, игры и статистика будут автоматически синхронизированы
                </p>
              </div>

              {/* Features */}
              <div className="space-y-2">
                {[
                  { icon: "User", text: "Ник и аватар из Steam-профиля" },
                  { icon: "Gamepad2", text: "Список игр и часы в них" },
                  { icon: "Globe", text: "Страна профиля" },
                  { icon: "RefreshCw", text: "Автообновление при входе" },
                ].map((f, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3 rounded-md"
                    style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)" }}>
                    <Icon name={f.icon} size={14} style={{ color: "var(--ash-orange)" }} />
                    <span className="text-sm" style={{ color: "var(--ash-text)" }}>{f.text}</span>
                  </div>
                ))}
              </div>

              {/* Buttons */}
              <div className="space-y-3">
                <button onClick={() => setMode("qr")}
                  className="w-full py-3.5 rounded-lg font-display font-semibold text-black flex items-center justify-center gap-3 transition-opacity hover:opacity-90"
                  style={{ backgroundColor: "var(--ash-orange)" }}>
                  <Icon name="QrCode" size={18} />
                  QR-код (мобильный)
                </button>
                <button onClick={() => setMode("manual")}
                  className="w-full py-3.5 rounded-lg font-display font-semibold flex items-center justify-center gap-3 transition-all"
                  style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)", color: "var(--ash-text)" }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--ash-orange)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--ash-border)")}>
                  <Icon name="Keyboard" size={18} />
                  Ввести Steam ID вручную
                </button>
              </div>

              <p className="text-xs text-center" style={{ color: "var(--ash-text-dim)" }}>
                Мы не получаем ваш пароль. Используется официальная Steam авторизация OpenID.
              </p>
            </div>
          )}

          {/* QR mode */}
          {mode === "qr" && (
            <div className="space-y-6 animate-fade-in">
              <div className="text-center">
                <h2 className="font-display font-bold text-xl text-white mb-1">QR-код для входа</h2>
                <p className="text-sm" style={{ color: "var(--ash-text-dim)" }}>
                  Отсканируйте камерой телефона, чтобы войти через Steam
                </p>
              </div>

              <div className="flex justify-center">
                <div className="p-4 rounded-xl" style={{ backgroundColor: "white" }}>
                  {qrValue ? (
                    <img src={qrValue} alt="Steam QR" width={200} height={200} className="block" />
                  ) : (
                    <div className="w-[200px] h-[200px] flex items-center justify-center">
                      <div className="text-sm text-gray-400">Загрузка...</div>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div className="text-center text-xs" style={{ color: "var(--ash-text-dim)" }}>или</div>
                <button onClick={handleOpenInBrowser} disabled={!openidUrl}
                  className="w-full py-3.5 rounded-lg font-display font-semibold flex items-center justify-center gap-3 transition-all"
                  style={{ backgroundColor: "#1b2838", color: "#66c0f4", border: "1px solid #2a475e" }}>
                  <Icon name="ExternalLink" size={16} />
                  Открыть Steam в браузере
                </button>
                <button onClick={() => setMode("choose")}
                  className="w-full py-2 rounded-lg text-sm transition-all"
                  style={{ color: "var(--ash-text-dim)" }}>
                  ← Назад к выбору
                </button>
              </div>

              <div className="px-4 py-3 rounded-md text-xs" style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)", color: "var(--ash-text-dim)" }}>
                После авторизации в Steam страница обновится автоматически
              </div>
            </div>
          )}

          {/* Manual mode */}
          {mode === "manual" && (
            <div className="space-y-5 animate-fade-in">
              <div className="text-center">
                <h2 className="font-display font-bold text-xl text-white mb-1">Ввод Steam ID</h2>
                <p className="text-sm" style={{ color: "var(--ash-text-dim)" }}>
                  Введите ваш числовой Steam ID (17 цифр) или ссылку на профиль
                </p>
              </div>

              {/* Instruction */}
              <div className="p-4 rounded-md space-y-2" style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)" }}>
                <div className="text-xs font-display uppercase tracking-wider" style={{ color: "var(--ash-orange)" }}>Как найти Steam ID</div>
                <div className="text-xs space-y-1" style={{ color: "var(--ash-text-dim)" }}>
                  <div>1. Откройте Steam → ваш профиль</div>
                  <div>2. В браузере скопируйте ссылку: <code className="px-1 rounded" style={{ backgroundColor: "var(--ash-surface-3)" }}>steamcommunity.com/profiles/<span style={{ color: "var(--ash-orange)" }}>76561198...</span></code></div>
                  <div>3. Или найдите ID: Настройки → Аккаунт</div>
                </div>
              </div>

              <div>
                <label className="text-xs uppercase font-display tracking-wider block mb-1.5" style={{ color: "var(--ash-text-dim)" }}>
                  Steam ID или ссылка на профиль
                </label>
                <input
                  value={manualId}
                  onChange={e => { setManualId(e.target.value); setError(""); setPreview(null); }}
                  placeholder="76561198000000000"
                  className="w-full px-3 py-3 text-sm text-white rounded-md focus:outline-none transition-colors font-mono-ash"
                  style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-border)" }}
                  onFocus={e => (e.currentTarget.style.borderColor = "var(--ash-orange)")}
                  onBlur={e => (e.currentTarget.style.borderColor = "var(--ash-border)")}
                />
              </div>

              {/* Preview */}
              {loadingPreview && (
                <div className="flex items-center gap-2 text-sm" style={{ color: "var(--ash-text-dim)" }}>
                  <Icon name="RefreshCw" size={13} className="animate-spin" />
                  Загружаем профиль Steam...
                </div>
              )}
              {preview && !loadingPreview && (
                <div className="flex items-center gap-3 p-4 rounded-md animate-fade-in"
                  style={{ backgroundColor: "var(--ash-surface-2)", border: "1px solid var(--ash-orange)", borderOpacity: 0.5 }}>
                  {preview.steam_avatar ? (
                    <img src={preview.steam_avatar} alt={preview.steam_nick}
                      className="w-12 h-12 rounded-md flex-shrink-0 object-cover" />
                  ) : (
                    <div className="w-12 h-12 rounded-md flex-shrink-0 flex items-center justify-center font-display font-bold text-lg"
                      style={{ backgroundColor: "var(--ash-surface-3)", color: "var(--ash-orange)" }}>
                      {preview.steam_nick.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white text-sm">{preview.steam_nick}</div>
                    <div className="text-xs mt-0.5 space-y-0.5" style={{ color: "var(--ash-text-dim)" }}>
                      {preview.games_count > 0 && <div>{preview.games_count} игр в библиотеке</div>}
                      {preview.steam_country && <div>Страна: {preview.steam_country}</div>}
                    </div>
                  </div>
                  <Icon name="CheckCircle" size={16} style={{ color: "#4ade80" }} />
                </div>
              )}

              {error && <div className="text-xs text-red-400">{error}</div>}

              <button onClick={handleManualAuth} disabled={loading || !manualId.trim()}
                className="w-full py-3.5 rounded-lg font-display font-semibold text-black flex items-center justify-center gap-2 transition-opacity"
                style={{ backgroundColor: "var(--ash-orange)", opacity: loading || !manualId.trim() ? 0.5 : 1 }}>
                {loading ? <><Icon name="RefreshCw" size={15} />Авторизация...</> : <><Icon name="LogIn" size={15} />Войти в ASH</>}
              </button>

              <button onClick={() => setMode("choose")}
                className="w-full py-2 rounded-lg text-sm"
                style={{ color: "var(--ash-text-dim)" }}>
                ← Назад к выбору
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
