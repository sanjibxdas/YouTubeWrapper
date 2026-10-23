import UIKit
import WebKit
import AVFoundation

final class RootViewController: UIViewController, WKNavigationDelegate, WKScriptMessageHandler,
                                UIGestureRecognizerDelegate {

    private var webView: WKWebView!
    private var blockerList: WKContentRuleList?
    private let spinner = UIActivityIndicatorView(style: .whiteLarge)

    /// Holding the session while media plays is what keeps the app alive in the
    /// background; holding it at launch would interrupt other audio apps.
    private var isPlaying = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black

        let configuration = WebViewFactory.makeConfiguration(messageHandler: self)
        webView = WKWebView(frame: view.bounds, configuration: configuration)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.navigationDelegate = self
        webView.allowsBackForwardNavigationGestures = true
        webView.customUserAgent = WebViewFactory.userAgent
        webView.scrollView.contentInsetAdjustmentBehavior = .never
        view.addSubview(webView)

        spinner.color = .white
        spinner.hidesWhenStopped = true
        spinner.center = view.center
        spinner.autoresizingMask = [.flexibleLeftMargin, .flexibleRightMargin,
                                    .flexibleTopMargin, .flexibleBottomMargin]
        view.addSubview(spinner)

        installSettingsGesture()

        ContentBlocker.compile { [weak self] list in
            guard let self = self else { return }
            self.blockerList = list
            if let list = list {
                self.webView.configuration.userContentController.add(list)
            }
            self.loadHome()
        }
    }

    // MARK: - Navigation

    private func loadHome() {
        webView.load(URLRequest(url: WebViewFactory.homeURL))
    }

    func reloadWithCurrentSettings() {
        WebViewFactory.installScripts(into: webView.configuration.userContentController)
        if let list = blockerList {
            webView.configuration.userContentController.removeAllContentRuleLists()
            webView.configuration.userContentController.add(list)
        }
        webView.reload()
    }

    func resumePlayback() {
        webView?.evaluateJavaScript("window.__ytBg && window.__ytBg.resume();", completionHandler: nil)
    }

    /// Called when the app returns to the foreground: only reclaim the session
    /// if media was playing, so a merely-open app does not interrupt other audio.
    func reactivateSessionIfPlaying() {
        if isPlaying {
            AudioSession.activate()
            resumePlayback()
        }
    }

    /// Guards against restarting a video the user deliberately paused.
    func resumePlaybackIfPlaying() {
        if isPlaying {
            resumePlayback()
        }
    }

    // MARK: - WKScriptMessageHandler

    func userContentController(_ controller: WKUserContentController,
                               didReceive message: WKScriptMessage) {
        guard message.name == "audio", let state = message.body as? String else { return }
        if state == "playing" {
            isPlaying = true
            AudioSession.activate()
        } else {
            isPlaying = false
            try? AVAudioSession.sharedInstance().setActive(false,
                                                          options: .notifyOthersOnDeactivation)
        }
    }

    // MARK: - WKNavigationDelegate

    func webView(_ webView: WKWebView, didStartProvisionalNavigation navigation: WKNavigation!) {
        spinner.startAnimating()
    }

    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        spinner.stopAnimating()
    }

    func webView(_ webView: WKWebView, didFail navigation: WKNavigation!, withError error: Error) {
        spinner.stopAnimating()
    }

    func webView(_ webView: WKWebView, didFailProvisionalNavigation navigation: WKNavigation!,
                 withError error: Error) {
        spinner.stopAnimating()
    }

    func webViewWebContentProcessDidTerminate(_ webView: WKWebView) {
        // 1 GB of RAM: the content process dies under memory pressure. Recover silently.
        webView.reload()
    }

    override func didReceiveMemoryWarning() {
        super.didReceiveMemoryWarning()
        // Deliberately no reload: a memory warning is common while audio plays in
        // the background, and reloading would kill playback. Genuine death of the
        // content process is handled by webViewWebContentProcessDidTerminate.
    }

    // MARK: - Settings gesture

    private func installSettingsGesture() {
        // Two-finger double-tap keeps the screen chrome-free but reachable.
        let tap = UITapGestureRecognizer(target: self, action: #selector(showSettings))
        tap.numberOfTouchesRequired = 2
        tap.numberOfTapsRequired = 2
        tap.delegate = self
        tap.cancelsTouchesInView = false
        // On the web view itself: WKWebView's internal recognizers consume touches
        // before the ancestor view would see them.
        webView.addGestureRecognizer(tap)
    }

    func gestureRecognizer(_ gestureRecognizer: UIGestureRecognizer,
                           shouldRecognizeSimultaneouslyWith other: UIGestureRecognizer) -> Bool {
        true
    }

    @objc private func showSettings() {
        let alert = UIAlertController(title: "Settings", message: nil, preferredStyle: .actionSheet)
        alert.addAction(toggleAction(title: "Safe ad blocking", value: Settings.shared.safeAdBlock) { [weak self] on in
            Settings.shared.safeAdBlock = on
            self?.reloadWithCurrentSettings()
        })
        alert.addAction(toggleAction(title: "Aggressive ad blocking", value: Settings.shared.aggressiveAdBlock) { [weak self] on in
            Settings.shared.aggressiveAdBlock = on
            self?.reloadWithCurrentSettings()
        })
        alert.addAction(UIAlertAction(title: "Reload", style: .default) { [weak self] _ in
            self?.webView.reload()
        })
        alert.addAction(UIAlertAction(title: "Cancel", style: .cancel))

        // iPad/action-sheet positioning safety; anchored for popover presentation.
        if let popover = alert.popoverPresentationController {
            popover.sourceView = view
            popover.sourceRect = CGRect(x: view.bounds.midX, y: view.bounds.midY, width: 0, height: 0)
            popover.permittedArrowDirections = []
        }
        present(alert, animated: true)
    }

    private func toggleAction(title: String, value: Bool,
                              onChange: @escaping (Bool) -> Void) -> UIAlertAction {
        let label = "\(title): \(value ? "On" : "Off")"
        return UIAlertAction(title: label, style: .default) { _ in onChange(!value) }
    }
}
