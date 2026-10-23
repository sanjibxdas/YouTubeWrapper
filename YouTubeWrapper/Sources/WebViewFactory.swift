import WebKit

enum WebViewFactory {

    static let homeURL = URL(string: "https://m.youtube.com/")!

    // Full iOS 12 Safari string. The `Version/` and `Safari/` tokens are what keep
    // Google's embedded-webview detection from rejecting the sign-in flow.
    static let userAgent = "Mozilla/5.0 (iPhone; CPU iPhone OS 12_5_8 like Mac OS X) "
        + "AppleWebKit/605.1.15 (KHTML, like Gecko) Version/12.1.2 Mobile/15E148 Safari/604.1"

    static func makeConfiguration(messageHandler: WKScriptMessageHandler) -> WKWebViewConfiguration {
        let configuration = WKWebViewConfiguration()
        configuration.websiteDataStore = .default()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        configuration.preferences.javaScriptCanOpenWindowsAutomatically = false
        configuration.userContentController.add(WeakScriptMessageHandler(delegate: messageHandler),
                                                name: "audio")
        installScripts(into: configuration.userContentController)
        return configuration
    }

    /// Rewrites the injected script set. Takes effect on the next document load.
    static func installScripts(into controller: WKUserContentController) {        controller.removeAllUserScripts()
        add("background-play", to: controller)
        if Settings.shared.safeAdBlock {
            add("adblock-safe", to: controller)
        }
        if Settings.shared.aggressiveAdBlock {
            add("adblock-aggressive", to: controller)
        }
    }

    private static func add(_ name: String, to controller: WKUserContentController) {
        guard let url = Bundle.main.url(forResource: name, withExtension: "js"),
              let source = try? String(contentsOf: url, encoding: .utf8) else { return }
        controller.addUserScript(WKUserScript(source: source,
                                              injectionTime: .atDocumentStart,
                                              forMainFrameOnly: false))
    }
}

enum ContentBlocker {
    private static let identifier = "ytw-blocklist"

    static func compile(completion: @escaping (WKContentRuleList?) -> Void) {
        guard let url = Bundle.main.url(forResource: "blocklist", withExtension: "json"),
              let json = try? String(contentsOf: url, encoding: .utf8) else {
            completion(nil)
            return
        }
        WKContentRuleListStore.default().compileContentRuleList(forIdentifier: identifier,
                                                               encodedContentRuleList: json) { list, _ in
            DispatchQueue.main.async { completion(list) }
        }
    }
}

/// WKUserContentController retains its message handlers; holding the view
/// controller strongly here would leak it.
final class WeakScriptMessageHandler: NSObject, WKScriptMessageHandler {

    private weak var delegate: WKScriptMessageHandler?

    init(delegate: WKScriptMessageHandler) {
        self.delegate = delegate
    }

    func userContentController(_ controller: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        delegate?.userContentController(controller, didReceive: message)
    }
}
