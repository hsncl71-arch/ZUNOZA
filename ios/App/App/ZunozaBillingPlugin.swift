import Foundation
import Capacitor
import StoreKit

@objc(ZunozaBillingPlugin)
public class ZunozaBillingPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "ZunozaBillingPlugin"
    public let jsName = "ZunozaBilling"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "purchase", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "restore", returnType: CAPPluginReturnPromise),
    ]

    @objc func purchase(_ call: CAPPluginCall) {
        let productId = call.getString("productId") ?? ""
        guard !productId.isEmpty else {
            call.reject("Mağaza ürün kodu yok.")
            return
        }
        Task {
            do {
                let products = try await Product.products(for: [productId])
                guard let product = products.first else {
                    call.reject("App Store ürünü bulunamadı. Kredi yüklenmez.")
                    return
                }
                let result = try await product.purchase()
                switch result {
                case .success(let verification):
                    let transaction = try Self.checked(verification)
                    let payload: [String: String] = [
                        "transactionId": String(transaction.id),
                        "receipt": verification.jwsRepresentation,
                        "productId": transaction.productID,
                    ]
                    await transaction.finish()
                    call.resolve(payload)
                case .userCancelled:
                    call.reject("Satın alma iptal edildi. Kredi yüklenmez.")
                case .pending:
                    call.reject("Satın alma beklemede. Kredi yüklenmez.")
                @unknown default:
                    call.reject("App Store satın alma tamamlanmadı. Kredi yüklenmez.")
                }
            } catch {
                call.reject("App Store satın alma başlatılamadı. Kredi yüklenmez.")
            }
        }
    }

    @objc func restore(_ call: CAPPluginCall) {
        Task {
            var rows: [[String: String]] = []
            for await verification in Transaction.currentEntitlements {
                if let transaction = try? Self.checked(verification) {
                    rows.append([
                        "transactionId": String(transaction.id),
                        "receipt": verification.jwsRepresentation,
                        "productId": transaction.productID,
                    ])
                }
            }
            call.resolve(["transactions": rows])
        }
    }

    private static func checked<T>(_ result: VerificationResult<T>) throws -> T {
        switch result {
        case .unverified:
            throw StoreError.unverified
        case .verified(let value):
            return value
        }
    }

    private enum StoreError: Error {
        case unverified
    }
}
