const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
const wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);
const os = Cc['@mozilla.org/observer-service;1'].getService(Ci.nsIObserverService);
const fm = Cc['@mozilla.org/focus-manager;1'].getService(Ci.nsIFocusManager);
const sss = Cc['@mozilla.org/content/style-sheet-service;1'].getService(Ci.nsIStyleSheetService);
const ios = Cc['@mozilla.org/network/io-service;1'].getService(Ci.nsIIOService);
const prefs = Cc['@mozilla.org/preferences-service;1'].getService(Ci.nsIPrefBranch);
var LMObserver;
var appliedURI;

function myObserver() {
	this.register();
}

myObserver.prototype = {
	observe: function (subject, topic, data) {

		if (!/^about\:home$/im.test(subject.baseURI)) {
			return
		}
		subject.onreadystatechange = function () {
			if (subject.readyState != 'interactive') {
				return;
			}
			subject.onreadystatechange = null;
			var domDoc = subject;
			var prevent_focus = prefs.getBoolPref('extensions.homepagenewtab.prevent_focus');
			if (prevent_focus) {
				var searchText = domDoc.querySelector('#searchText');
				searchText.removeAttribute('autofocus');
				searchText.setAttribute('disabled', 'true');
				subject.onreadystatechange = function () {
					subject.onreadystatechange = null;
					searchText.removeAttribute('disabled');
				}
			}

			var gURLBar = wm.getMostRecentWindow("navigator:browser").gBrowser.getBrowserForDocument(subject).ownerDocument.defaultView.gURLBar;
			var gURLBarUpped = function () {
				Cu.reportError('HomepageNewTab - gURLBarUpped');
				if (fm.focusedElement == subject.querySelector('html')) {
					if (subject.querySelector('#searchText')) {
						searchText.focus();
					}
				}
			}
			gURLBar.addEventListener('keyup', gURLBarUpped, false);
			subject.defaultView.addEventListener('unload', function () {
				gURLBar.removeEventListener('keyup', gURLBarUpped, false);
				subject.defaultView.removeEventListener('unload', arguments.callee, false);
			}, false);

			//Cu.reportError('has autofocus='+searchText.hasAttribute('autofocus'));
			var iframe = domDoc.createElement('iframe');
			iframe.setAttribute('type', 'chrome');
			iframe.setAttribute('style', 'border:0; -moz-box-flex:1;');
			domDoc.body.insertBefore(iframe, domDoc.querySelector('#topSection').nextSibling);
			var newToggleButton = domDoc.createElement('input');
			newToggleButton.setAttribute('id', 'newtab-toggle');
			newToggleButton.setAttribute('type', 'button');
			newToggleButton.setAttribute('style', '-moz-user-focus: normal; position: absolute; right: 12px; top: 12px; cursor: pointer; color: -moz-dialogtext; font: message-box; font-size: 75%; width: 16px; height: 16px; background: -216px 0 transparent url(chrome://browser/skin/newtab/controls.png); border: none; padding: 0;');
			domDoc.body.appendChild(newToggleButton);
			newToggleButton.addEventListener('click', function(e){e.target.ownerDocument.querySelector('iframe').contentDocument.querySelector('#newtab-toggle').click()}, false);

			iframe.contentWindow.location = 'about:newtab';
			iframe.addEventListener('load', function () {
				iframe.removeEventListener('load', arguments.callee, false);
				var scrollbox = iframe.contentDocument.querySelector('#newtab-scrollbox')
				iframe.contentDocument.querySelector('#newtab-toggle').style.display = 'none';
				scrollbox.style.backgroundImage = 'none';
				scrollbox.style.backgroundColor = 'transparent';
				scrollbox.style.backgroundColor = 'transparent';
				var newtabLinks = iframe.contentDocument.querySelectorAll('.newtab-link');
				if (newtabLinks.length > 0) {
					for (var i = 0; i < newtabLinks.length; i++) {
						newtabLinks[i].setAttribute('target', '_parent');
					}
				} else {
					var xpc = iframe.contentWindow.wrappedJSObject;
					var _createSiteFragment = xpc.uneval(xpc.gGrid._createSiteFragment);
					xpc.eval('gGrid._createSiteFragment = ' + _createSiteFragment.replace('<a class="newtab-link">', '<a class="newtab-link" target="_parent">'));
				}
				var toggleDisplays = function (tdDoc) {
					iframe = tdDoc.querySelector('iframe');
					var spacers = tdDoc.querySelectorAll('.spacer');
					var newToggleButton = tdDoc.querySelector('#newtab-toggle');
					var logo = tdDoc.querySelector('#brandLogo');
					var searchContainer = tdDoc.querySelector('#searchContainer');
					var snippetContainer = tdDoc.querySelector('#snippetContainer');
					var aboutMozilla = tdDoc.querySelector('#aboutMozilla');
					var newtabMarginTop = iframe.contentDocument.querySelector('#newtab-margin-top');
					if (!iframe.contentWindow.gAllPages.enabled) {
						//tdDoc.body.removeAttribute('page-disabled');
						tdDoc.body.setAttribute('page-disabled', 'true');
						spacers[0].style.display = '';
						spacers[1].style.display = '';
						logo.style.display = '';
						searchContainer.style.margin = '';
						snippetContainer.style.display = '';
						newtabMarginTop.style.display = '';
						iframe.style.mozBoxFlex = 0;
						iframe.style.height = '50px';
					} else {
						tdDoc.body.removeAttribute('page-disabled');
						//tdDoc.body.setAttribute('page-disabled', 'true');
						spacers[0].style.display = 'none';
						spacers[1].style.display = 'none';
						logo.style.display = 'none';
						searchContainer.style.margin = '22px 0px 31px';
						snippetContainer.style.display = 'none';
						newtabMarginTop.style.display = 'none';
						iframe.style.mozBoxFlex = 1;
						iframe.style.height = 'auto';
						aboutMozilla.style.right = 'auto';
						aboutMozilla.style.left = '12px';
					}
				}
				toggleDisplays(domDoc);
				
				var toggleButton = iframe.contentDocument.querySelector('#newtab-toggle');
				toggleButton.addEventListener('click', function () {
					toggleDisplays(domDoc);															 
					let windows = wm.getEnumerator("navigator:browser"); //THIS GETS ALL BROWSER TYPE WINDOWS (MEANING IT HAS GBROWSER)
					while (windows.hasMoreElements()) {
						let browserWin = windows.getNext();
						let domWindow = browserWin.QueryInterface(Ci.nsIDOMWindow);
						var tabbrowser = browserWin.gBrowser;
						var numTabs = tabbrowser.browsers.length;
						for (var index = 0; index < numTabs; index++) {
							var currentBrowser = tabbrowser.getBrowserAtIndex(index);
							if (/^about\:home$/im.test(currentBrowser.currentURI.spec) && currentBrowser.contentDocument != domDoc) {
								toggleDisplays(currentBrowser.contentDocument);
							}
						}

					}
				}, false);
			}, false);
		}

	},
	register: function () {
		//os.addObserver(this, "passwordmgr-found-form", false);
		os.addObserver(this, 'document-element-inserted', false);
	},
	unregister: function () {
		//os.removeObserver(this, "passwordmgr-found-form");
		os.removeObserver(this, 'document-element-inserted', false);
	}
};

function startup(aData, aReason) {
	if (aReason == ADDON_INSTALL || aReason == ADDON_ENABLE) {
		var url = prefs.setCharPref('browser.newtab.url', 'about:home');
	}

	if (aReason == ADDON_INSTALL || aReason == ADDON_UPGRADE || aReason == ADDON_ENABLE || aReason == ADDON_DOWNGRADE) {
		try {
			var existCheck_prevent_focus = prefs.getBoolPref('extensions.homepagenewtab.prevent_focus');
		} catch (ex) {
			prefs.setBoolPref('extensions.homepagenewtab.prevent_focus', true);
		}
	}

	LMObserver = new myObserver;
	appliedURI = ios.newURI(aData.resourceURI.spec + 'global.css', null, null);
	sss.loadAndRegisterSheet(appliedURI, sss.USER_SHEET);

}

function shutdown(aData, aReason) {
	if (aReason == APP_SHUTDOWN) return;

	LMObserver.unregister();
	sss.unregisterSheet(appliedURI, sss.USER_SHEET);
	if (aReason == ADDON_UNINSTALL || aReason == ADDON_DISABLE) {
		var url = prefs.clearUserPref('browser.newtab.url');
	}

}

function install() {}

function uninstall() {}