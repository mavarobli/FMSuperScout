// FMSuperScout.app: een eigen venster (met eigen icoon in het Dock) om de web-app heen.
//
// Start de meegeleverde Node-server (Resources/node + Resources/app/server.js) en toont
// http://localhost:8765 in een WKWebView. Zet de module en de lader (Resources/*.dylib) klaar in
// ~/Library/Application Support/FMSuperScout/mac, zonder de quarantainemarkering van de download:
// Football Manager laadt de lader daarvandaan als je FM vanuit de app start (zie server.js).
// Sluit het venster → app en server stoppen; een gestart FM blijft gewoon draaien.
import Cocoa
import WebKit

let port = 8765
let appURL = URL(string: "http://localhost:\(port)/")!

final class AppDelegate: NSObject, NSApplicationDelegate, WKNavigationDelegate, WKUIDelegate, WKDownloadDelegate {
    var window: NSWindow!
    var web: WKWebView!
    var server: Process?
    var downloadTargets: [ObjectIdentifier: URL] = [:]

    let support = FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
        .appendingPathComponent("FMSuperScout")

    func applicationDidFinishLaunching(_ notification: Notification) {
        buildMenu()
        let loader = installModule()
        startServer(loader: loader)

        let config = WKWebViewConfiguration()
        web = WKWebView(frame: .zero, configuration: config)
        web.navigationDelegate = self
        web.uiDelegate = self
        web.setValue(false, forKey: "drawsBackground")   // geen witte flits vóór de pagina laadt

        window = NSWindow(contentRect: NSRect(x: 0, y: 0, width: 1440, height: 900),
                          styleMask: [.titled, .closable, .miniaturizable, .resizable],
                          backing: .buffered, defer: false)
        window.title = "FMSuperScout"
        window.backgroundColor = NSColor(red: 0x11 / 255.0, green: 0x13 / 255.0, blue: 0x30 / 255.0, alpha: 1)
        window.contentView = web
        window.minSize = NSSize(width: 900, height: 600)
        window.center()
        window.setFrameAutosaveName("FMSuperScoutMain")
        window.makeKeyAndOrderFront(nil)
        NSApp.activate(ignoringOtherApps: true)
        waitForServer(attempt: 0)
    }

    // Module + lader naar Application Support kopiëren, zonder quarantainemarkering: een
    // gedownloade, niet door Apple genotariseerde bibliotheek mag macOS anders weigeren te laden.
    func installModule() -> String? {
        guard let res = Bundle.main.resourceURL else { return nil }
        let dir = support.appendingPathComponent("mac")
        let fm = FileManager.default
        try? fm.createDirectory(at: dir, withIntermediateDirectories: true)
        for name in ["fmss_loader.dylib", "fmss_core.dylib"] {
            let src = res.appendingPathComponent(name), dst = dir.appendingPathComponent(name)
            guard fm.fileExists(atPath: src.path) else { continue }
            try? fm.removeItem(at: dst)
            do { try fm.copyItem(at: src, to: dst) } catch { NSLog("FMSuperScout: kopiëren mislukt: \(error)"); continue }
            removexattr(dst.path, "com.apple.quarantine", 0)
        }
        let loader = dir.appendingPathComponent("fmss_loader.dylib").path
        return fm.fileExists(atPath: loader) ? loader : nil
    }

    func startServer(loader: String?) {
        if serverAlive() { return }   // draait al (tweede venster of oude server): hergebruiken
        guard let res = Bundle.main.resourceURL else { return }
        let p = Process()
        p.executableURL = res.appendingPathComponent("node")
        p.arguments = [res.appendingPathComponent("app/server.js").path]
        var env = ProcessInfo.processInfo.environment
        env["PORT"] = String(port)
        if let loader = loader { env["FMSS_LOADER"] = loader }
        // De server stopt zelf als deze app weg is, ook na een crash of geforceerd stoppen.
        env["FMSS_PARENT_PID"] = String(ProcessInfo.processInfo.processIdentifier)
        p.environment = env
        try? FileManager.default.createDirectory(at: support, withIntermediateDirectories: true)
        let log = support.appendingPathComponent("server.log")
        FileManager.default.createFile(atPath: log.path, contents: nil)
        if let h = try? FileHandle(forWritingTo: log) { p.standardOutput = h; p.standardError = h }
        do { try p.run(); server = p } catch { NSLog("FMSuperScout: server start niet: \(error)") }
    }

    func serverAlive() -> Bool {
        var req = URLRequest(url: appURL.appendingPathComponent("api/status"), timeoutInterval: 1)
        req.httpMethod = "GET"
        let sem = DispatchSemaphore(value: 0)
        var ok = false
        URLSession.shared.dataTask(with: req) { _, resp, _ in
            ok = (resp as? HTTPURLResponse)?.statusCode == 200
            sem.signal()
        }.resume()
        _ = sem.wait(timeout: .now() + 1.5)
        return ok
    }

    // Wachten tot de server antwoordt (meestal < 1 s), dan de app laden.
    func waitForServer(attempt: Int) {
        DispatchQueue.global().async {
            let alive = self.serverAlive()
            DispatchQueue.main.async {
                if alive { self.web.load(URLRequest(url: appURL)); return }
                if attempt > 40 {
                    self.web.loadHTMLString("<body style='background:#111330;color:#ddd;font:15px -apple-system;padding:40px'>" +
                        "FMSuperScout kon zijn lokale server niet starten. Zie ~/Library/Application Support/FMSuperScout/server.log.</body>", baseURL: nil)
                    return
                }
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) { self.waitForServer(attempt: attempt + 1) }
            }
        }
    }

    func applicationShouldTerminateAfterLastWindowClosed(_ sender: NSApplication) -> Bool { true }

    func applicationWillTerminate(_ notification: Notification) {
        server?.terminate()
    }

    // ---------- links, nieuwe vensters, downloads ----------

    // Externe links (Ko-fi, GitHub, releases) in de standaardbrowser; de app zelf blijft hier.
    func webView(_ webView: WKWebView, decidePolicyFor action: WKNavigationAction,
                 decisionHandler: @escaping (WKNavigationActionPolicy) -> Void) {
        if action.shouldPerformDownload { decisionHandler(.download); return }
        if let u = action.request.url, let scheme = u.scheme, scheme.hasPrefix("http"),
           u.host != "localhost" && u.host != "127.0.0.1" {
            NSWorkspace.shared.open(u)
            decisionHandler(.cancel)
            return
        }
        decisionHandler(.allow)
    }

    // target="_blank" en window.open → standaardbrowser.
    func webView(_ webView: WKWebView, createWebViewWith configuration: WKWebViewConfiguration,
                 for action: WKNavigationAction, windowFeatures: WKWindowFeatures) -> WKWebView? {
        if let u = action.request.url { NSWorkspace.shared.open(u) }
        return nil
    }

    func webView(_ webView: WKWebView, navigationAction: WKNavigationAction, didBecome download: WKDownload) {
        download.delegate = self
    }

    func webView(_ webView: WKWebView, navigationResponse: WKNavigationResponse, didBecome download: WKDownload) {
        download.delegate = self
    }

    // Exports (shortlist-CSV, spelerskaart) naar Downloads, daarna tonen in Finder.
    func download(_ download: WKDownload, decideDestinationUsing response: URLResponse,
                  suggestedFilename: String, completionHandler: @escaping (URL?) -> Void) {
        let dir = FileManager.default.urls(for: .downloadsDirectory, in: .userDomainMask)[0]
        var target = dir.appendingPathComponent(suggestedFilename)
        let base = target.deletingPathExtension().lastPathComponent, ext = target.pathExtension
        var n = 2
        while FileManager.default.fileExists(atPath: target.path) {
            target = dir.appendingPathComponent(ext.isEmpty ? "\(base) (\(n))" : "\(base) (\(n)).\(ext)")
            n += 1
        }
        downloadTargets[ObjectIdentifier(download)] = target
        completionHandler(target)
    }

    func downloadDidFinish(_ download: WKDownload) {
        if let u = downloadTargets.removeValue(forKey: ObjectIdentifier(download)) {
            NSWorkspace.shared.activateFileViewerSelecting([u])
        }
    }

    func download(_ download: WKDownload, didFailWithError error: Error, resumeData: Data?) {
        downloadTargets.removeValue(forKey: ObjectIdentifier(download))
    }

    // ---------- menu ----------

    @objc func reload(_ sender: Any?) { web.reload() }

    func buildMenu() {
        let main = NSMenu()
        func add(_ title: String, _ items: [NSMenuItem]) {
            let item = NSMenuItem()
            let sub = NSMenu(title: title)
            items.forEach { sub.addItem($0) }
            item.submenu = sub
            main.addItem(item)
        }
        func mi(_ t: String, _ a: Selector?, _ k: String, _ mods: NSEvent.ModifierFlags = .command) -> NSMenuItem {
            let i = NSMenuItem(title: t, action: a, keyEquivalent: k)
            i.keyEquivalentModifierMask = mods
            return i
        }
        add("FMSuperScout", [
            mi("Over FMSuperScout", #selector(NSApplication.orderFrontStandardAboutPanel(_:)), ""),
            .separator(),
            mi("Verberg FMSuperScout", #selector(NSApplication.hide(_:)), "h"),
            mi("Verberg andere", #selector(NSApplication.hideOtherApplications(_:)), "h", [.command, .option]),
            .separator(),
            mi("Stop FMSuperScout", #selector(NSApplication.terminate(_:)), "q"),
        ])
        // Zonder Wijzig-menu werken ⌘C/⌘V/⌘A niet in de zoekvelden.
        add("Wijzig", [
            mi("Herstel", Selector(("undo:")), "z"),
            mi("Opnieuw", Selector(("redo:")), "z", [.command, .shift]),
            .separator(),
            mi("Knip", #selector(NSText.cut(_:)), "x"),
            mi("Kopieer", #selector(NSText.copy(_:)), "c"),
            mi("Plak", #selector(NSText.paste(_:)), "v"),
            mi("Selecteer alles", #selector(NSText.selectAll(_:)), "a"),
        ])
        let reloadItem = mi("Herlaad", #selector(reload(_:)), "r")
        reloadItem.target = self
        add("Weergave", [reloadItem])
        add("Venster", [
            mi("Minimaliseer", #selector(NSWindow.performMiniaturize(_:)), "m"),
            mi("Zoom", #selector(NSWindow.performZoom(_:)), ""),
        ])
        NSApp.mainMenu = main
    }
}

let app = NSApplication.shared
let delegate = AppDelegate()
app.delegate = delegate
app.setActivationPolicy(.regular)
app.run()
