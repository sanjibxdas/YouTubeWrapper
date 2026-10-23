import UIKit
import AVFoundation

@UIApplicationMain
final class AppDelegate: UIResponder, UIApplicationDelegate {

    var window: UIWindow?
    private var rootViewController: RootViewController?

    func application(_ application: UIApplication,
                     didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?) -> Bool {
        let window = UIWindow(frame: UIScreen.main.bounds)
        window.backgroundColor = .black
        let root = RootViewController()
        window.rootViewController = root
        window.makeKeyAndVisible()

        self.window = window
        self.rootViewController = root

        NotificationCenter.default.addObserver(self,
                                               selector: #selector(handleAudioInterruption(_:)),
                                               name: AVAudioSession.interruptionNotification,
                                               object: nil)
        return true
    }

    func applicationDidEnterBackground(_ application: UIApplication) {
        rootViewController?.resumePlaybackIfPlaying()
    }

    func applicationDidBecomeActive(_ application: UIApplication) {
        // The session is frequently deactivated by other apps while backgrounded.
        rootViewController?.reactivateSessionIfPlaying()
    }

    @objc private func handleAudioInterruption(_ note: Notification) {
        guard let raw = note.userInfo?[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: raw) else { return }
        if type == .ended {
            rootViewController?.reactivateSessionIfPlaying()
        }
    }
}

enum AudioSession {
    static func activate() {
        let session = AVAudioSession.sharedInstance()
        do {
            try session.setCategory(.playback, mode: .default, options: [])
            try session.setActive(true)
        } catch {
            // Non-fatal: media still plays while the app is foregrounded.
        }
    }
}
