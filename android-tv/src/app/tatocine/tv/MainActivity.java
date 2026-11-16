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

    @Override
    protected void onCreate(Bundle state) {
        super.onCreate(state);
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON | WindowManager.LayoutParams.FLAG_FULLSCREEN);
        root = new FrameLayout(this);
        root.setBackgroundColor(Color.BLACK);
        web = new WebView(this);
        web.setBackgroundColor(Color.BLACK);
        root.addView(web, new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT));
        setContentView(root);
        hideSystemUi();

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

        CookieManager cm = CookieManager.getInstance();
        cm.setAcceptCookie(true);
        if (Build.VERSION.SDK_INT >= 21) cm.setAcceptThirdPartyCookies(web, true);    // algunos reproductores las necesitan

        web.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return asset(request.getUrl());
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

        web.setFocusable(true);
        web.setFocusableInTouchMode(true);
        web.requestFocus();
        if (state != null) web.restoreState(state);
        else web.loadUrl(START);
        if (!online()) Toast.makeText(this, "Sin conexión a Internet: el catálogo y los reproductores la necesitan.", Toast.LENGTH_LONG).show();
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
        root.removeView(fullView);
        fullView = null;
        if (fullCallback != null) fullCallback.onCustomViewHidden();
        fullCallback = null;
        web.setVisibility(View.VISIBLE);
        web.requestFocus();
        hideSystemUi();
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
        if ((k == KeyEvent.KEYCODE_ESCAPE || k == KeyEvent.KEYCODE_BUTTON_B) && fullView == null) {
            if (e.getAction() == KeyEvent.ACTION_UP) onBackPressed();
            return true;
        }
        return super.dispatchKeyEvent(e);
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
        if (web != null) {
            root.removeAllViews();
            web.destroy();
        }
        super.onDestroy();
    }
}
