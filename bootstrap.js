const {classes: Cc, interfaces: Ci, utils: Cu} = Components;
const sss = Cc['@mozilla.org/content/style-sheet-service;1'].getService(Ci.nsIStyleSheetService); //its needed right away on startup so no need to lazy load this


var LMObserver;
var appliedURI;
var useNewMethod;
var lastVersionToUseOldMethod = '30.*';

Cu.import('resource://gre/modules/Services.jsm');
Cu.import('resource://gre/modules/devtools/Console.jsm');

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
			var prevent_focus = Services.prefs.getBoolPref('extensions.homepagenewtab.prevent_focus');
			if (prevent_focus) {
				var searchText = domDoc.querySelector('#searchText');
				searchText.removeAttribute('autofocus');
				searchText.setAttribute('disabled', 'true');
				subject.onreadystatechange = function () {
					subject.onreadystatechange = null;
					searchText.removeAttribute('disabled');
				}
			}

			var gURLBar = Services.wm.getMostRecentWindow("navigator:browser").gBrowser.getBrowserForDocument(subject).ownerDocument.defaultView.gURLBar;
			var gURLBarUpped = function () {
				Cu.reportError('HomepageNewTab - gURLBarUpped');
				if (Services.focus.focusedElement == subject.querySelector('html')) {
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
					xpc.eval('gGrid._createSiteFragment = ' + _createSiteFragment.replace('<a class="newtab-link">', '<a class="newtab-link" target="_parent">')); //this here was responsible for opening pages in new tab. we want to find alternative method as when user unpins or gets new thumnails in, if he clicks it, it opens the link within the frame
				}

				toggleDisplay(domDoc);
				
				var toggleButton = iframe.contentDocument.querySelector('#newtab-toggle');
				toggleButton.addEventListener('click', function () {
					toggleDisplay(domDoc);															 
					let windows = Services.wm.getEnumerator("navigator:browser"); //THIS GETS ALL BROWSER TYPE WINDOWS (MEANING IT HAS GBROWSER)
					while (windows.hasMoreElements()) {
						let browserWin = windows.getNext();
						let domWindow = browserWin.QueryInterface(Ci.nsIDOMWindow);
						var tabbrowser = browserWin.gBrowser;
						var numTabs = tabbrowser.browsers.length;
						for (var index = 0; index < numTabs; index++) {
							var currentBrowser = tabbrowser.getBrowserAtIndex(index);
							if (/^about\:home$/im.test(currentBrowser.currentURI.spec) && currentBrowser.contentDocument != domDoc) {
								toggleDisplay(currentBrowser.contentDocument);
							}
						}

					}
				}, false);
			}, false);
		}

	},
	register: function () {
		//Services.obs.addObserver(this, "passwordmgr-found-form", false);
		Services.obs.addObserver(this, 'document-element-inserted', false);
	},
	unregister: function () {
		//Services.obs.removeObserver(this, "passwordmgr-found-form");
		Services.obs.removeObserver(this, 'document-element-inserted', false);
	}
};

function toggleDisplay(tdDoc) {
	console.info('useNewMethod~', useNewMethod);
	if (useNewMethod === undefined) {
		var platformVersion = Services.appinfo.platformVersion;
		useNewMethod = Services.vc.compare(platformVersion, lastVersionToUseOldMethod); //will return 1 for anything greater than lastVersionToUseOldMethod. if its same then it will be 0 or if its less than it will be -1. 

		if (useNewMethod > 0) {
		  //use new method
		  useNewMethod = true;
		} else {
		  //use old method
		  useNewMethod = false;
		}
	}
	
	console.log('useNewMethod=', useNewMethod);
	var iframe = tdDoc.querySelector('iframe');
	if (!iframe) {
		console.warn('no iframe in this new tab tab');
		return;
	}
	if (!useNewMethod) {
		//use old method
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
						snippetContainer.style.display = '';
						newtabMarginTop.setAttribute('style','');						
						iframe.style.mozBoxFlex = 0;
						iframe.style.height = '50px';
						searchContainer.style.margin = '';
						if (Services.prefs.getBoolPref('extensions.homepagenewtab.hide_search_field')) {
							var searchContainerChildren = searchContainer.childNodes;
							for (var m=0; m<searchContainerChildren.length; m++) {
								if (searchContainerChildren[m].style) {
									searchContainerChildren[m].style.display = '';
								}
							}
						}
					} else {
						tdDoc.body.removeAttribute('page-disabled');
						//tdDoc.body.setAttribute('page-disabled', 'true');
						spacers[0].style.display = 'none';
						spacers[1].style.display = 'none';
						logo.style.display = 'none';
						searchContainer.style.margin = '66px 0px 31px';
						snippetContainer.style.display = 'none';
						newtabMarginTop.setAttribute('style','position: absolute; width: 100%; display: flex; justify-content: center; align-items: center; height: 100%; max-height:none;');
						iframe.style.mozBoxFlex = 1;
						iframe.style.height = 'auto';
						aboutMozilla.style.right = 'auto';
						aboutMozilla.style.left = '12px';
						if (Services.prefs.getBoolPref('extensions.homepagenewtab.hide_search_field')) {
							var searchContainerChildren = searchContainer.childNodes;
							for (var m=0; m<searchContainerChildren.length; m++) {
								if (searchContainerChildren[m].style) {
									searchContainerChildren[m].style.display = 'none';
								}
							}
						}
					}
	} else {
		//use new method
		var gAllPagesEnabled = iframe.contentWindow.gAllPages.enabled;
		var parent = iframe.ownerDocument;
		if (gAllPagesEnabled) {
			//show the thumnbails
			var changesParent = {
				'#topSection': {
					style: null
				}
			}
			var changesIframe = {
				'#newtab-search-container': {
					'page-disabled': null
				}
			}
			for (var n in changesParent) {
				for (var n2 in changesParent[n]) {
					console.log('querySelectoring', n);
					if (changesParent[n][n2] === null) {
						parent.querySelector(n).removeAttribute(n2);
					} else {
						parent.querySelector(n).setAttribute(n2, changesParent[n][n2]);
					}
				}
			}
			for (var n in changesIframe) {
				for (var n2 in changesIframe[n]) {
					console.log('querySelectoring', n);
					if (changesIframe[n][n2] === null) {
						iframe.contentDocument.querySelector(n).removeAttribute(n2);
					} else {
						iframe.contentDocument.querySelector(n).setAttribute(n2, changesIframe[n][n2]);
					}
				}
			}
		} else {
			//dont show the thumbnails
			var changesParent = {
				'#topSection': {
					style: 'display:none'
				}
			};
			var changesIframe = {
				'#newtab-search-container': {
					'page-disabled': 'true'
				}
			};
			for (var n in changesParent) {
				for (var n2 in changesParent[n]) {
					console.log('querySelectoring', n);
					if (changesParent[n][n2] === null) {
						parent.querySelector(n).removeAttribute(n2);
					} else {
						parent.querySelector(n).setAttribute(n2, changesParent[n][n2]);
					}
				}
			}
			for (var n in changesIframe) {
				for (var n2 in changesIframe[n]) {
					console.log('querySelectoring', n);
					if (changesIframe[n][n2] === null) {
						iframe.contentDocument.querySelector(n).removeAttribute(n2);
					} else {
						iframe.contentDocument.querySelector(n).setAttribute(n2, changesIframe[n][n2]);
					}
				}
			}
		}
	}
}

function startup(aData, aReason) {
	if (aReason == ADDON_INSTALL || aReason == ADDON_ENABLE || aReason == ADDON_DOWNGRADE || aReason == ADDON_UPGRADE) {
		var url = Services.prefs.setCharPref('browser.newtab.url', 'about:home');
	}

	if (aReason == ADDON_INSTALL || aReason == ADDON_UPGRADE || aReason == ADDON_ENABLE || aReason == ADDON_DOWNGRADE) {
		try {
			var existCheck_prevent_focus = Services.prefs.getBoolPref('extensions.homepagenewtab.prevent_focus');
		} catch (ex) {
			Services.prefs.setBoolPref('extensions.homepagenewtab.prevent_focus', true);
		}
		
		try {
			var existCheck_prevent_focus = Services.prefs.getBoolPref('extensions.homepagenewtab.hide_search_field');
		} catch (ex) {
			Services.prefs.setBoolPref('extensions.homepagenewtab.hide_search_field', false);
		}
	}

	LMObserver = new myObserver;
	appliedURI = Services.io.newURI(aData.resourceURI.spec + 'global.css', null, null);
	sss.loadAndRegisterSheet(appliedURI, sss.USER_SHEET);

}

function shutdown(aData, aReason) {
	if (aReason == APP_SHUTDOWN) return;

	LMObserver.unregister();
	sss.unregisterSheet(appliedURI, sss.USER_SHEET);
	if (aReason == ADDON_UNINSTALL || aReason == ADDON_DISABLE) {
		var url = Services.prefs.clearUserPref('browser.newtab.url');
	}

}

function install() {}

function uninstall() {}
