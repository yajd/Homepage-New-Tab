const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
const wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

function pageLoad(e) {

	//if (e.originalTarget instanceof Ci.HTMLDocument) {
	var domWin = e.originalTarget.defaultView;
	var domDoc = domWin.document;
	//var win = domWin.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIWebNavigation).QueryInterface(Ci.nsIDocShellTreeItem).treeOwner.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIXULWindow);
	//var doc = win.document;

	if (domWin.frameElement) {
		//var parentDomWin = domWin.top;
	} else {
		if (/about\:home/i.test(domWin.location)) {
			Cu.reportError('LOADED ABOUT:HOME');
			var spacers = domDoc.querySelectorAll('.spacer');
			var logo = domDoc.querySelector('#brandLogo');
			var searchContainer = domDoc.querySelector('#searchContainer');
			var browser = domDoc.createElement('iframe');
			browser.setAttribute('type', 'chrome');
			browser.setAttribute('style', 'border:0; -moz-box-flex:1;');
			domDoc.body.insertBefore(browser, domDoc.querySelector('#topSection').nextSibling);
			browser.contentWindow.location = 'about:newtab';
			browser.addEventListener('load', function () {
				browser.removeEventListener('load', arguments.callee, false);
				browser.contentDocument.querySelector('#newtab-scrollbox').style.backgroundImage = 'none';
				browser.contentDocument.querySelector('#newtab-scrollbox').style.backgroundColor = 'transparent';
				browser.contentDocument.querySelector('#newtab-scrollbox').style.backgroundColor = 'transparent';
				var iframe = browser;
				var newtabLinks = iframe.contentDocument.querySelectorAll('.newtab-link');
				for (var i=0; i<newtabLinks.length; i++) {
					newtabLinks[i].setAttribute('target', '_parent');
				}
				if (!iframe.contentWindow.gAllPages.enabled) {
					spacers[0].style.display = '';
					spacers[1].style.display = '';
					logo.style.display = '';
					searchContainer.style.margin = '';
				} else {
					spacers[0].style.display = 'none';
					spacers[1].style.display = 'none';
					logo.style.display = 'none';
					searchContainer.style.margin = '22px 0px 31px';
				}
				browser.contentDocument.querySelector('#newtab-toggle').addEventListener('click', function () {
					var iframe = browser;
					if (!iframe.contentWindow.gAllPages.enabled) {
						spacers[0].style.display = '';
						spacers[1].style.display = '';
						logo.style.display = '';
						searchContainer.style.margin = '';
					} else {
						spacers[0].style.display = 'none';
						spacers[1].style.display = 'none';
						logo.style.display = 'none';
						searchContainer.style.margin = '22px 0px 31px';
					}
				}, false);
			}, false);
		}
	}

	//} else {
	//    Cu.reportError('NOTE instanceOf HTMLDocument');
	//}
}

function loadIntoWindow(domWindow, browserWin) {
	if (!browserWin) {
		Cu.reportError('NO BROWSRWIN');
		return;
	}
	if (!domWindow.gBrowser) {
		Cu.reportError('NO GBROWSER');
		return;
	}

	//DO YOUR STUFF TO THE WINDOW HERE
	domWindow.gBrowser.addEventListener('DOMContentLoaded', pageLoad, true);
}

function unloadFromWindow(domWindow, browserWin) {
	if (!browserWin) {
		return;
	}
	if (!domWindow.gBrowser) {
		return;
	}

	//DO YOUR STUFF TO THE WINDOW HERE
	domWindow.gBrowser.removeEventListener('DOMContentLoaded', pageLoad, true);
}

var windowListener = {
	onOpenWindow: function (aWindow) {
Cu.reportError('WINDOW OPENED');
		// Wait for the window to finish loading
		let domWindow = aWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowInternal || Ci.nsIDOMWindow);
		domWindow.addEventListener("load", function () {
			Cu.reportError('opened window LOADED');
			domWindow.removeEventListener("load", arguments.callee, false);
			loadIntoWindow(domWindow, aWindow);
		}, false);
	},

	onCloseWindow: function (aWindow) {},

	onWindowTitleChange: function (aWindow, aTitle) {}
};

function startup(aData, aReason) {
	if (aReason == ADDON_INSTALL || aReason == ADDON_ENABLE) {
		var prefs = Cc['@mozilla.org/preferences-service;1'].getService(Ci.nsIPrefBranch);
		var url = prefs.setCharPref('browser.newtab.url', 'about:home');
	}
	// Load into any existing windows
	// Load into any existing windows
	let windows = wm.getEnumerator("navigator:browser"); //THIS GETS ALL BROWSER TYPE WINDOWS (MEANING IT HAS GBROWSER)
	while (windows.hasMoreElements()) {
		try {
			let browserWin = windows.getNext();
			let domWindow = browserWin.QueryInterface(Ci.nsIDOMWindow);
			loadIntoWindow(domWindow, browserWin);
		} catch (ex) {
			Cu.reportError(ex);
		}
	}

	// Load into any new windows
	wm.addListener(windowListener);
}

function shutdown(aData, aReason) {
	if (aReason == APP_SHUTDOWN) return;

	// Stop listening for new windows
	wm.removeListener(windowListener);

	// Unload from any existing windows
	let windows = wm.getEnumerator("navigator:browser");
	while (windows.hasMoreElements()) {
		let browserWin = windows.getNext();
		let domWindow = browserWin.QueryInterface(Ci.nsIDOMWindow);
		unloadFromWindow(domWindow, browserWin);
	}

	if (aReason == ADDON_UNINSTALL || aReason == ADDON_DISABLE) {
		var prefs = Cc['@mozilla.org/preferences-service;1'].getService(Ci.nsIPrefBranch);
		var url = prefs.clearUserPref('browser.newtab.url');
	}

}

function install() {}

function uninstall() {}