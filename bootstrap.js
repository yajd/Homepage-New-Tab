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
				console.info('HomepageNewTab - gURLBarUpped', 'Services.focus.focusedElement=', Services.focus.focusedElement);
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
			iframe.setAttribute('id', 'homepage-new-tab-iframe');
			iframe.setAttribute('style', 'border:0; -moz-box-flex:1;');
			domDoc.body.insertBefore(iframe, domDoc.querySelector('#topSection').nextSibling);
			var newToggleButton = domDoc.createElement('input');
			newToggleButton.setAttribute('id', 'newtab-toggle');
			newToggleButton.setAttribute('type', 'button');
			newToggleButton.setAttribute('style', '-moz-user-focus: normal; position: absolute; right: 12px; top: 12px; cursor: pointer; color: -moz-dialogtext; font: message-box; font-size: 75%; width: 16px; height: 16px; background: -216px 0 transparent url(chrome://browser/skin/newtab/controls.png); border: none; padding: 0;');
			domDoc.body.appendChild(newToggleButton);
			newToggleButton.addEventListener('click', function(e) {
				e.target.ownerDocument.querySelector('#homepage-new-tab-iframe').contentDocument.querySelector('#newtab-toggle').click();
			}, false);

			iframe.contentWindow.location = 'about:newtab';
			iframe.addEventListener('load', function() {
			
				reflectToggle(domDoc);
				var toggleButton = iframe.contentDocument.querySelector('#newtab-toggle');
				toggleButton.addEventListener('click', function() {
					domDoc.defaultView.setTimeout(function() { //have to set timeout because when the toggle button is clicked i think its firing after this function, so this function will think its the old value, and because im letting that toggle button handling the showing of the thumbnails it will show it or hide it to whatever is the new
						reflectToggle(domDoc);
						var windows = Services.wm.getEnumerator('navigator:browser'); //THIS GETS ALL BROWSER TYPE WINDOWS (MEANING IT HAS GBROWSER)
						while (windows.hasMoreElements()) {
							var browserWin = windows.getNext();
							var domWindow = browserWin.QueryInterface(Ci.nsIDOMWindow); // i dont think i need this as getEnumerator gets `nsIDOMWindow`s
							var tabbrowser = browserWin.gBrowser;
							var numTabs = tabbrowser.browsers.length;
							for (var index = 0; index < numTabs; index++) {
								var currentBrowser = tabbrowser.getBrowserAtIndex(index);
								if (/^about\:home$/im.test(currentBrowser.currentURI.spec) && currentBrowser.contentDocument != domDoc) {
									var inHereIframe = currentBrowser.contentDocument.querySelector('#homepage-new-tab-iframe');
									if (inHereIframe) {
										reflectToggle(currentBrowser.contentDocument);
									}
								}
							}
						}
					}, 20);
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

function reflectToggle(tdDoc) {
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
	var iframe = tdDoc.querySelector('#homepage-new-tab-iframe');
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
		var iframeDoc = iframe.contentDocument;
		
		if (gAllPagesEnabled) {
			//show the thumnbails
			console.info('gAllPagesEnabled=', gAllPagesEnabled, 'showing thumbnails');
			var changes = {
				body: {
					targetDocument: parent,
					'page-disabled': null
				},
				'#brandLogo': {
					targetDocument: parent,
					style: 'display:none'
				},
				'#topSection': {
					targetDocument: parent,
					style: 'margin-top:10px;'
				},
				'#snippetContainer': {
					targetDocument: parent,
					style: 'display:none'
				},
				'#newtab-search-container': {
					targetDocument: iframeDoc,
					style: 'display:none;'
				},
				'#newtab-margin-undo-container': {
					targetDocument: iframeDoc,
					'style': 'position: absolute; width: 100%; display: flex; justify-content: center; align-items: center; max-height:none; margin-top: -30px;'
				},/*
				'#newtab-margin-top': {
					targetDocument: iframeDoc,
					'style': 'display:none'
				},
				'#newtab-margin-bottom': {
					targetDocument: iframeDoc,
					'style': 'display:none'
				},*/
				'#newtab-search-container': {
					targetDocument: iframeDoc,
					style: 'display:none;'
				},
				'#newtab-toggle': {
					targetDocument: iframeDoc,
					style: 'display:none'
				},
				'#homepage-new-tab-iframe': {
					targetDocument: parent,
					'style': 'border:0; -moz-box-flex:1;' // because i set when i create the iframe: 'border:0; -moz-box-flex:1;' i have to include these but the change here is the display
				},
				'.spacer': {
					targetDocument: parent,
					style: 'display:none'
				},
				'#homepage-new-tab-iframe ~ .spacer': {
					targetDocument: parent,
					style: 'display:none'
				}
			}
			if (Services.prefs.getBoolPref('extensions.homepagenewtab.hide_search_field')) {
				changes['#searchContainer'] = {
					targetDocument: parent,
					style: 'display:none;'
				}
			} else {
				changes['#searchContainer'] = {
					targetDocument: parent,
					style: null
				}
			}
			for (var qSelector in changes) {
				console.log('targetDocument', changes[qSelector].targetDocument == parent ? 'parent' : 'iframeDoc');
				console.log('querySelectoring', qSelector);
				var el = changes[qSelector].targetDocument.querySelector(qSelector);
				
				if (!el) {
					console.warn('el after querySelector was undefined', el);
					continue;
				}
				for (var prop in changes[qSelector]) {
					if (prop == 'targetDocument') { continue; }
					console.log('on property', prop, 'set to = ', changes[qSelector][prop]);
					if (changes[qSelector][prop] === null) {
						el.removeAttribute(prop);
					} else {
						el.setAttribute(prop, changes[qSelector][prop]);
					}
				}
			}
		} else {
			//dont show the thumbnails
			console.info('gAllPagesEnabled=', gAllPagesEnabled, 'hiding thumbnails');
			var changes = {
				body: {
					targetDocument: parent,
					'page-disabled': 'true'
				},
				'#brandLogo': {
					targetDocument: parent,
					style: null
				},
				'#topSection': {
					targetDocument: parent,
					style: null
				},
				'#snippetContainer': {
					targetDocument: parent,
					style: null
				},/*
				'#newtab-margin-top': {
					targetDocument: iframeDoc,
					'style': null
				},
				'#newtab-margin-bottom': {
					targetDocument: iframeDoc,
					'style': null
				},*/
				'#newtab-search-container': {
					targetDocument: iframeDoc,
					style: null
				},
				'#newtab-margin-undo-container': {
					targetDocument: iframeDoc,
					'style': null
				},
				'#newtab-search-container': {
					targetDocument: iframeDoc,
					style: null
				},
				'#newtab-toggle': {
					targetDocument: iframeDoc,
					style: null
				},
				'#searchContainer': {
					targetDocument: parent,
					style: null
				},
				'#homepage-new-tab-iframe': {
					targetDocument: parent,
					'style': 'display:none; border:0; -moz-box-flex:1;' // because i set when i create the iframe: 'border:0; -moz-box-flex:1;' i have to include these but the change here is the display
				},
				'.spacer': {
					targetDocument: parent,
					style: null
				},
				'#homepage-new-tab-iframe ~ .spacer': {
					targetDocument: parent,
					style: null
				}
			}
			for (var qSelector in changes) {
				console.log('targetDocument', changes[qSelector].targetDocument == parent ? 'parent' : 'iframeDoc');
				console.log('querySelectoring', qSelector);
				var el = changes[qSelector].targetDocument.querySelector(qSelector);
				
				if (!el) {
					console.warn('el after querySelector was undefined', el);
					continue;
				}
				for (var prop in changes[qSelector]) {
					if (prop == 'targetDocument') { continue; }
					console.log('on property', prop, 'set to = ', changes[qSelector][prop]);
					if (changes[qSelector][prop] === null) {
						el.removeAttribute(prop);
					} else {
						el.setAttribute(prop, changes[qSelector][prop]);
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
