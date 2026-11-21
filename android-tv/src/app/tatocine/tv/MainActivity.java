package app.tatocine.tv;

import android.app.Activity;
import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.KeyEvent;
import android.view.MotionEvent;
import android.view.View;
import android.view.ViewGroup;
import android.view.WindowManager;
import android.webkit.CookieManager;
import android.webkit.PermissionRequest;
import android.webkit.ServiceWorkerClient;
import android.webkit.ServiceWorkerController;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.Toast;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.HashMap;
import java.util.Map;

/**
 * TatoCine para Google TV / Android TV.
 * La app web va DENTRO de la APK (assets/site): no depende de Vercel ni de Netlify para abrir. Se sirve con un origen https propio
 * (appassets.androidplatform.net, el reservado por Android para esto), así funcionan localStorage, el Service Worker (caché de TMDB e imágenes)
 * y la CSP igual que en la web. Solo TMDB y los reproductores de terceros usan Internet.
 * Mando: la cruceta y OK llegan a la página como flechas y Enter (la app ya navega con el foco); ATRÁS cierra lo abierto y, en Inicio, pide
 * pulsarlo otra vez para salir. Los vídeos de los reproductores pueden ir a pantalla completa (onShowCustomView).
 */
public class MainActivity extends Activity {
    static final String HOST = "appassets.androidplatform.net";
    static final String START = "https://" + HOST + "/index.html";

    private WebView web;
    private FrameLayout root;
    private View fullView;
    private WebChromeClient.CustomViewCallback fullCallback;
    private long lastBack;
    private final String token = java.util.UUID.randomUUID().toString();
    private PointerView pointer;
    private boolean pointerOn, pointerHidden;
    private int revealKey = -1;
    /** Pantalla completa: el puntero se oculta tras 3 s sin tocar el mando (como un ratón en YouTube o Netflix) */
    private final Runnable hidePointer = new Runnable() {
        @Override
        public void run() {
            if (!pointerOn || fullView == null || downPending) return;
            pointerHidden = true;
            pointer.setVisibility(View.GONE);
            // Si el ratón quedó sobre la barra de controles (p. ej. tras pulsar «pantalla completa»), muchos reproductores (videoapi) la dejan visible:
            // se aparta al centro del vídeo y luego «sale», y el reproductor oculta sus controles. El puntero vuelve a su sitio al mostrarse.
            float sx = px, sy = py;
            hover();                                            // primero un movimiento donde está: la vista de pantalla completa (recién añadida) queda registrada bajo el ratón
            px = -40f; py = -40f;                               // y luego fuera de la pantalla: Android le entrega la «salida» y el reproductor oculta sus controles (:hover)
            hover();
            generic(MotionEvent.ACTION_HOVER_EXIT, 0);
            if (fullView != null) {
                MotionEvent ex = pointerEvent(MotionEvent.ACTION_HOVER_EXIT, android.view.InputDevice.SOURCE_MOUSE, MotionEvent.TOOL_TYPE_MOUSE, 0);
                fullView.dispatchGenericMotionEvent(ex);
                ex.recycle();
            }
            px = sx; py = sy;
        }
    };

    private void schedulePointerHide() {
        root.removeCallbacks(hidePointer);
        if (pointerOn && fullView != null) root.postDelayed(hidePointer, 3000);
    }

    private void showPointerAgain() {
        root.removeCallbacks(hidePointer);
        pointerHidden = false;
        if (pointerOn) { pointer.setVisibility(View.VISIBLE); pointer.bringToFront(); placePointer(); }
    }
    private float px, py;
    private long touchDown, lastMove;
    private boolean downPending, upPending;
    static final int REQ_VOICE = 41;
    private volatile String playerUrl;
    private String userAgent;
    /** Reproductores de terceros: animaciones infinitas (zoom lento del fondo, onda del botón «play») y desenfoques (backdrop-filter) que la TV recalcula en
     *  cada cuadro. Medido en una Xiaomi MZTU0: con el reproductor abierto, la app pasaba de 3 % a 112 % de CPU solo por eso, y el vídeo perdía cuadros. */
    static final String PLAYER_STYLE = "<style id=\"tatocine-tv\">*,*::before,*::after{animation:none!important;transition:none!important;"
            + "backdrop-filter:none!important;-webkit-backdrop-filter:none!important}</style>"
            // En una TV no hay orientación que bloquear: screen.orientation.lock() rechaza y algunos reproductores abortan la pantalla completa. Se ignora el error.
            + "<script>try{var so=screen.orientation;if(so&&so.lock){var l=so.lock.bind(so);so.lock=function(){return l.apply(null,arguments).catch(function(){})}}}catch(e){}</script>";

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_FULLSCREEN);
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        pointer = new PointerView(this);
        pointer.setVisibility(View.GONE);
        root.addView(pointer, new FrameLayout.LayoutParams(64, 64));                // se ajusta al tamaño de la flecha en placePointer()
        setContentView(root);
        hideSystemUi();
        preferHighestRefreshRate();

        //@DEBUG@
        WebSettings s = web.getSettings();
        s.setJavaScriptEnabled(true);
        s.setDomStorageEnabled(true);
        s.setDatabaseEnabled(true);
        s.setMediaPlaybackRequiresUserGesture(false);
        s.setUseWideViewPort(true);                 // respeta la <meta viewport> (la app se ve al 90 % en TV)
        s.setLoadWithOverviewMode(true);
        s.setTextZoom(100);                         // el tamaño de letra del sistema no deforma la app
        s.setSupportZoom(false);
        s.setBuiltInZoomControls(false);
        s.setDisplayZoomControls(false);
        s.setSupportMultipleWindows(false);         // sin ventanas emergentes (anuncios de los reproductores)
        s.setJavaScriptCanOpenWindowsAutomatically(false);
        s.setAllowFileAccess(false);
        s.setAllowContentAccess(false);
        s.setCacheMode(WebSettings.LOAD_DEFAULT);
        if (Build.VERSION.SDK_INT >= 21) s.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        // En un televisor la web lo detecta (html.tc-tv: escala al 90 %, foco visible para el mando); en teléfonos y tabletas se usa como app normal
        s.setUserAgentString(s.getUserAgentString() + (isTv() ? " TatoCineTV/1.0 (Android TV)" : " TatoCineApp/1.0"));
        userAgent = s.getUserAgentString();

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= 21) cm.setAcceptThirdPartyCookies(web, true);    // algunos reproductores las necesitan

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                if (blocked(request.getUrl())) return emptyResponse(!request.isForMainFrame() && isDocument(request));
                WebResourceResponse p = playerDocument(request);
                return p != null ? p : asset(request.getUrl());
            }

            @SuppressWarnings("deprecation")
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, String url) {
                return asset(Uri.parse(url));
            }

            /** La ventana principal nunca sale de la app (redirecciones de anuncios); los reproductores van en marcos y no pasan por aquí. */
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri u = request.getUrl();
                return !(u != null && HOST.equals(u.getHost()));
            }

            @SuppressWarnings("deprecation")
            @Override
            public boolean shouldOverrideUrlLoading(WebView view, String url) {
                Uri u = Uri.parse(url);
                return !(u != null && HOST.equals(u.getHost()));
            }

            @Override
            public void onPageFinished(WebView view, String url) {
                Uri u = url == null ? null : Uri.parse(url);
                if (u != null && HOST.equals(u.getHost())) view.evaluateJavascript("window.__tcNT=" + org.json.JSONObject.quote(token) + ";", null);
                setPointer(false, 0.5f, 0.5f);                    // una página nueva nunca hereda el puntero
            }

            @Override
            public boolean onRenderProcessGone(WebView view, android.webkit.RenderProcessGoneDetail detail) {
                recreate();                          // si el motor del WebView se cae (poca memoria), la app se recupera sola
                return true;
            }
        });

        web.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onShowCustomView(View view, CustomViewCallback callback) {   // pantalla completa de los reproductores
                if (fullView != null) { callback.onCustomViewHidden(); return; }
                fullView = view;
                fullCallback = callback;
                root.addView(view, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
                web.setVisibility(View.GONE);
                pointer.bringToFront();
                schedulePointerHide();
                hideSystemUi();
            }

            @Override
            public void onHideCustomView() { exitFullscreen(); }

            @Override
            public boolean onCreateWindow(WebView view, boolean dialog, boolean userGesture, android.os.Message resultMsg) { return false; }

            @Override
            public void onPermissionRequest(PermissionRequest request) { request.deny(); }

            @Override
            public Bitmap getDefaultVideoPoster() {            // sin el ícono gris de «play» de Android sobre los vídeos
                return Bitmap.createBitmap(1, 1, Bitmap.Config.ARGB_8888);
            }
        });

        if (Build.VERSION.SDK_INT >= 24) {
            try {
                ServiceWorkerController.getInstance().setServiceWorkerClient(new ServiceWorkerClient() {
                    @Override
                    public WebResourceResponse shouldInterceptRequest(WebResourceRequest request) { return asset(request.getUrl()); }
                });
            } catch (Throwable ignored) { }
        }

        // Puente con la web (TatoNative). addJavascriptInterface lo inyecta en TODOS los marcos, también en los reproductores de terceros: por eso cada acción
        // exige un token aleatorio que solo recibe la página principal de la app (onPageFinished → evaluateJavascript, que corre solo en el marco principal).
        web.addJavascriptInterface(new NativeBridge(), "TatoNative");

        web.setFocusable(true);
        web.setFocusableInTouchMode(true);
        web.requestFocus();
        if (state != null) web.restoreState(state);
        else web.loadUrl(START);
        if (!online()) Toast.makeText(this, "Sin conexión a Internet: el catálogo y los reproductores la necesitan.", Toast.LENGTH_LONG).show();
    }

    /**
     * Documento del reproductor (la URL exacta que avisó la página): se descarga aquí, se le añade PLAYER_STYLE en <head> y se entrega al WebView. Si algo no
     * cuadra (redirección, error, otro tipo, página enorme…) devuelve null y el WebView lo carga como siempre: nunca se rompe la reproducción.
     */
    private WebResourceResponse playerDocument(WebResourceRequest r) {
        String target = playerUrl;
        if (target == null || r == null || r.isForMainFrame() || !"GET".equalsIgnoreCase(r.getMethod())) return null;
        Uri u = r.getUrl();
        if (u == null || !target.equals(u.toString())) return null;
        playerUrl = null;                                                       // una sola vez por carga (las recargas internas del reproductor van normales)
        java.net.HttpURLConnection c = null;
        try {
            c = (java.net.HttpURLConnection) new java.net.URL(target).openConnection();
            c.setInstanceFollowRedirects(false);
            c.setConnectTimeout(8000);
            c.setReadTimeout(15000);
            Map<String, String> h = r.getRequestHeaders();
            if (h != null) for (Map.Entry<String, String> e : h.entrySet()) {
                String k = e.getKey();
                if (k == null || k.equalsIgnoreCase("Accept-Encoding") || k.equalsIgnoreCase("Host") || k.equalsIgnoreCase("Cookie")) continue;
                c.setRequestProperty(k, e.getValue());
            }
            if (userAgent != null) c.setRequestProperty("User-Agent", userAgent);
            if (h == null || !(h.containsKey("Referer") || h.containsKey("referer"))) c.setRequestProperty("Referer", "https://" + HOST + "/");   // referrerpolicy="origin"
            String ck = CookieManager.getInstance().getCookie(target);
            if (ck != null) c.setRequestProperty("Cookie", ck);
            int code = c.getResponseCode();
            Map<String, java.util.List<String>> rh = c.getHeaderFields();
            java.util.List<String> set = rh.get("Set-Cookie");
            if (set != null) for (String v : set) CookieManager.getInstance().setCookie(target, v);
            String ct = c.getContentType();
            if (code != 200 || ct == null || !ct.toLowerCase(java.util.Locale.ROOT).contains("text/html")) { c.disconnect(); return null; }
            String cs = "utf-8";
            java.util.regex.Matcher m = java.util.regex.Pattern.compile("charset=([\\w-]+)", java.util.regex.Pattern.CASE_INSENSITIVE).matcher(ct);
            if (m.find()) cs = m.group(1);
            InputStream in = c.getInputStream();
            java.io.ByteArrayOutputStream bo = new java.io.ByteArrayOutputStream();
            byte[] buf = new byte[16384];
            int n;
            while ((n = in.read(buf)) > 0) { bo.write(buf, 0, n); if (bo.size() > 4 * 1024 * 1024) { c.disconnect(); return null; } }
            in.close();
            String html = new String(bo.toByteArray(), cs);
            int hd = html.toLowerCase(java.util.Locale.ROOT).indexOf("<head");
            int end = hd >= 0 ? html.indexOf('>', hd) : -1;
            html = end >= 0 ? html.substring(0, end + 1) + PLAYER_STYLE + html.substring(end + 1) : PLAYER_STYLE + html;
            Map<String, String> out = new HashMap<>();
            for (Map.Entry<String, java.util.List<String>> e : rh.entrySet()) {
                String k = e.getKey();
                if (k == null || e.getValue() == null) continue;
                String lk = k.toLowerCase(java.util.Locale.ROOT);
                if (lk.startsWith("content-security-policy") || lk.equals("content-length") || lk.equals("content-encoding") || lk.equals("transfer-encoding") || lk.equals("set-cookie")) continue;
                out.put(k, android.text.TextUtils.join(", ", e.getValue()));
            }
            return new WebResourceResponse("text/html", cs, 200, "OK", out, new ByteArrayInputStream(html.getBytes(cs)));
        } catch (Throwable t) {
            if (c != null) try { c.disconnect(); } catch (Throwable ignored) { }
            return null;
        }
    }

    /**
     * Anuncios y rastreadores que cargan los reproductores de terceros (medido en la TV: ENG1 cargaba histats, dtscout, crwdcntrl, mrktmtrcs, onaudience; ESP5,
     * premilkyway). Se responden vacíos: menos red y CPU en la TV. Solo dominios de publicidad/estadística conocidos: NUNCA los que sirven el vídeo.
     */
    static final String[] BLOCK = {
            "premilkyway.com", "histats.com", "dtscout.com", "dtscdn.com", "crwdcntrl.net", "mrktmtrcs.net", "onaudience.com", "cloudflareinsights.com",
            "doubleclick.net", "googlesyndication.com", "googleadservices.com", "google-analytics.com", "googletagmanager.com", "adservice.google.com",
            "popads.net", "popcash.net", "propellerads.com", "adsterra.com", "a-ads.com", "exoclick.com", "juicyads.com", "onclickads.net", "adcash.com",
            "hilltopads.net", "mgid.com", "taboola.com", "outbrain.com", "clickadu.com", "yandex.ru", "mc.yandex.com", "scorecardresearch.com", "quantserve.com"
    };

    static boolean blocked(Uri u) {
        String h = u == null ? null : u.getHost();
        if (h == null) return false;
        h = h.toLowerCase(java.util.Locale.ROOT);
        for (String b : BLOCK) if (h.equals(b) || h.endsWith("." + b)) return true;
        return false;
    }

    static boolean isDocument(WebResourceRequest r) {
        Map<String, String> h = r.getRequestHeaders();
        String a = h == null ? null : (h.containsKey("Accept") ? h.get("Accept") : h.get("accept"));
        return a != null && a.startsWith("text/html");
    }

    private WebResourceResponse emptyResponse(boolean html) {
        return new WebResourceResponse(html ? "text/html" : "text/plain", "utf-8", 200, "OK", new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
    }

    /** Archivos de la app servidos desde assets/site con su tipo correcto (el ?v= de las rutas se ignora). */
    private WebResourceResponse asset(Uri u) {
        if (u == null || !HOST.equals(u.getHost())) return null;
        String path = u.getPath();
        if (path == null || path.equals("/") || path.isEmpty()) path = "/index.html";
        path = path.substring(1);
        if (path.contains("..")) return notFound();
        try {
            InputStream in = getAssets().open("site/" + path);
            String mime = mime(path);
            WebResourceResponse res = new WebResourceResponse(mime, mime.startsWith("text/") || mime.contains("javascript") || mime.contains("json") || mime.contains("xml") ? "utf-8" : null, in);
            if (Build.VERSION.SDK_INT >= 21) {
                Map<String, String> h = new HashMap<>();
                h.put("Cache-Control", path.equals("index.html") || path.equals("sw.js") || path.equals("build.json") ? "no-cache" : "max-age=31536000");
                h.put("Access-Control-Allow-Origin", "https://" + HOST);
                if (path.equals("sw.js")) h.put("Service-Worker-Allowed", "/");
                res.setResponseHeaders(h);
            }
            return res;
        } catch (IOException e) {
            return notFound();
        }
    }

    private WebResourceResponse notFound() {
        if (Build.VERSION.SDK_INT >= 21) {
            return new WebResourceResponse("text/plain", "utf-8", 404, "Not Found", new HashMap<String, String>(), new ByteArrayInputStream(new byte[0]));
        }
        return new WebResourceResponse("text/plain", "utf-8", new ByteArrayInputStream(new byte[0]));
    }

    private static String mime(String p) {
        String l = p.toLowerCase();
        if (l.endsWith(".html")) return "text/html";
        if (l.endsWith(".js")) return "application/javascript";
        if (l.endsWith(".css")) return "text/css";
        if (l.endsWith(".json")) return "application/json";
        if (l.endsWith(".webmanifest")) return "application/manifest+json";
        if (l.endsWith(".png")) return "image/png";
        if (l.endsWith(".jpg") || l.endsWith(".jpeg")) return "image/jpeg";
        if (l.endsWith(".webp")) return "image/webp";
        if (l.endsWith(".svg")) return "image/svg+xml";
        if (l.endsWith(".ico")) return "image/x-icon";
        if (l.endsWith(".woff2")) return "font/woff2";
        if (l.endsWith(".txt")) return "text/plain";
        if (l.endsWith(".xml")) return "application/xml";
        return "application/octet-stream";
    }

    private boolean isTv() {
        try {
            android.app.UiModeManager ui = (android.app.UiModeManager) getSystemService(Context.UI_MODE_SERVICE);
            if (ui != null && ui.getCurrentModeType() == android.content.res.Configuration.UI_MODE_TYPE_TELEVISION) return true;
            return getPackageManager().hasSystemFeature("android.software.leanback") || getPackageManager().hasSystemFeature("android.hardware.type.television");
        } catch (Throwable t) { return false; }
    }

    private boolean online() {
        try {
            ConnectivityManager cm = (ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE);
            NetworkInfo ni = cm == null ? null : cm.getActiveNetworkInfo();
            return ni != null && ni.isConnected();
        } catch (Throwable t) { return true; }
    }

    private void exitFullscreen() {
        if (fullView == null) return;
        revealKey = -1;
        root.removeView(fullView);
        fullView = null;
        if (fullCallback != null) fullCallback.onCustomViewHidden();
        fullCallback = null;
        web.setVisibility(View.VISIBLE);
        web.requestFocus();
        showPointerAgain();                                     // en el modal normal el puntero se ve siempre
        hideSystemUi();
    }

    /**
     * 60 / 120 Hz: pide al televisor el modo de MAYOR frecuencia con la misma resolución (p. ej. 120 Hz si el panel lo tiene; si solo tiene 60 Hz se queda en 60).
     * El WebView dibuja al ritmo de la pantalla (vsync), así el desplazamiento y el foco del mando van a 120 cuadros por segundo donde se pueda.
     */
    private void preferHighestRefreshRate() {
        if (Build.VERSION.SDK_INT < 23) return;
        try {
            android.view.Display d = getWindowManager().getDefaultDisplay();
            android.view.Display.Mode cur = d.getMode(), best = cur;
            for (android.view.Display.Mode m : d.getSupportedModes()) {
                if (m.getPhysicalWidth() == cur.getPhysicalWidth() && m.getPhysicalHeight() == cur.getPhysicalHeight() && m.getRefreshRate() > best.getRefreshRate() + 0.5f) best = m;
            }
            WindowManager.LayoutParams lp = getWindow().getAttributes();
            lp.preferredDisplayModeId = best.getModeId();
            lp.preferredRefreshRate = best.getRefreshRate();
            getWindow().setAttributes(lp);
        } catch (Throwable ignored) { }
    }

    private void hideSystemUi() {
        getWindow().getDecorView().setSystemUiVisibility(View.SYSTEM_UI_FLAG_FULLSCREEN | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
                | View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
                | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION);
    }

    /** ATRÁS del mando: primero sale de la pantalla completa; luego la app cierra lo abierto (window.tcHandleBack); en Inicio, dos veces para salir. */
    @Override
    public void onBackPressed() {
        if (fullView != null) { exitFullscreen(); return; }
        web.evaluateJavascript("(window.tcHandleBack && window.tcHandleBack()) ? '1' : '0'", new ValueCallback<String>() {
            @Override
            public void onReceiveValue(String v) {
                if (v != null && v.contains("1")) return;
                long now = System.currentTimeMillis();
                if (now - lastBack < 2200) { finish(); return; }
                lastBack = now;
                Toast.makeText(MainActivity.this, "Pulsa Atrás otra vez para salir", Toast.LENGTH_SHORT).show();
            }
        });
    }

    /** Teclas de algunos mandos que no llegan como «Atrás» (Escape / B de mandos de juego) */
    @Override
    public boolean dispatchKeyEvent(KeyEvent e) {
        int k = e.getKeyCode();
        if (pointerOn && pointerKey(e)) return true;
        if (k == KeyEvent.KEYCODE_SEARCH) {                            // botón de búsqueda/voz de algunos mandos: búsqueda por voz de la app
            if (e.getAction() == KeyEvent.ACTION_UP) startVoice(null);
            return true;
        }
        if ((k == KeyEvent.KEYCODE_ESCAPE || k == KeyEvent.KEYCODE_BUTTON_B) && fullView == null) {
            if (e.getAction() == KeyEvent.ACTION_UP) onBackPressed();
            return true;
        }
        return super.dispatchKeyEvent(e);
    }

    /** Puente JS. Todo lo que cambia algo pide el token de la página principal (los reproductores de terceros no lo tienen). */
    final class NativeBridge {
        private boolean ok(String t) { return t != null && token.equals(t); }

        @android.webkit.JavascriptInterface
        public void showKeyboard(String t) {
            if (!ok(t)) return;
            runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    android.view.inputmethod.InputMethodManager imm = (android.view.inputmethod.InputMethodManager) getSystemService(Context.INPUT_METHOD_SERVICE);
                    if (!web.hasFocus()) web.requestFocus();      // si ya tiene el foco NO se pide otra vez: el WebView lo tomaría como «entrar desde arriba» y movería el foco al menú
                    if (imm != null) imm.showSoftInput(web, android.view.inputmethod.InputMethodManager.SHOW_IMPLICIT);
                }
            });
        }

        /** Puntero virtual (reproductor): fx/fy = posición inicial en fracción de la pantalla. */
        @android.webkit.JavascriptInterface
        public void setPointer(String t, final boolean on, final double fx, final double fy) {
            if (!ok(t)) return;
            runOnUiThread(new Runnable() { @Override public void run() { MainActivity.this.setPointer(on, (float) fx, (float) fy); } });
        }

        /** ¿Hay reconocimiento de voz del sistema (Google TV: el micrófono del mando)? No cambia nada: no pide token. */
        @android.webkit.JavascriptInterface
        public boolean hasVoice() { return voiceAvailable(); }

        /** URL del reproductor que la página va a cargar: SOLO ese documento recibe el estilo sin animaciones (playerDocument) */
        @android.webkit.JavascriptInterface
        public void playerUrl(String t, String url) {
            if (!ok(t) || url == null || !url.startsWith("https://")) return;
            playerUrl = url;
        }

        @android.webkit.JavascriptInterface
        public void voiceStop(String t) {
            if (!ok(t)) return;
            runOnUiThread(new Runnable() { @Override public void run() { stopVoice(); } });
        }

        @android.webkit.JavascriptInterface
        public void voiceSearch(String t, final String lang) {
            if (!ok(t)) return;
            runOnUiThread(new Runnable() { @Override public void run() { startVoice(lang); } });
        }
    }

    // ---------- Puntero virtual (solo en el reproductor) ----------
    /** El vídeo va en un iframe de otro sitio: la página no puede mover el foco dentro de él. El puntero lo dibuja Android encima de todo (también en pantalla completa):
     *  flechas = mover (acelera si se mantiene pulsada; en el borde desplaza), OK = toque en ese punto (llega al iframe como un dedo), Atrás = lo de siempre. */
    void setPointer(boolean on, float fx, float fy) {
        if (pointer == null) return;
        if (on && !pointerOn) {
            int w = root.getWidth(), h = root.getHeight();
            px = clamp(fx, 0.02f, 0.98f) * (w > 0 ? w : 1920);
            py = clamp(fy, 0.02f, 0.98f) * (h > 0 ? h : 1080);
        }
        pointerOn = on;
        pointerHidden = false;
        revealKey = -1;
        root.removeCallbacks(hidePointer);
        pointer.setVisibility(on ? View.VISIBLE : View.GONE);
        pointer.bringToFront();
        placePointer();
        if (on) hover();
    }

    /** El puntero es una vista del tamaño de la flecha que solo se DESPLAZA (translation: la GPU la mueve sin redibujar). Antes era una capa de pantalla
     *  completa que se volvía a dibujar entera en cada pulsación de flecha. */
    private void placePointer() {
        int h = root.getHeight() > 0 ? root.getHeight() : 1080, size = Math.round(h * 0.034f * 1.3f) + 12;
        ViewGroup.LayoutParams lp = pointer.getLayoutParams();
        if (lp != null && (lp.width != size || lp.height != size)) { lp.width = size; lp.height = size; pointer.setLayoutParams(lp); pointer.invalidate(); }
        pointer.setTranslationX(px);
        pointer.setTranslationY(py);
    }

    private static float clamp(float v, float a, float b) { return v < a ? a : (v > b ? b : v); }

    /** true si la tecla la usó el puntero */
    private boolean pointerKey(KeyEvent e) {
        int k = e.getKeyCode(), a = e.getAction();
        boolean nav = k == KeyEvent.KEYCODE_DPAD_LEFT || k == KeyEvent.KEYCODE_DPAD_RIGHT || k == KeyEvent.KEYCODE_DPAD_UP || k == KeyEvent.KEYCODE_DPAD_DOWN
                || k == KeyEvent.KEYCODE_DPAD_CENTER || k == KeyEvent.KEYCODE_ENTER || k == KeyEvent.KEYCODE_NUMPAD_ENTER || k == KeyEvent.KEYCODE_BUTTON_A;
        if (!nav) return false;
        if (revealKey == k) {                                   // resto de la pulsación que solo mostró el puntero
            if (a == KeyEvent.ACTION_UP) revealKey = -1;
            return true;
        }
        if (pointerHidden && a == KeyEvent.ACTION_DOWN) {
            showPointerAgain();
            hover();
            revealKey = k;
            lastMove = android.os.SystemClock.uptimeMillis();
            schedulePointerHide();
            return true;
        }
        schedulePointerHide();
        boolean ok = k == KeyEvent.KEYCODE_DPAD_CENTER || k == KeyEvent.KEYCODE_ENTER || k == KeyEvent.KEYCODE_NUMPAD_ENTER || k == KeyEvent.KEYCODE_BUTTON_A;
        if (ok) {
            if (a == KeyEvent.ACTION_DOWN && e.getRepeatCount() == 0) {
                long now = android.os.SystemClock.uptimeMillis();
                if (now - lastMove > 1500) {                  // controles del reproductor ocultos: el primer clic solo los mostraba
                    px += 1f; hover(); px -= 1f; hover();     // micro-movimiento: Chromium no avisa «mousemove» si el ratón no se movió
                    downPending = true; upPending = false;
                    root.postDelayed(new Runnable() {
                        @Override
                        public void run() {
                            downPending = false;
                            touch(MotionEvent.ACTION_DOWN);
                            if (upPending) { upPending = false; touch(MotionEvent.ACTION_UP); }
                        }
                    }, 450);                                      // los reproductores (Plyr…) tardan ~0,4 s en mostrar sus controles
                } else touch(MotionEvent.ACTION_DOWN);
                lastMove = now;
            } else if (a == KeyEvent.ACTION_UP) {
                if (downPending) upPending = true;
                else touch(MotionEvent.ACTION_UP);
            }
            return true;
        }
        int dx = 0, dy = 0;
        if (k == KeyEvent.KEYCODE_DPAD_LEFT) dx = -1;
        else if (k == KeyEvent.KEYCODE_DPAD_RIGHT) dx = 1;
        else if (k == KeyEvent.KEYCODE_DPAD_UP) dy = -1;
        else if (k == KeyEvent.KEYCODE_DPAD_DOWN) dy = 1;
        else return false;
        if (a != KeyEvent.ACTION_DOWN) return true;
        int w = root.getWidth(), h = root.getHeight();
        float step = h * (0.015f + Math.min(e.getRepeatCount(), 15) * 0.005f);       // 1,5 % de la altura por pulsación (preciso para botones pequeños) y acelera hasta 9 % manteniendo pulsado
        float nx = px + dx * step, ny = py + dy * step, m = 2f;
        if (dy != 0 && (ny < m || ny > h - m)) scroll(dy);                             // en el borde: desplaza la página o el panel
        if (dx != 0 && (nx < m || nx > w - m)) scroll(0, dx);
        px = clamp(nx, m, w - m);
        py = clamp(ny, m, h - m);
        placePointer();
        hover();
        lastMove = android.os.SystemClock.uptimeMillis();
        return true;
    }

    private MotionEvent pointerEvent(int action, int source, int toolType) { return pointerEvent(action, source, toolType, 0); }

    private MotionEvent pointerEvent(int action, int source, int toolType, int buttons) {
        long now = android.os.SystemClock.uptimeMillis();
        MotionEvent.PointerProperties[] pp = { new MotionEvent.PointerProperties() };
        pp[0].id = 0;
        pp[0].toolType = toolType;
        MotionEvent.PointerCoords[] pc = { new MotionEvent.PointerCoords() };
        pc[0].x = px;
        pc[0].y = py;
        pc[0].pressure = 1f;
        pc[0].size = 1f;
        long down = action == MotionEvent.ACTION_DOWN ? now : (touchDown > 0 ? touchDown : now);
        if (action == MotionEvent.ACTION_DOWN) touchDown = now;
        return MotionEvent.obtain(down, now, action, 1, pp, pc, 0, buttons, 1f, 1f, 0, 0, source, 0);
    }

    private static java.lang.reflect.Method setActionButton;
    private static boolean actionButtonTried, mouseOk = true;

    /** MotionEvent.setActionButton no es público: sin él Chromium descarta el BUTTON_PRESS. Si el sistema no lo deja usar, se vuelve al toque de dedo. */
    private static boolean withButton(MotionEvent ev) {
        if (Build.VERSION.SDK_INT < 23) return false;
        try {
            if (!actionButtonTried) { actionButtonTried = true; setActionButton = MotionEvent.class.getMethod("setActionButton", int.class); }
            if (setActionButton == null) return false;
            setActionButton.invoke(ev, MotionEvent.BUTTON_PRIMARY);
            return true;
        } catch (Throwable t) { setActionButton = null; return false; }
    }

    private void generic(int action, int buttons) {
        MotionEvent ev = pointerEvent(action, android.view.InputDevice.SOURCE_MOUSE, MotionEvent.TOOL_TYPE_MOUSE, buttons);
        root.dispatchGenericMotionEvent(ev);
        ev.recycle();
    }

    /** OK = clic en el punto del puntero, con la MISMA secuencia que un ratón real (salir del hover → bajar → pulsar botón → soltar → subir → hover). Es un clic de
     *  RATÓN y no un toque: con un toque, muchos reproductores solo muestran u ocultan sus controles y el botón (pantalla completa, pausa…) no se pulsaba.
     *  Si el sistema no permite marcar el botón del ratón, se usa el toque de dedo de siempre. */
    private void touch(int action) {
        int src = android.view.InputDevice.SOURCE_MOUSE, tool = MotionEvent.TOOL_TYPE_MOUSE;
        if (mouseOk) {
            if (action == MotionEvent.ACTION_DOWN) {
                MotionEvent press = pointerEvent(MotionEvent.ACTION_BUTTON_PRESS, src, tool, MotionEvent.BUTTON_PRIMARY);
                if (withButton(press)) {
                    generic(MotionEvent.ACTION_HOVER_EXIT, 0);
                    MotionEvent down = pointerEvent(MotionEvent.ACTION_DOWN, src, tool, MotionEvent.BUTTON_PRIMARY);
                    root.dispatchTouchEvent(down);
                    down.recycle();
                    root.dispatchTouchEvent(press);            // Chromium toma BUTTON_PRESS/RELEASE del flujo táctil del ratón (por la vía genérica lo ignoraba)
                    press.recycle();
                    return;
                }
                press.recycle();
                mouseOk = false;                                    // sin setActionButton: toque de dedo
            } else {
                MotionEvent rel = pointerEvent(MotionEvent.ACTION_BUTTON_RELEASE, src, tool, 0);
                withButton(rel);
                root.dispatchTouchEvent(rel);
                rel.recycle();
                MotionEvent up = pointerEvent(MotionEvent.ACTION_UP, src, tool, 0);
                root.dispatchTouchEvent(up);
                up.recycle();
                touchDown = 0;
                generic(MotionEvent.ACTION_HOVER_ENTER, 0);
                hover();
                return;
            }
        }
        MotionEvent ev = pointerEvent(action, android.view.InputDevice.SOURCE_TOUCHSCREEN, MotionEvent.TOOL_TYPE_FINGER);
        root.dispatchTouchEvent(ev);
        ev.recycle();
        if (action == MotionEvent.ACTION_UP) touchDown = 0;
    }

    /** Ratón «encima»: muchos reproductores muestran sus controles al mover el ratón */
    private void hover() {
        MotionEvent ev = pointerEvent(MotionEvent.ACTION_HOVER_MOVE, android.view.InputDevice.SOURCE_MOUSE, MotionEvent.TOOL_TYPE_MOUSE);
        root.dispatchGenericMotionEvent(ev);
        ev.recycle();
    }

    private void scroll(int dy) { scroll(dy, 0); }

    private void scroll(int dy, int dx) {
        MotionEvent.PointerCoords pc = new MotionEvent.PointerCoords();
        pc.x = px; pc.y = py;
        pc.setAxisValue(MotionEvent.AXIS_VSCROLL, -dy);
        pc.setAxisValue(MotionEvent.AXIS_HSCROLL, dx);
        MotionEvent.PointerProperties pp = new MotionEvent.PointerProperties();
        pp.id = 0; pp.toolType = MotionEvent.TOOL_TYPE_MOUSE;
        long now = android.os.SystemClock.uptimeMillis();
        MotionEvent s = MotionEvent.obtain(now, now, MotionEvent.ACTION_SCROLL, 1, new MotionEvent.PointerProperties[] { pp }, new MotionEvent.PointerCoords[] { pc }, 0, 0, 1f, 1f, 0, 0, android.view.InputDevice.SOURCE_MOUSE, 0);
        root.dispatchGenericMotionEvent(s);
        s.recycle();
    }

    /** Flecha blanca con borde negro y sombra, del tamaño de un puntero de TV (3,4 % de la altura). */
    final class PointerView extends View {
        private final android.graphics.Paint fill = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
        private final android.graphics.Paint edge = new android.graphics.Paint(android.graphics.Paint.ANTI_ALIAS_FLAG);
        private final android.graphics.Path path = new android.graphics.Path();
        private float built = -1;

        PointerView(Context c) {
            super(c);
            setClickable(false);
            setFocusable(false);
            fill.setColor(Color.WHITE);
            fill.setStyle(android.graphics.Paint.Style.FILL);
            fill.setShadowLayer(6f, 2f, 3f, 0x99000000);
            edge.setColor(Color.BLACK);
            edge.setStyle(android.graphics.Paint.Style.STROKE);
            edge.setStrokeJoin(android.graphics.Paint.Join.ROUND);
            setLayerType(View.LAYER_TYPE_SOFTWARE, null);     // la sombra del Paint solo se dibuja en software (es una vista diminuta)
        }

        @Override
        public boolean onTouchEvent(MotionEvent e) { return false; }

        @Override
        protected void onDraw(android.graphics.Canvas c) {
            float s = (getHeight() - 12) / 1.3f;                // la vista mide la flecha (+ margen para la sombra)
            if (s != built) {
                built = s;
                path.reset();
                path.moveTo(0, 0);
                path.lineTo(0, s);
                path.lineTo(s * 0.27f, s * 0.76f);
                path.lineTo(s * 0.46f, s * 1.16f);
                path.lineTo(s * 0.62f, s * 1.08f);
                path.lineTo(s * 0.43f, s * 0.70f);
                path.lineTo(s * 0.78f, s * 0.70f);
                path.close();
                edge.setStrokeWidth(Math.max(2f, s * 0.08f));
            }
            c.save();
            c.translate(2, 2);
            c.drawPath(path, fill);
            c.drawPath(path, edge);
            c.restore();
        }
    }

    // ---------- Búsqueda por voz con el micrófono del mando (reconocimiento de Google TV) ----------
    private boolean voiceAvailable() {
        try {
            return !getPackageManager().queryIntentActivities(new android.content.Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH), 0).isEmpty();
        } catch (Throwable t) { return false; }
    }

    // La TV no tiene micrófono propio: el audio llega por el micrófono del mando y solo lo sabe abrir el servicio de voz de Google TV (katniss).
    // Se usa ese servicio DENTRO de la app (SpeechRecognizer): pide el permiso de micrófono la primera vez, el texto aparece en el buscador mientras se habla
    // (resultados parciales) y al terminar se busca. Antes se abría la ventana de voz de Google como actividad y no devolvía el texto a la app.
    private android.speech.SpeechRecognizer recognizer;
    private String voiceLang = "es-419";
    private boolean voiceFallbackTried;
    static final int REQ_MIC = 42;

    void startVoice(String lang) {
        voiceLang = lang != null && lang.startsWith("en") ? "en-US" : "es-419";
        voiceFallbackTried = false;
        if (Build.VERSION.SDK_INT >= 23 && checkSelfPermission(android.Manifest.permission.RECORD_AUDIO) != android.content.pm.PackageManager.PERMISSION_GRANTED) {
            requestPermissions(new String[] { android.Manifest.permission.RECORD_AUDIO }, REQ_MIC);   // la ventana de permiso de Android
            return;
        }
        startRecognizer();
    }

    @Override
    public void onRequestPermissionsResult(int req, String[] perms, int[] grants) {
        super.onRequestPermissionsResult(req, perms, grants);
        if (req != REQ_MIC) return;
        if (grants.length > 0 && grants[0] == android.content.pm.PackageManager.PERMISSION_GRANTED) startRecognizer();
        else voiceEvent("denied", null);
    }

    /** Servicio de reconocimiento: el de Google TV (katniss, el que abre el micrófono del mando) o, si no está, el predeterminado del sistema. */
    private android.content.ComponentName recognizerComponent() {
        try {
            android.content.ComponentName other = null;
            for (android.content.pm.ResolveInfo r : getPackageManager().queryIntentServices(new android.content.Intent("android.speech.RecognitionService"), 0)) {
                android.content.ComponentName c = new android.content.ComponentName(r.serviceInfo.packageName, r.serviceInfo.name);
                if (r.serviceInfo.packageName.equals("com.google.android.katniss")) return c;
                if (other == null) other = c;
            }
            return other;
        } catch (Throwable t) { return null; }
    }

    private void startRecognizer() {
        try {
            stopRecognizer();
            if (!android.speech.SpeechRecognizer.isRecognitionAvailable(this)) { startVoiceActivity(); return; }
            android.content.ComponentName comp = recognizerComponent();
            recognizer = comp != null ? android.speech.SpeechRecognizer.createSpeechRecognizer(this, comp) : android.speech.SpeechRecognizer.createSpeechRecognizer(this);
            recognizer.setRecognitionListener(new android.speech.RecognitionListener() {
                @Override public void onReadyForSpeech(Bundle b) { voiceEvent("ready", null); }
                @Override public void onBeginningOfSpeech() { voiceEvent("speech", null); }
                @Override public void onRmsChanged(float v) { }
                @Override public void onBufferReceived(byte[] b) { }
                @Override public void onEndOfSpeech() { voiceEvent("end", null); }
                @Override public void onEvent(int t, Bundle b) { }
                @Override public void onPartialResults(Bundle b) { String t = firstResult(b); if (t != null && t.length() > 0) voiceEvent("partial", t); }
                @Override public void onResults(Bundle b) { String t = firstResult(b); stopRecognizer(); voiceResult(t == null ? "" : t); }
                @Override public void onError(int code) {
                    stopRecognizer();
                    if (code == android.speech.SpeechRecognizer.ERROR_INSUFFICIENT_PERMISSIONS) { voiceEvent("denied", null); return; }
                    if (code == android.speech.SpeechRecognizer.ERROR_NO_MATCH || code == android.speech.SpeechRecognizer.ERROR_SPEECH_TIMEOUT) { voiceResult(""); return; }
                    if (!voiceFallbackTried) { voiceFallbackTried = true; startVoiceActivity(); return; }   // el servicio falló: ventana de voz del sistema
                    voiceEvent("error", String.valueOf(code));
                }
            });
            android.content.Intent i = new android.content.Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
            i.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL, android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
            i.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE, voiceLang);
            i.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, voiceLang);
            i.putExtra(android.speech.RecognizerIntent.EXTRA_PARTIAL_RESULTS, true);
            i.putExtra(android.speech.RecognizerIntent.EXTRA_MAX_RESULTS, 1);
            i.putExtra(android.speech.RecognizerIntent.EXTRA_CALLING_PACKAGE, getPackageName());
            recognizer.startListening(i);
        } catch (Throwable t) {
            stopRecognizer();
            startVoiceActivity();
        }
    }

    void stopVoice() {
        try { if (recognizer != null) recognizer.stopListening(); } catch (Throwable ignored) { }
    }

    private void stopRecognizer() {
        try { if (recognizer != null) { recognizer.cancel(); recognizer.destroy(); } } catch (Throwable ignored) { }
        recognizer = null;
    }

    private static String firstResult(Bundle b) {
        if (b == null) return null;
        java.util.ArrayList<String> r = b.getStringArrayList(android.speech.SpeechRecognizer.RESULTS_RECOGNITION);
        return r != null && !r.isEmpty() ? r.get(0) : null;
    }

    /** Estado de la voz para la página: ready (escuchando), speech, partial (texto parcial), end, denied (sin permiso), error */
    private void voiceEvent(String type, String text) {
        web.evaluateJavascript("window.tcNativeVoiceEvent && window.tcNativeVoiceEvent(" + org.json.JSONObject.quote(type) + "," + (text == null ? "null" : org.json.JSONObject.quote(text)) + ");", null);
    }

    /** Respaldo: la ventana de voz del sistema (si el servicio de reconocimiento no está o falla) */
    void startVoiceActivity() {
        android.content.Intent i = new android.content.Intent(android.speech.RecognizerIntent.ACTION_RECOGNIZE_SPEECH);
        i.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_MODEL, android.speech.RecognizerIntent.LANGUAGE_MODEL_FREE_FORM);
        i.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE, voiceLang);
        i.putExtra(android.speech.RecognizerIntent.EXTRA_LANGUAGE_PREFERENCE, voiceLang);
        i.putExtra(android.speech.RecognizerIntent.EXTRA_PROMPT, voiceLang.startsWith("en") ? "What do you want to watch?" : "¿Qué quieres ver?");
        i.putExtra(android.speech.RecognizerIntent.EXTRA_MAX_RESULTS, 1);
        try {
            String pick = null;
            for (android.content.pm.ResolveInfo r : getPackageManager().queryIntentActivities(i, 0)) {
                String pkg = r.activityInfo.packageName;
                if (pkg.equals("com.google.android.katniss")) { pick = pkg; break; }
                if (pick == null && pkg.equals("com.google.android.googlequicksearchbox")) pick = pkg;
                if (pick == null && !pkg.equals("com.google.android.tts")) pick = pkg;
            }
            if (pick != null) i.setPackage(pick);
        } catch (Throwable ignored) { }
        try {
            startActivityForResult(i, REQ_VOICE);
        } catch (Throwable t) {
            voiceResult(null);
        }
    }

    private void voiceResult(String text) {
        web.evaluateJavascript("window.tcNativeVoice && window.tcNativeVoice(" + (text == null ? "null" : org.json.JSONObject.quote(text)) + ");", null);
    }

    @Override
    protected void onActivityResult(int req, int res, android.content.Intent data) {
        super.onActivityResult(req, res, data);
        if (req != REQ_VOICE) return;
        String text = null;
        if (res == RESULT_OK && data != null) {
            java.util.ArrayList<String> r = data.getStringArrayListExtra(android.speech.RecognizerIntent.EXTRA_RESULTS);
            if (r != null && !r.isEmpty()) text = r.get(0);
            if (text == null && data.getExtras() != null) {          // algunos servicios devuelven el texto con otra clave
                for (String k : data.getExtras().keySet()) {
                    Object v = data.getExtras().get(k);
                    if (v instanceof java.util.ArrayList && !((java.util.ArrayList<?>) v).isEmpty() && ((java.util.ArrayList<?>) v).get(0) instanceof String) { text = (String) ((java.util.ArrayList<?>) v).get(0); break; }
                    if (v instanceof String && k.toLowerCase(java.util.Locale.ROOT).contains("query")) { text = (String) v; break; }
                }
            }
        }
        voiceResult(text == null ? "" : text);          // "" = cancelado o no se entendió
    }

    @Override
    protected void onSaveInstanceState(Bundle out) {
        super.onSaveInstanceState(out);
        web.saveState(out);
    }

    @Override
    protected void onResume() {
        super.onResume();
        web.onResume();
        hideSystemUi();
    }

    @Override
    protected void onPause() {
        web.onPause();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        stopRecognizer();
        if (web != null) {
            root.removeAllViews();
            web.destroy();
        }
        super.onDestroy();
    }
}
