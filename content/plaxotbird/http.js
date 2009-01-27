
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
 
 
//
// Why did I make this a 'Class'. It just makes it easier
// for others to see where a function was defined so a search
// through the source is not required.
//
// (Technically this is not a classic-class since this is a prototype
// based language - does that sound snooty?  do I look fat?)
//

function PlxHttpMgr()
{
    this.uses = 0;

    // Grab the global scope logger and use that as a subclass
    this.log  = gLogSys.getLogger( "http." + gLog.name );
}


    
  
PlxHttpMgr.prototype.restPOSTCall = function (retObj)
{
    
    //var url = gPlxPrefsMgr.getCharPref('plaxo.plxHost');
    var url = this.getWebHost();
    Assert(url != null);
    
    var cgi = gPlxPrefsMgr.getCharPref('plaxo.plxCGI', 'rest');
    Assert(cgi != null);
    url = url + cgi;
    
    try
    {
        var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                        .getService(Components.interfaces.nsIIOService);
  
        var uri = ioService.newURI(url, null, null);
        var channel = ioService.newChannelFromURI(uri);
        var HttpRequest = channel.QueryInterface(Components.interfaces.nsIHttpChannel);                                     
        HttpRequest.redirectionLimit = 0; //stops automatic redirect handling
        
        
        var postData = "format=js2&package=";
        var postData2 = 'format=js2&package=';
       
        if (retObj.header)
        {
            postData = postData + encodeURIComponent(retObj.header);
            postData2 = postData2 + retObj.header;
        }
        else
        {
            var hdr = "['Header', 'ClientID', '" + gPlxPrefsMgr.getCharPref('plaxo.plxClientID');
            hdr = hdr + "', 'Client', 'PlaxoThunderBird";
            hdr = hdr + "', 'AuthMethod', 'Token";
            hdr = hdr + "', 'Uhid', '" + gPlxPrefsMgr.getCharPref('plaxo.plxUhid');
            hdr = hdr + "', 'Password', '" + gPlxPrefsMgr.getCharPref('plaxo.plxToken');
            hdr = hdr + "']\n['/Header']\n";
            postData = postData + encodeURIComponent(hdr);
            postData2 = postData2 + hdr;
        }
        
        postData = postData + encodeURIComponent(retObj.body);
        postData2 = postData2 + retObj.body;

        // XXX : Logging subsystem should show actual post data here without escaping
        this.log.debug("postData: " + postData2);
        
        if (postData)
        {
            var uploadStream = Components.classes["@mozilla.org/io/string-input-stream;1"]
                                .createInstance(Components.interfaces.nsIStringInputStream);         
            uploadStream.setData(postData, postData.length);
    
            var uploadChannel = channel.QueryInterface(Components.interfaces.nsIUploadChannel);
            uploadChannel.setUploadStream(uploadStream, "application/x-www-form-urlencoded", -1); 
        }
        HttpRequest.requestMethod = "POST";
        
        var myBag = new Object();
        myBag.channel = HttpRequest;
        myBag.title = retObj.reason;
        window.openDialog("chrome://plaxotbird/content/progress.xul", "Progress", "chrome,modal,width=400,height=150", myBag);
    
        if (!myBag.isGood)
        {
            this.log.error("progress cancelled.");
            return 0;
        }


        var txt = myBag.data;
        this.log.info("restResult: " + txt);
        try 
        {
            // Why?????
            var gObj = retObj;
            D = gObj.handler;
            eval(txt);
        } catch (ex)
        {
            this.log.error("http.js: restPOSTCall : eval : Exception : " + ex.name + ".\nError message: " + ex.message);
            this.log.error(ex);
            this.log.error('Bad eval: ' + txt);
            return 0;
        }
    
       return 1;  
    }
    catch(e)
    {
        this.log.error("http.js: restPOSTCall : Exception : " + e.name + ".\nError message: " + e.message);
        return 0;
    }
}



PlxHttpMgr.prototype.getWebHost = function (retObj)
{
    var host = null;
    if (gPlxUserMgr.isComcastUser())
    {
      host = gPlxPrefsMgr.getCharPref('plaxo.plxComcastHost');
      if (host == null)
        host = "https://plaxo.comcast.net/";
    }
    else 
    {
      host = gPlxPrefsMgr.getCharPref('plaxo.plxHost');
      if (host == null)
        host == "https://www.plaxo.com/"
    }
    
    Assert(host != null);
    
    // The api box doesn't do web session management
    if (host == "https://oapi.plaxo.com/")
        host = "https://www.plaxo.com/";
    
    // Make sure we are securer (yes, the mispelling is on purpose)
    if (host.substring(0,7) != "https:/")
    {
        host = host.replace(/p:/, "ps:");
    }

    AssertString(host);
    
    return host;
}
 
PlxHttpMgr.prototype.jsonPostCall = function (bAsync, retObj)
{
  if (retObj == null)
    return 0;
    
  if (bAsync == undefined)
    bAsync = true;
    
  //var url = gPlxPrefsMgr.getCharPref('plaxo.plxHost');
  var url = this.getWebHost();
  Assert(url != null);

  url = url + retObj.apiClass;
  
  var postData = "";
  var postData2 = "";
  
  try 
  {
    var postData = retObj.jsonData;
    this.log.debug("jsonPostData: " + postData);
    
    var req = new XMLHttpRequest();
    req.open('POST', url, bAsync);
    
    //async request
    if (bAsync && retObj._callBack) {
      req.onreadystatechange = function() {
        if (req.readyState != 4){
          return false;
        }
  
        retObj.status = req.status;
        if (req.status != 200) {
          return 0;
        }

        retObj.data = req.responseText;
        retObj._callBack();
      }     
    }
    
    req.setRequestHeader("Content-Type", "application/json");
    req.send(postData);
    
    //sync request
    if (!bAsync && retObj._callBack) {
      retObj.status = req.status;
      if (req.status != 200) {
        return 0;
      }
      retObj.data = req.responseText;
      retObj._callBack();
    }
    
    return 1; 
  }
  catch (e)
  {
    this.log.error("http.js: jsonPostCall : Exception : " + e.name + ".\nError message: " + e.message);
    return 0;
  }
  
}

PlxHttpMgr.prototype.restPOSTCall2 = function (retObj)
{
    var url = this.getWebHost() + "signin";
    
    try
    {
        var ioService = Components.classes["@mozilla.org/network/io-service;1"]
                        .getService(Components.interfaces.nsIIOService);
  
        var uri = ioService.newURI(url, null, null);
        var channel = ioService.newChannelFromURI(uri);
        var HttpRequest = channel.QueryInterface(Components.interfaces.nsIHttpChannel);                                     
        HttpRequest.redirectionLimit = 0; //stops automatic redirect handling
        
        var postData = "";
        
        for (var i = 0; i < retObj.vars.length; i+=2)
        {
            if (i != 0)
                postData = postData + "&";
                
            postData = postData + retObj.vars[i] + "=" + encodeURIComponent(retObj.vars[i+1]);
        }
        
        this.log.debug("postData: " + postData);
        
        if (postData)
        {
            var uploadStream = Components.classes["@mozilla.org/io/string-input-stream;1"]
                                .createInstance(Components.interfaces.nsIStringInputStream);         
            uploadStream.setData(postData, postData.length);
    
            var uploadChannel = channel.QueryInterface(Components.interfaces.nsIUploadChannel);
            uploadChannel.setUploadStream(uploadStream, "application/x-www-form-urlencoded", -1); 
        }
        HttpRequest.requestMethod = "POST";
        
        var myBag = new Object();
        myBag.channel = HttpRequest;
        myBag.title = retObj.reason;
        window.openDialog("chrome://plaxotbird/content/progress.xul", "Progress", "chrome,modal,width=400,height=150", myBag);
    
        if (!myBag.isGood)
        {
            this.log.error("progress cancelled.");
            return 0;
        }


        var txt = myBag.data;
        this.log.info("restResult2: " + txt);
        
        retObj.sessionKey = undefined;
        if (myBag.sessionKey)
            retObj.sessionKey = myBag.sessionKey;
            
        return 1;  
    }
    catch(e)
    {
        this.log.error("http.js: restPOSTCall : Exception : " + e.name + ".\nError message: " + e.message);
        return 0;
    }
}


PlxHttpMgr.prototype.convertToDict = function(args)
{
    var d = undefined;
    
    try
    {
        if (args.length > 0 && args.length < 3)
        {
            d = { };
            
            if (args.length >= 1)
            {
                d.cmd = { '_type' : args[0][0] };
                
                // XXX: Parity check
                for (var i = 1; i < args[0].length; i += 2)
                {
                    /*
         _______________
        /               \
       /                 \
      /                   \
      |   XXXX     XXXX   |
      |   XXXX     XXXX   |
      |   XXX       XXX   |
      |         X         |
      \__      XXX      __/
        |\     XXX     /|
        | |           | |
        | I I I I I I I |
        |  I I I I I I  |
        \_             _/
          \_         _/
            \_______/
    XXX                    XXX
   XXXXX                  XXXXX
   XXXXXXXXX         XXXXXXXXXX
          XXXXX   XXXXX
             XXXXXXX
          XXXXX   XXXXX
   XXXXXXXXX         XXXXXXXXXX
   XXXXX                  XXXXX
    XXX                    XXX

   DO NOT TURN ON decodeURIComponent unless you want
   to DESTROY your addressbook!!!!  (as of Thunderbird 1.0.6)
   Dru Nelson 7/29/2005 12:04 AM PST

*/
                    d.cmd[args[0][i]] = args[0][i+1]; //decodeURIComponent(args[0][i+1]);
                }
            }
                
            if (args.length == 2)
            {
                d.data = { };
                
                // XXX: Parity check
                for (var i = 1; i < args[1].length; i += 2)
                {
                    d.data[args[1][i]] = args[1][i+1];
                }
            }
        }
    }
    catch(e)
    {
        this.log.error("http.js: convertToDict : Exception : " + e.name + ".\nError message: " + e.message);
        return undefined;
    }
    
    return d;
}


PlxHttpMgr.prototype.getCookies = function ()
{
    var cookieManager = Components.classes["@mozilla.org/cookiemanager;1"]
                        .getService(Components.interfaces.nsICookieManager);

    var iter = cookieManager.enumerator;
    
    this.log.info("Dumping Cookies");
    this.log.info("---------------");
    while (iter.hasMoreElements())
    {
        var cookie = iter.getNext();
        if (cookie instanceof Components.interfaces.nsICookie)
        {
          //if (cookie.host == "www.plaxo.com")
            this.log.info(cookie.name + " - " + cookie.value);
        }
    }
    this.log.info("---------------");
}

//copied from json.js
String.prototype.parseJSON = function () {
    try {
        return !(/[^,:{}\[\]0-9.\-+Eaeflnr-u \n\r\t]/.test(
                this.replace(/"(\\.|[^"\\])*"/g, ''))) &&
            eval('(' + this + ')');
    } catch (e) {
        return false;
    }
};


PlxHttpMgr.prototype.getSession = function (args)
{
  var retObj = {};
  if ((args.username != undefined) && (args.password != undefined))
    retObj.jsonData = "{ \"GetSessionRequest\": {\"authInfo\": {\"clientInfo\": {\"clientId\": \"" + gPlxPrefsMgr.getCharPref('plaxo.plxClientID') + "\"}, \"authByIdentity\":{\"identity\": \"" + args.username + "\",\"password\": \"" + args.password + "\"}}}}";
  else if ((args.uhid != undefined) && (args.token != undefined))
    retObj.jsonData = "{ \"GetSessionRequest\": {\"authInfo\": {\"clientInfo\": {\"clientId\": \"" + gPlxPrefsMgr.getCharPref('plaxo.plxClientID') + "\"}, \"authByToken\":{\"userId\": \"" + args.uhid + "\",\"token\": \"" + args.token + "\"}}}}";
  else
    return null;

  retObj.apiClass = "axis/json/member";
  retObj._callBack = function () 
  {    
    var ret = retObj.data.parseJSON();
    retObj.code = ret.response.code;
    retObj.subCode = ret.response.subCode;
  
    return;
  };
  this.jsonPostCall(false, retObj);
  return retObj;
}


PlxHttpMgr.prototype.getUserInfo = function (args)
{

  var retObj = {};
  if ((args.username != undefined) && (args.password != undefined))
    retObj.jsonData = "{ \"GetUserInfoRequest\": {\"authInfo\": {\"clientInfo\": {\"clientId\": \"" + gPlxPrefsMgr.getCharPref('plaxo.plxClientID') + "\"}, \"authByIdentity\":{\"identity\": \"" + args.username + "\",\"password\": \"" + args.password + "\"}}}}";
  else if ((args.uhid != undefined) && (args.token != undefined))
    retObj.jsonData = "{ \"GetUserInfoRequest\": {\"authInfo\": {\"clientInfo\": {\"clientId\": \"" + gPlxPrefsMgr.getCharPref('plaxo.plxClientID') + "\"}, \"authByToken\":{\"userId\": \"" + args.uhid + "\",\"token\": \"" + args.token + "\"}}}}";
  else
    return null;
    
  retObj.apiClass = "axis/json/member";
  retObj._callBack = function () 
  {    
    var ret = retObj.data.parseJSON();
    retObj.code = ret.response.code;    
    
    if (ret.response.code == '200')
    {
      if (ret.comcast != undefined)
      {
        retObj.isComcast = 'true';
        retObj.comcastStatus = ret.comcast.status;
        retObj.privacyFlag = ret.comcast.privacyFlag;
        retObj.guid = ret.comcast.guid;
      }
    }
    else
    {
      retObj.subCode = ret.response.subCode;
      retObj.message = ret.response.message;
    }
  };
  this.jsonPostCall(false, retObj);
  return retObj;
}

PlxHttpMgr.prototype.createClientInfo = function (args)
{

   var retObj = {};
  if ((args.username == undefined) ||(args.username == '')) 
  {
    retObj.code = 'empty username';
    return retObj;
  }
  if ((args.username == undefined) || (args.password == '')) {
    retObj.code = 'empty password';
    return retObj;
  }
  
  if ((args.username != undefined) && (args.password != undefined))
    retObj.jsonData = "{ \"CreateClientInfoRequest\": {\"authInfo\": {\"authByIdentity\":{\"identity\": \"" + args.username + "\",\"password\": \"" + args.password + "\"}, \"sessionType\": \"AuthToken\"},";
  else
    return null;
    
  retObj.jsonData +=  "\"clientInfo\": {\"clientName\": \"Thunderbird\", \"type\": \"Thunderbird\"} ";
    
  retObj.jsonData += "}}";
    
  retObj.apiClass = "axis/json/sync";
  retObj._callBack = function () 
  {    
    var ret = retObj.data.parseJSON();
    retObj.code = ret.response.code;
    retObj.subCode = ret.response.subCode;
    
    if (ret.response.code == '200')
    {
      retObj.userId = ret.response.userId;
      retObj.session = ret.response.session;
      retObj.clientId = ret.clientId;
    }
  };
  this.jsonPostCall(false, retObj);
  return retObj;
}

PlxHttpMgr.prototype.deleteClient = function (args)
{

   var retObj = {};

  if ((args.uhid != '') && (args.token != ''))
    retObj.jsonData = "{ \"DeleteClientRequest\": {\"clientId\": \"" + gPlxPrefsMgr.getCharPref('plaxo.plxClientID') + "\",\"authInfo\": {\"clientInfo\": {\"clientId\": \"" + gPlxPrefsMgr.getCharPref('plaxo.plxClientID') + "\"}, \"authByToken\":{\"userId\": \"" + args.uhid + "\",\"token\": \"" + args.token + "\"}}}}";
  else
    return null;
   
  retObj.apiClass = "axis/json/sync";
  retObj._callBack = function () 
  {    
    var ret = retObj.data.parseJSON();
    retObj.code = ret.response.code;
    
    if (ret.response.code == '200')
    {

    }
  };
  //async
  this.jsonPostCall(true, retObj);
  return retObj;
}



/*
PlxHttpMgr.prototype.getClientID = function ()
{

    var myBag = {};
    
    myBag.reason = "Creating Guid...";
    myBag.header = "['Header']\n['/header']\n";;
    myBag.body   = "['CreateGUID']\n";
    myBag.log    = this.log;
    myBag.result = '';
        
    
    // anon function which will process statements
    myBag.handler = function (s)
    {
        var d = gPlxHttpMgr.convertToDict(arguments);
        
        // XXX : Handle better
        if (d == undefined)
            return;
        
        if (d.cmd._type == 'Status')
        {
            if (d.cmd.Code == 200)
                myBag.good = true;
        }
        if (d.cmd._type == 'Item')
        {
            myBag.log.info('Got GUID');
            myBag.result = d.data.GUID;
        }
    }
    
    var ret = this.restPOSTCall(myBag);
    
    if (!ret)
    {
        // XXX: Need better error handling
        //if (theirBag) theirBag.reason = 'Server Communication Error';
        return'';
    }

    if (myBag.result == '')
    {
        // XXX: Need better error handling
        //if (theirBag) theirBag.reason = 'Invalid Credentials';
        return '';
    }
    
    this.log.info("GetGuid returned: " + myBag.result);
    return myBag.result;
}
*/

PlxHttpMgr.prototype.DisplayURL = function (redir, width, height)
{

    if (width == undefined)
        width = '750';
    
    if (height == undefined)
        height = '650';
    

    var bag = {};
    if (!gPlxUserMgr.doLogin2(bag))
    {
        this.log.error("DisplayURL : couldn't get session key");
        return 0;
    }
    
    var url = this.getWebHost() + "signin?cl=1&session=" +
                bag.sessionKey + "&r=" + redir;
                
    
    var w = window.openDialog("chrome://plaxotbird/content/browser.xul",
                "Plaxo", "chrome,width=" + width + ",height=" + height, url);
    //var b = w.document.getElementById('browser');
    //this.log.info('b: ' + b);
    //b.src = "http://www.google.com/";
    //const nsIWebNavigation = Components.interfaces.nsIWebNavigation;
    //b.webNavigation.loadURI("http://www.yahoo.com",
    //                nsIWebNavigation.LOAD_FLAGS_NONE, null, null, null);
    

    //b.loadURI(url);
                
    //var messenger = Components.classes["@mozilla.org/messenger;1"].createInstance();
    //messenger = messenger.QueryInterface(Components.interfaces.nsIMessenger);
    //messenger.launchExternalURL(url);
    return 0;
}

PlxHttpMgr.prototype.DisplayURL2 = function (url)
{
    var finalUrl = this.getWebHost();
    if (gPlxUserMgr.isComcastUser())
      finalUrl = "https://plaxo.comcast.net/";
    
    finalUrl = finalUrl + "signin?cl=1&signin.cid=" + gPlxPrefsMgr.getCharPref('plaxo.plxClientID') + "&signin.uid=" + gPlxUserMgr.getUhid() + "&signin.at=" + gPlxUserMgr.getToken();       
    if ((url != null) && (url != ''))
      finalUrl = finalUrl + "&r=" + url; 
    var messenger = Components.classes["@mozilla.org/messenger;1"].createInstance();
    messenger = messenger.QueryInterface(Components.interfaces.nsIMessenger);
    messenger.launchExternalURL(finalUrl);
}

PlxHttpMgr.prototype.DisplayURL3 = function (base, cgi, url)
{
    var finalUrl = base;
    if ((finalUrl == null) || (finalUrl == ''))
    {
      if (gPlxUserMgr.isComcastUser())
        finalUrl = "https://plaxo.comcast.net/";
      else
        finalUrl = this.getWebHost();
    }
    
    if ((cgi != null) && (cgi != ''))
      finalUrl = finalUrl + cgi + "?";
    else
      finalUrl = finalUrl + "signin?";
      
    finalUrl = finalUrl + "cl=1&signin.cid=" + gPlxPrefsMgr.getCharPref('plaxo.plxClientID') + "&signin.uid=" + gPlxUserMgr.getUhid() + "&signin.at=" + gPlxUserMgr.getToken();   
    if ((url != null) && (url != ''))
      finalUrl = finalUrl + "&r=" + url; 

    var messenger = Components.classes["@mozilla.org/messenger;1"].createInstance();
    messenger = messenger.QueryInterface(Components.interfaces.nsIMessenger);
    messenger.launchExternalURL(finalUrl);
}
