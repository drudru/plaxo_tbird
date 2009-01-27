
/****** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1
 *
 * The contents of this file are subject to the Mozilla Public
 * License Version 1.1 (the "License"); you may not use this file
 * except in compliance with the License. You may obtain a copy of
 * the License at http://www.mozilla.org/MPL/
 * 
 * Software distributed under the License is distributed on an "AS
 * IS" basis, WITHOUT WARRANTY OF ANY KIND, either express or
 * implied. See the License for the specific language governing
 * rights and limitations under the License.
 * 
 * The Original Code is mozilla.org code.
 * 
 * The Initial Developer of the Original Code is Netscape
 * Communications Corporation.  Portions created by Netscape are
 * Copyright (C) 1999 Netscape Communications Corporation.  All
 * Rights Reserved.
 * 
 * Contributor(s): Dru Nelson            <plaxo.com>
 *
 * ***** END LICENSE BLOCK ***** */

var gInstallState = 0;

var gPlxPrefsMgr  = null;
var gPlxUserMgr   = null;
var gPlxAbookMgr  = null;
var gPlxHttpMgr   = null;
var gObserver = null;

window.addEventListener("load",     loadOverlay, false);
window.addEventListener("unload", unloadOverlay, false);

function include(pathName)
{
        var gScriptLoader =  Components.classes["@mozilla.org/moz/jssubscript-loader;1"].
                              getService(Components.interfaces.mozIJSSubScriptLoader);
        if (gScriptLoader)
        {
            gScriptLoader.loadSubScript(pathName);
        }
}

function isMainWindow()
{
    var winType = document.firstChild.getAttribute('windowtype');
    if (winType == 'mail:3pane')
        return true;

    return false;
}


function loadOverlay()
{
    include('chrome://plaxotbird/content/debug.js');
    PlxLogSysInit('main');
    include('chrome://plaxotbird/content/prefs.js');
    gPlxPrefsMgr = new PlxPrefsMgr();
    
    include('chrome://plaxotbird/content/user.js');
    
    
    var winType = document.firstChild.getAttribute('windowtype');
    gLog.debug("In Init Overlay: " + winType);  
    if (! isMainWindow())
    {
        RefreshToolbar(false);              // Hide the toolbar
        return;
    }
    
    // Init preferences    
    gInstallState = gPlxPrefsMgr.getIntPref('plaxo.plxInstallState', 0);
    
    //gPlxPrefsMgr.getBoolPref("plaxo.plxShowICUI", true);
    gPlxPrefsMgr.getBoolPref("plaxo.plxShowToolbar", true);
    var manualSync = gPlxPrefsMgr.getBoolPref("plaxo.plxManualSync", true);
    
    gPlxHttpMgr  = new PlxHttpMgr();
    gPlxUserMgr  = new PlxUserMgr();
    
    // Initialize the host
    if (gPlxUserMgr.isComcastUser())
    {
      gPlxPrefsMgr.getCharPref('plaxo.plxComcastHost', "https://plaxo.comcast.net/");
    }
    else
    {
      gPlxPrefsMgr.getCharPref('plaxo.plxComcastHost', "");
    }
    gPlxPrefsMgr.getCharPref('plaxo.plxHost', "https://oapi.plaxo.com/");

    RefreshToolbar();

    var i = gPlxPrefsMgr.getIntPref('plaxo.plxInstallState', 0);
    var waitTime = 120 * 1000;      // 2 mins
    if (i == 0)
        waitTime = 3000;            // 2 secs
        
    gLog.info("Done setting timeout: " + (waitTime / 1000) + " secs" );
    
    if (!manualSync)
        setTimeout(HandleClick, waitTime, 'plxsync');
        
    //gPlxHttpMgr  = new PlxHttpMgr();
    //gPlxUserMgr  = new PlxUserMgr();
 
 
    var clientType = gPlxPrefsMgr.getCharPref('plaxo.plxClientType');
    if (clientType == 'Comcast') {
      var button = document.getElementById("plaxoMenuBtn");
      if (button) {
        button.label = 'Universal Address Book';
        button.image = "chrome://plaxotbird/content/c_menuIcon.png"
      }
      button = document.getElementById("updateContactsBtn");
      if (button) {
        button.setAttribute('hidden', 'true');
      }
      button = document.getElementById("myPlaxoBtn");
      if (button) {
        button.label = 'Plaxo Online';
      }
      
      var menu = document.getElementById("plxComcastHelpMenuItem");
      if (menu) {
        menu.setAttribute('hidden', 'false');
      }
      var menu = document.getElementById("plxUABB");
      if (menu) {
        menu.setAttribute('hidden', 'false');
      }
      
      if (gPlxPrefsMgr.getBoolPref('plaxo.plxPrivacyFlag', false))
      {
        var menu = document.getElementById("updateContactsItem");
        if (menu)
          menu.setAttribute('hidden', 'true');
      }
      
      gPlxPrefsMgr.setBoolPref("plaxo.plxShowICUI", false);
    }
    else {
      gPlxPrefsMgr.getBoolPref("plaxo.plxShowICUI", true);
    }    
}


function unloadOverlay()
{
    gLog.debug("********* In Unload Overlay");
    if (gObserver)
        gObserver.unregister();    
}


function PlxMainObserver(name)
{
    this.name = name;
    this.registered = false;
}

PlxMainObserver.prototype = 
{
  observe: function(subject, topic, data)
  {
    if (topic == this.name && isInList(data, ['plxucw','plxmyplaxo','plxsync','plxprefs','plxabout', 'plxSlowSync', 'plxResetAccount', 'plxComcastHelp', 'plxDedup', 'plxRollback', 'plxECard', 'plxUABB', 'plxSettings', 'plxCommPrefs', 'plxSendLog']))
    {
        try
        {
            var t = new PlxTimer();
            gLog.debug("For observer: " + this.name + " command: " + data);
            t.start();
            HandleCommand(data);
            t.stop();
            t.Dump(gLog, '', "HandleCommand - " + data);
        }
        catch (ex)
        {
            gLog.fatal('observe  mesg: ' + ex.message);
            gLog.fatal('observe stack: ' + ex.stack);
            alert(ex.message + "\n\n stack: \n" + ex.stack);
        }
    }
    else
    {
        gLog.fatal("For observer: " + this.name + " ** unknown topic: " + topic + " command: " + data + " subject: " + subject);
    }
  },
  
  register: function()
  {
    gLog.debug("Adding observer: " + this.name);
    var observerService = Components.classes["@mozilla.org/observer-service;1"]
                          .getService(Components.interfaces.nsIObserverService);
    observerService.addObserver(this, this.name, false);
    
    this.registered = true;
  },
  
  unregister: function()
  {
    if (!this.registered)
    {
        gLog.debug("Doing unregister PlxMainObserver");
        return;
    }
    var observerService = Components.classes["@mozilla.org/observer-service;1"]
                            .getService(Components.interfaces.nsIObserverService);
    observerService.removeObserver(this, this.name);
  }
}


function RefreshToolbar()
{
    var b;
    
    if (! isMainWindow())
        b = false;
    else
        b = gPlxPrefsMgr.getBoolPref("plaxo.plxShowToolbar", true);
    
    var toolbar = document.getElementById("plaxo-bar");
    gLog.debug('RefreshToolbar: button: ' + toolbar + ' collapsed: ' + b);
    
    if (toolbar)
    {
        toolbar.collapsed = !b;
        gLog.debug('RefreshToolbar: button: ' + toolbar + ' collapsed: ' + b);
    }
}


function PlxInitObserver(arg)
{
    var enumerator = Components.classes["@mozilla.org/observer-service;1"]
                       .getService(Components.interfaces.nsIObserverService)
                       .enumerateObservers("PlxMainObserver");
    var i = 0;
    while (enumerator.hasMoreElements())
    {
        try
        {
            var o = enumerator.getNext().QueryInterface(Components.interfaces.nsIObserver);
            i = i + 1;
        }
        catch (e)
        {
            gLog.error('Caught execption while enumerating: ' + e);
        }
    }
    
    if (i == 1)
    {
        return;
    }
        
    gPlxAbookMgr = new PlxAddressBookMgr();
    
    gLog.debug("Doing init PlxMainObserver");
    gObserver = new PlxMainObserver("PlxMainObserver");
    gObserver.register();
}



function SetupUser()
{
    /*if (gPlxPrefsMgr.getCharPref('plaxo.plxClientID', '') == '')
    {
        var cid = gPlxHttpMgr.getClientID();
        if (cid == '')
        {
            gLog.error("Failed to get Client ID from Server.\nCommunication error. Stopping.");
            return 0;
        }
        else
            gPlxPrefsMgr.setCharPref('plaxo.plxClientID', cid);
    }
*/
    while (true)
    {
        var myBag = new Object();
        if (gPlxUserMgr.isComcastUser())
          window.openDialog("chrome://plaxotbird/content/c_signinDlg.xul", "stuff", "chrome,modal", myBag);
        else
          window.openDialog("chrome://plaxotbird/content/signinDlg.xul", "stuff", "chrome,modal", myBag);
        
        if (!myBag.isGood)
            return 0;
            
        gPlxUserMgr.setUser(myBag.username);

        var r = gPlxHttpMgr.createClientInfo(myBag);
      
        // XXX: Add a contract here ? or in doLogin ... yes
        if (r.code == undefined)
        {
          gLog.info("Failed to login. Server Error. Stopping");
          alert("There was a problem communicating with the server.\nStopping.");
          return 0;
        }
        else if (r.code == 'empty username')
        {
          gLog.info("Missing username");
          if (gPlxUserMgr.isComcastUser())
            alert("The Comcast email cannot be empty!");
          else
            alert("The username cannot be empty!");
          continue;
        }
        else if (r.code == 'empty password')
        {
          gLog.info("Missing password");
          alert("The password cannot be empty!");
          continue;
        }
        else if (r.code == '200')
        {
          gLog.info("createClientInfo succeeded with token" + r.session);
        }
        else if (r.code == '401')
        {
          if (r.subCode == '8')
          {
            gLog.error("createClientInfo unactivated user.");
            window.openDialog("chrome://plaxotbird/content/nonactivated.xul", "stuff", "chrome,modal", null);
          }
          else
          {
            gLog.error("createClientInfo Bad credentials. badLogin");
            if (gPlxUserMgr.isComcastUser())
              alert("Your Comcast email/password was not accepted. Please try again.");
            else 
              alert("Your login was not accepted. Please try again.");
          }
          continue;
        }
        else
        {
          gLog.error("createClientInfo Bad result code - status: " + r.code);
          alert("There was a problem communicating with the server.\nStopping.");
          return 0;
        }
        
        gPlxPrefsMgr.setCharPref('plaxo.plxClientID', r.clientId);
        gPlxUserMgr.setToken(r.session);
        gPlxUserMgr.setUhid(r.userId);
        
        return doGetUserInfo(myBag);
    }
}

function doGetUserInfo(args)
{
    var r = gPlxHttpMgr.getUserInfo(args);

    if (r.code == '200')
    {
      if (r.isComcast)
      {
        gPlxUserMgr.setPrivacyFlag(r.privacyFlag);
        gPlxUserMgr.setClientType('Comcast');
        gPlxUserMgr.setComcastGUID(r.guid);

       if (r.comcastStatus == 'Active')
        {
        }
        else if ((r.comcastStatus == 'Suspended') || (r.comcastStatus == 'Deleted'))
        {
          var myBag = new Object();
          var w = window.openDialog("chrome://plaxotbird/content/rollOffDlg.xul",
              "Roll-Off Dialog",
              "chrome,modal,centerscreen", myBag);
          if (myBag.rollOff)
            gPlxHttpMgr.DisplayURL3("https://plaxo.comcast.net/", "rolloff", "")
          return 0;
        }
        else if (r.comcastStatus == 'VOIP')
        {
        }
        else 
        {
        }
      } 
      else
      {
        gPlxUserMgr.setClientType('');
      }
    }
    else if ((r.code == '401') && (r.subCode == '7'))
    {
      gLog.error("doGetUserInfo failes with error code " + r.code + "and subCode " + r.subCode);
      alert('This Thunderbird endpoint has been deleted from Plaxo Online. Please set up your account again.');
      handlingSyncEvent = false;
      HandleCommand('plxResetAccount');
      return 0;
    }
    else
    {
      gLog.error("doGetUserInfo failes with error code " + r.status);
      alert('There was a communication error with the server\nwhen trying to do login. Stopping.');
      return 0;
    }
    
    return 1;
}

function PlxIntro()
{
    var myBag = {};
    myBag.isGood = 0;
    var w = window.openDialog("chrome://plaxotbird/content/introDlg.xul",
                "Welcome to the Plaxo toolbar for Thunderbird",
                "chrome,modal", myBag);
}



function HandleClick(buttonID)
{

    try
    {
        gLog.debug("HandleClick: " + buttonID);
    
        PlxInitObserver();

        gLog.debug('HandleClick doing notify Observers');
        Components.classes["@mozilla.org/observer-service;1"]
            .getService(Components.interfaces.nsIObserverService)
            .notifyObservers(null, "PlxMainObserver", buttonID);
    }
    catch (ex)
    {
        gLog.fatal("Addr failed to notify observers of: " + buttonID);
        gLog.fatal('HandleClick  mesg: ' + ex.message);
        gLog.fatal('HandleClick stack: ' + ex.stack);
        //alert(ex.message + "\n\n stack: \n" + ex.stack);
    }
}


function SendLogToPlaxo(subject,text){
  
  var msgComposeType = Components.interfaces.nsIMsgCompType;
  var msgComposFormat = Components.interfaces.nsIMsgCompFormat;
  var msgComposeService = Components.classes['@mozilla.org/messengercompose;1'].getService();
  msgComposeService = msgComposeService.QueryInterface(Components.interfaces.nsIMsgComposeService);

  gAccountManager = Components.classes['@mozilla.org/messenger/account-manager;1'].
  getService(Components.interfaces.nsIMsgAccountManager);

  var params = Components.classes['@mozilla.org/messengercompose/composeparams;1'].
  createInstance(Components.interfaces.nsIMsgComposeParams);
  
  if (params)
  {
    params.type = msgComposeType.New;
    params.format = msgComposFormat.Default;
    
    var composeFields = Components.classes['@mozilla.org/messengercompose/composefields;1'].
    createInstance(Components.interfaces.nsIMsgCompFields);

    if (composeFields)
    {
      composeFields.to = "support@plaxo.com";
      composeFields.body = text;
      composeFields.subject = subject;
    
      var targetFile = Components.classes["@mozilla.org/file/directory_service;1"].
        getService(Components.interfaces.nsIProperties).
        get("ProfD", Components.interfaces.nsIFile);
      targetFile.append("plx.log");

      var ioService = Components.classes["@mozilla.org/network/io-service;1"]
      ioService = ioService.getService(Components.interfaces.nsIIOService);
      var fileHandler = ioService.getProtocolHandler("file").QueryInterface(Components.interfaces.nsIFileProtocolHandler);
      var attachmentURL = fileHandler.getURLSpecFromFile(targetFile);

      var attachment = Components.classes["@mozilla.org/messengercompose/attachment;1"].createInstance(Components.interfaces.nsIMsgAttachment);
      attachment.url = attachmentURL;
      composeFields.addAttachment(attachment);


      params.composeFields = composeFields;

      msgComposeService.OpenComposeWindowWithParams(null, params);
    }
  }
}


// Right here is a clear cut example of why C++/C#/Java style destructors
// are a win. Rather than keep the state of the variable all over the place, I would
// just rather use some variable that acquires a lock in a global object for as 
// long as it is in scope. In Javascript, there is no easy way to do this, since
// the references are hidden to the programmer. C'est la vie.
// I'll end up re-organizing this in the notifier and eliminate most of this lock-check code
var handlingSyncEvent = false;

function HandleCommand(eventID)
{
    gLog.debug("HandleCommand: " + eventID);
    
    AssertIsInList(eventID, ['plxucw','plxmyplaxo','plxsync','plxprefs','plxabout', 'plxSlowSync', 'plxResetAccount', 'plxComcastHelp', 'plxDedup', 'plxRollback', 'plxECard', 'plxUABB', 'plxSettings', 'plxCommPrefs', 'plxSendLog']);
    
    if (isInList(eventID, ['plxsync','plxSlowSync', 'plxResetAccount']))
    {
        if (!handlingSyncEvent)
        {
            handlingSyncEvent = true;
        }
        else
        {
            gLog.error("Attempt to run sync again - stopped");
            return false;
        }
    }
    
    // Always read this in case the preferences changed
    gInstallState = gPlxPrefsMgr.getIntPref('plaxo.plxInstallState', 0);

    
    var firstTime = gPlxPrefsMgr.getIntPref('plaxo.plxFirstTime', 0);
    if (!firstTime)
    {
        PlxIntro();
        gPlxPrefsMgr.setIntPref('plaxo.plxFirstTime', 1);
    }

    if (eventID == 'plxResetAccount')
    {
        // User Manager
        gLog.error("Doing Full Account Reset");
  
        //remove client from server
        var args = {};
        args.uhid = gPlxUserMgr.getUhid();
        args.token = gPlxUserMgr.getToken();
        
        gPlxHttpMgr.deleteClient(args);  
        
        gPlxUserMgr.resetAccount();
 
        // Address Book Manager if not initialized, but don't get remotes
        gPlxAbookMgr.init(false);
        gPlxAbookMgr.Dump();
        gPlxAbookMgr.resetAccount();

        gPlxPrefsMgr.setCharPref('plaxo.plxClientID', '');
        gPlxPrefsMgr.removePref('plaxo.plxClientType');
        
        gInstallState = 0;
        gPlxPrefsMgr.setIntPref('plaxo.plxInstallState', gInstallState);
        //gPlxAbookMgr = new PlxAddressBookMgr();
        //alert('Plaxo - Account was fully reset.')
        
        handlingSyncEvent = false;
        return;
    }
    
    if (eventID == 'plxprefs')
    {
        DisplayPrefs();
        return;
    }
    
    if (eventID == 'plxabout')
    {
        window.openDialog("chrome://plaxotbird/content/about.xul", "About...", "chrome,modal,centerscreen", undefined);
        return;
    }
    
    if (eventID == 'plxComcastHelp')
    {
      var messenger = Components.classes["@mozilla.org/messenger;1"].createInstance();
      messenger = messenger.QueryInterface(Components.interfaces.nsIMessenger);
      messenger.launchExternalURL('http://comcasthelp.plaxo.com');
      return;
    }
    
    // Get Install State
    gInstallState = gPlxPrefsMgr.getIntPref('plaxo.plxInstallState');
    gLog.log('gInstallState:' + gInstallState);

/*
    // If we have user & pass, it's ok to handle these
    if (gInstallState >= 1 && eventID == 'plxmyplaxo')
    {
        DisplayMyPlaxo();
        return;
    }
    if (gInstallState >= 1 && eventID == 'plxucw')
    {
        DisplayUCW();
        return;
    }
*/    
    var oldComcast = false;
    var newComcast = false;
    var needSetup = false;
    // First Setup User or attempt login
    while (1)
    {
        if (gInstallState == 0)
        {
            needSetup = true;
            gLog.log('install state 0');
            
            oldComcast = gPlxUserMgr.isComcastUser();
            if (!SetupUser())
            {
                handlingSyncEvent = false;
                return;
            }
            
            newComcast = gPlxUserMgr.isComcastUser();
            if (newComcast)
            {
              host = gPlxPrefsMgr.getCharPref('plaxo.plxComcastHost');
              if (host == '')
                gPlxPrefsMgr.setCharPref('plaxo.plxComcastHost', "https://plaxo.comcast.net/");
            }
                
            gInstallState = 1;
            gPlxPrefsMgr.setIntPref('plaxo.plxInstallState', gInstallState);
            break;
        }
        else
        {
            var myBag = {};
            myBag.uhid = gPlxUserMgr.getUhid();
            myBag.token = gPlxUserMgr.getToken();
          
            if ((myBag.uhid == '') || (myBag.token == ''))
            {
              myBag.password = gPlxUserMgr.getPass();
              myBag.username = gPlxUserMgr.getUser();
              if ((myBag.password != '') && (myBag.username != '')) 
              {
                var r = gPlxHttpMgr.createClientInfo(myBag);
      
                if (r.code == '200')
                {
                  gLog.info("createClientInfo succeeded with token" + r.session);
       
                  gPlxPrefsMgr.setCharPref('plaxo.plxClientID', r.clientId);
                  gPlxUserMgr.setToken(r.session);
                  gPlxUserMgr.setUhid(r.userId);
        
                  gPlxUserMgr.removePass();
        
                  if (doGetUserInfo(myBag))
                    break;
                }

              }

              //failed to using existing user/pass to login
              gInstallState = 0;
              continue;
            }
          
            var ret = gPlxHttpMgr.getSession(myBag);
            //deleted account
            if ((ret != null) && (ret.code == '401') && (ret.subCode == '2'))
            {
              alert('This Plaxo account appears to have been deleted. \nPlease set up your Plaxo account again.');
              gPlxUserMgr.resetAccount();
              gPlxAbookMgr.resetAccount();

              gPlxPrefsMgr.setCharPref('plaxo.plxClientID', '');
              gPlxPrefsMgr.removePref('plaxo.plxClientType');
        
              gInstallState = 0;
              gPlxPrefsMgr.setIntPref('plaxo.plxInstallState', gInstallState);
              
              handlingSyncEvent = false;
            }
            else if ((ret != null) && (ret.code == '200'))
            {
              break;
            }
            else
            {
              alert('There was a communication error with the server\nwhen trying to do login. Stopping.');
              handlingSyncEvent = false;
              return;
            }
        }
    }
    
    // Setup folder mapping
    if (gInstallState == 1)   // XXX: Just 1 when done
    {
        gPlxAbookMgr.init();
        gPlxAbookMgr.Dump();
        
        if (gPlxAbookMgr.localFolders.length == 0)
        {
            alert('Your address book in Thunderbird is not initialized.\nPlease go into the Address book once,\nand then sync again.');
            handlingSyncEvent = false;
            return;
        }

        var rfolds = gPlxAbookMgr.remoteFolders.folders['Contacts'];
        if (rfolds.length == 0)
        {
            gLog.error("No remote folders for mapping. Old 1.3 user?");
            DisplayNoFolds();
            handlingSyncEvent = false;
            return;
        }
        
        // If we have just one or zero folders online
        var myBag = { remoteNames: [], remoteIDs: [] };

        var first = true;
        for (var i = 0; i < rfolds.length; i++)
        {
            // Find first non-deleted folder
            if (!rfolds[i].isDeleted)
            {
                if (false && rfolds[i].isDefault)
                {
                    myBag.remoteNames.unshift( rfolds[i].name );
                    myBag.remoteIDs.unshift( rfolds[i].netID );
                    first = false;
                }
                else
                {
                    myBag.remoteNames.push( rfolds[i].name );
                    myBag.remoteIDs.push( rfolds[i].netID );
                }
            }
        }
        

        window.openDialog("chrome://plaxotbird/content/folderMap.xul", "stuff", "chrome,modal", myBag);
        
        gLog.debug("Finish  Folder map.xul");
        
        if (!myBag.isGood)
        {
            msg = 'Folder mapping stopped. Setup canceled';
            gLog.debug(msg);
            //alert(msg);
            handlingSyncEvent = false;
            return;
        }
        
        if (myBag.results[1] == '-1')
        {
            msg = 'Sorry creating folders online isn\'t supported. Setup canceled';
            gLog.error(msg);
            alert(msg);
            handlingSyncEvent = false;
            return;
        }
        
        var lfold = gPlxAbookMgr.localFolders[0];
        lfold.netID = myBag.results[1];
        lfold.remoteName = myBag.results[0];
        
        //alert('Setting lfold: ' + lfold.name + ' to id ' + lfold.netID + ' named: ' + lfold.remoteName);
        
        // Now Sync the addressbook
        gLog.debug("Doing syncFolders!");
        gPlxAbookMgr.syncFolders();
        
        gInstallState = 2;
        gPlxPrefsMgr.setIntPref('plaxo.plxInstallState', gInstallState);
        
        handlingSyncEvent = false;

        if ((eventID == 'plxsync') || (eventID == 'plxSlowSync'))
        {
          if (needSetup)
            DisplaySyncPoint();
          if (oldComcast != newComcast)
            alert("You need to restart Thunderbird.");
          return;
        }
    } 
    
    switch (eventID)
    {
        //~ case "plxmenu":    alert("Nothing new on the menu today");
                            //~ break;
        case "plxucw":     DisplayUCW();
                            break;
        case "plxmyplaxo": DisplayMyPlaxo();
                            break;
        case "plxsync":    
                              var myBag = {};
                              myBag.uhid = gPlxUserMgr.getUhid();
                              myBag.token = gPlxUserMgr.getToken();
                              
                              if (!doGetUserInfo(myBag))
                              {
                                handlingSyncEvent = false;
                                return;
                              }
                            if (gPlxAbookMgr.init() == false)
                                gPlxAbookMgr.Dump();
                            gPlxAbookMgr.syncFolders();
                            handlingSyncEvent = false;
                            
                            if (! gPlxPrefsMgr.getBoolPref("plaxo.plxManualSync", true))
                            {
                                setTimeout(HandleClick, 21600 * 1000, 'plxsync'); 
                            }
                            break;
        case "plxSlowSync": 
                              var myBag = {};
                              myBag.uhid = gPlxUserMgr.getUhid();
                              myBag.token = gPlxUserMgr.getToken();
                              
                              if (!doGetUserInfo(myBag))
                              {
                                handlingSyncEvent = false;
                                return;
                              }
                            if (gPlxAbookMgr.init() == false)
                                 gPlxAbookMgr.Dump();
                            gPlxAbookMgr.syncFolders('slow');
                            handlingSyncEvent = false;
                            
                            if (! gPlxPrefsMgr.getBoolPref("plaxo.plxManualSync", true))
                            {
                                setTimeout(HandleClick, 21600 * 1000, 'plxsync'); 
                            }
                            break;

        case "plxDedup":
                            DisplayDedup();
                            break;
                            
        case "plxRollback":
                            DisplayRollback();
                            break;
        case "plxECard":
                            DisplayECard();
                            break;
        case "plxUABB":       
                            if (!needSetup || newComcast)
                              DisplayUABB();
                            break;
        case "plxSettings": DisplaySettings();
                            break;
        case "plxCommPrefs":
                            DisplayCommPrefs();
                            break;
        case "plxSendLog":
                            SendLogToPlaxo("Plaxo Toolbar for Thunderbird - plx.log", "");
                            break;

    }
    
    if (needSetup)
      DisplaySyncPoint();
    
    if (oldComcast != newComcast)
      alert("You need to restart Thunderbird.");
}



function DisplayPrefs()
{
    if (gPlxUserMgr.isComcastUser())
      window.openDialog("chrome://plaxotbird/content/c_prefsDlg.xul", "Preferences...", "chrome,modal,centerscreen", undefined);
    else
      window.openDialog("chrome://plaxotbird/content/prefsDlg.xul", "Preferences...", "chrome,modal,centerscreen", undefined);
    
    RefreshToolbar();
}

function DisplayMyPlaxo()
{
    gPlxHttpMgr.DisplayURL2('');
}

function DisplayUCW()
{
    gPlxHttpMgr.DisplayURL2('/request_updates?filternone=on%26filtersent=on%26filterreplied=on%26filterbounced=on%26filtermember=on');
}

function DisplayDedup()
{
    gPlxHttpMgr.DisplayURL2('/dedup');
}

function DisplayRollback()
{
    gPlxHttpMgr.DisplayURL2('/po3/?module=tools%26operation=recover_ab');
}

function DisplayNoFolds()
{
    window.openDialog("chrome://plaxotbird/content/noFoldsDlg.xul", "Plaxo Folder Map...", "chrome,modal,centerscreen", undefined);
}

function DisplayECard()
{
  gPlxHttpMgr.DisplayURL2('/click?key=ecard_link');
}

function DisplayUABB()
{
  gPlxHttpMgr.DisplayURL2('/cin?guid='+gPlxUserMgr.getComcastGUID()+'%26force_uabb=1');
}

function DisplayCommPrefs()
{
  gPlxHttpMgr.DisplayURL2('/po3/?module=myinfo%26operation=prefs%26t=communications');
}

function DisplaySettings()
{
  gPlxHttpMgr.DisplayURL2('/po3/?module=myinfo%26operation=prefs');
}

function DisplaySyncPoint()
{
  gPlxHttpMgr.DisplayURL2('/po3/?module=dashboard%26operation=finishSetup%26cid=' + gPlxPrefsMgr.getCharPref('plaxo.plxClientID'));
}