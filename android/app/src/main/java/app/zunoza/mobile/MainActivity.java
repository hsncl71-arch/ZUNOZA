package app.zunoza.mobile;

import android.app.DownloadManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.Environment;
import android.webkit.CookieManager;
import android.webkit.URLUtil;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(ZunozaBillingPlugin.class);
        super.onCreate(savedInstanceState);
        configureNativeWebView();
    }

    @Override
    public void onResume() {
        super.onResume();
        configureNativeWebView();
    }

    @Override
    public void onPause() {
        CookieManager.getInstance().flush();
        super.onPause();
    }

    @Override
    public void onTrimMemory(int level) {
        super.onTrimMemory(level);
        if (level < android.content.ComponentCallbacks2.TRIM_MEMORY_RUNNING_LOW) {
            return;
        }
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }
        getBridge()
            .getWebView()
            .evaluateJavascript(
                "(function(){document.querySelectorAll('video,audio').forEach(function(el){try{el.pause()}catch(e){}})})();",
                null
            );
        CookieManager.getInstance().flush();
    }

    private void configureNativeWebView() {
        if (getBridge() == null || getBridge().getWebView() == null) {
            return;
        }
        WebView webView = getBridge().getWebView();
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);
        webView.setLayerType(android.view.View.LAYER_TYPE_HARDWARE, null);
        CookieManager cookies = CookieManager.getInstance();
        cookies.setAcceptCookie(true);
        cookies.setAcceptThirdPartyCookies(webView, true);
        webView.setDownloadListener(
            (url, userAgent, contentDisposition, mimeType, contentLength) -> {
                if (url == null || !url.startsWith("https://")) {
                    return;
                }
                try {
                    Uri parsed = Uri.parse(url);
                    String host = parsed.getHost();
                    if (host == null) return;
                    String h = host.toLowerCase();
                    boolean allowed =
                        h.equals("grok.me")
                            || h.endsWith(".grok.me")
                            || h.endsWith(".r2.dev")
                            || h.endsWith(".cloudflarestorage.com");
                    if (!allowed) return;
                    DownloadManager.Request request = new DownloadManager.Request(parsed);
                    request.setNotificationVisibility(
                        DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED
                    );
                    String name = URLUtil.guessFileName(url, contentDisposition, mimeType);
                    request.setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, name);
                    if (mimeType != null && !mimeType.isEmpty()) {
                        request.setMimeType(mimeType);
                    }
                    request.addRequestHeader("User-Agent", userAgent);
                    DownloadManager manager = (DownloadManager) getSystemService(DOWNLOAD_SERVICE);
                    if (manager != null) {
                        manager.enqueue(request);
                    }
                } catch (Exception ignored) {
                    /* share sheet path handles blobs in JS */
                }
            }
        );
    }
}
