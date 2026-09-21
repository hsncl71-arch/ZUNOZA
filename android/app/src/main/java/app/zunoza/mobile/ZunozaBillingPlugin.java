package app.zunoza.mobile;

import androidx.annotation.NonNull;
import com.android.billingclient.api.AcknowledgePurchaseParams;
import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.PendingPurchasesParams;
import com.android.billingclient.api.ProductDetails;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.QueryProductDetailsParams;
import com.android.billingclient.api.QueryPurchasesParams;
import com.getcapacitor.JSArray;
import com.getcapacitor.JSObject;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import java.util.Collections;
import java.util.List;

@CapacitorPlugin(name = "ZunozaBilling")
public class ZunozaBillingPlugin extends Plugin {
    private BillingClient billingClient;
    private PluginCall pendingPurchase;

    private synchronized BillingClient client() {
        if (billingClient != null) return billingClient;
        billingClient =
            BillingClient.newBuilder(getContext())
                .setListener(this::onPurchasesUpdated)
                .enablePendingPurchases(
                    PendingPurchasesParams.newBuilder().enableOneTimeProducts().build()
                )
                .build();
        return billingClient;
    }

    private void ensureReady(PluginCall call, Runnable next) {
        BillingClient ready = client();
        if (ready.getConnectionState() == BillingClient.ConnectionState.CONNECTED) {
            next.run();
            return;
        }
        ready.startConnection(
            new BillingClientStateListener() {
                @Override
                public void onBillingSetupFinished(@NonNull BillingResult billingResult) {
                    if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK) {
                        next.run();
                    } else {
                        call.reject("Google Play Billing bağlanamadı. Kredi yüklenmez.");
                    }
                }

                @Override
                public void onBillingServiceDisconnected() {
                    /* next purchase reconnects */
                }
            }
        );
    }

    @PluginMethod
    public void purchase(PluginCall call) {
        String productId = call.getString("productId", "");
        String kind = call.getString("kind", "consumable");
        if (productId == null || productId.isEmpty()) {
            call.reject("Mağaza ürün kodu yok.");
            return;
        }
        ensureReady(
            call,
            () -> {
                String type =
                    "subscription".equals(kind)
                        ? BillingClient.ProductType.SUBS
                        : BillingClient.ProductType.INAPP;
                QueryProductDetailsParams.Product product =
                    QueryProductDetailsParams.Product.newBuilder()
                        .setProductId(productId)
                        .setProductType(type)
                        .build();
                QueryProductDetailsParams params =
                    QueryProductDetailsParams.newBuilder()
                        .setProductList(Collections.singletonList(product))
                        .build();
                client()
                    .queryProductDetailsAsync(
                        params,
                        (result, details) -> {
                            if (result.getResponseCode() != BillingClient.BillingResponseCode.OK
                                || details == null
                                || details.isEmpty()) {
                                call.reject("Google Play ürünü bulunamadı. Kredi yüklenmez.");
                                return;
                            }
                            Produc
... 