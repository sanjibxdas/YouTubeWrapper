import Foundation

final class Settings {

    static let shared = Settings()

    private enum Key {
        static let safeAdBlock = "safeAdBlock"
        static let aggressiveAdBlock = "aggressiveAdBlock"
    }

    private let defaults = UserDefaults.standard

    private init() {
        defaults.register(defaults: [
            Key.safeAdBlock: true,
            Key.aggressiveAdBlock: false
        ])
    }

    var safeAdBlock: Bool {
        get { defaults.bool(forKey: Key.safeAdBlock) }
        set { defaults.set(newValue, forKey: Key.safeAdBlock) }
    }

    var aggressiveAdBlock: Bool {
        get { defaults.bool(forKey: Key.aggressiveAdBlock) }
        set { defaults.set(newValue, forKey: Key.aggressiveAdBlock) }
    }
}
