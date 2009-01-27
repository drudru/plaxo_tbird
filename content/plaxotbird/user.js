
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

// This object handles user data and authentication with server
// Depends on PrefsMgr and HttpMgr


function PlxUserMgr()
{
    this.user = gPlxPrefsMgr.getCharPref('plaxo.plxUserName', '');
    this.uhid = gPlxPrefsMgr.getCharPref('plaxo.plxUhid', '');
    this.token = gPlxPrefsMgr.getCharPref('plaxo.plxToken', '');
    //for comcast build only
    this.clientType = gPlxPrefsMgr.getCharPref('plaxo.plxClientType', '');
    this.comcastGUID = gPlxPrefsMgr.getCharPref('plaxo.plxComcastGUID', '');
    this.privacyFlag = gPlxPrefsMgr.getBoolPref('plaxo.plxPrivacyFlag', false);
    
    // Grab the global scope logger and use that as a subclass
    this.log  = gLogSys.getLogger( "user." + gLog.name );
}

PlxUserMgr.prototype.setUser = function(u)
{
    this.user = u;
    gPlxPrefsMgr.setCharPref('plaxo.plxUserName', u);
}

PlxUserMgr.prototype.setUhid = function(u)
{
    this.uhid = u;
    gPlxPrefsMgr.setCharPref('plaxo.plxUhid', u);
}

PlxUserMgr.prototype.setToken = function(t)
{
    this.token = t;
    gPlxPrefsMgr.setCharPref('plaxo.plxToken', t);
}

PlxUserMgr.prototype.setComcastGUID = function(g)
{
    this.comcastGUID = g;
    gPlxPrefsMgr.setCharPref('plaxo.plxComcastGUID', g);
}

/*
PlxUserMgr.prototype.setPass = function(p)
{
    try 
    {
        this.removePass();
        
        var passManager = Components.classes["@mozilla.org/passwordmanager;1"]
                                .getService(Components.interfaces.nsIPasswordManager);
        
        passManager.addUser("chrome://plaxotbird", this.user, p);
    }
    catch(ex)
    {
        this.log.fatal('getpassword  mesg: ' + ex.message)
        this.log.fatal('getpassword stack: ' + ex.stack)
    }
}
*/
PlxUserMgr.prototype.removePass = function()
{
    try 
    {
        var passManager = Components.classes["@mozilla.org/passwordmanager;1"]
                                .getService(Components.interfaces.nsIPasswordManager);
        
        var i = false;
        try { passManager.removeUser("chrome://plaxotbird", this.user); i = true; }
        catch (ex)
        {
            this.log.debug('rempassword  mesg: ' + ex.message)
            this.log.debug('rempassword stack: ' + ex.stack)
            this.log.debug('No password to remove');
        }
        if (i)
            this.log.debug('Password removed');
    }
    catch(ex)
    {
        this.log.fatal('rempassword  mesg: ' + ex.message)
        this.log.fatal('rempassword stack: ' + ex.stack)
    }
}

PlxUserMgr.prototype.getUser = function()
{
    return this.user;
}

PlxUserMgr.prototype.getUhid = function()
{
    return this.uhid;
}

PlxUserMgr.prototype.getToken = function()
{
    return this.token;
}

PlxUserMgr.prototype.getComcastGUID = function()
{
    return this.comcastGUID;
}

PlxUserMgr.prototype.isComcastUser = function()
{
  if (this.clientType == 'Comcast')
    return true;
    
  return false;
}

PlxUserMgr.prototype.setClientType = function(t)
{
  this.clientType = t;
  gPlxPrefsMgr.setCharPref('plaxo.plxClientType', t);
}

PlxUserMgr.prototype.getPrivacyFlag = function()
{
  if (this.clientType != 'Comcast')
    return false;
    
  return this.privacyFlag;
}

PlxUserMgr.prototype.setPrivacyFlag = function(p)
{
  this.privacyFlag = p;
  gPlxPrefsMgr.setBoolPref('plaxo.plxPrivacyFlag', p);
}


PlxUserMgr.prototype.getPass = function()
{
    var host = {value:""};
    var user = {value:""};
    var pass = {value:""}; 
    
    try 
    {
        var passManager = Components.classes["@mozilla.org/passwordmanager;1"]
                                .getService(Components.interfaces.nsIPasswordManagerInternal);
                                
        passManager.findPasswordEntry("chrome://plaxotbird", "", "", host, user, pass);
    }
    catch(ex)
    {
        gLog.debug('getPass  mesg: ' + ex.message)
        gLog.debug('getPass stack: ' + ex.stack)
    }
  
    return (pass.value);
}

PlxUserMgr.prototype.resetAccount = function()
{
    //this.removePass();      // Order is important since we need the username to remove the password
    this.setUser('');
    this.setUhid('');
    this.setToken('');
}
PlxUserMgr.prototype.doLogin = function (theirBag)
{

    var myBag = {};
    
    myBag.reason  = "Checking Login...";
    myBag.body    = '';
    myBag.result  = '';
    myBag.log     = this.log;
    myBag.header  = "['Header', 'ClientID', '" + gPlxPrefsMgr.getCharPref('plaxo.plxClientID') + "', 'Identifier', '" + theirBag.username + "', 'Password', '" + theirBag.password +"']\n['/Header']\n";

    myBag.handler = function ()
    {
        var d = gPlxHttpMgr.convertToDict(arguments);
        
        if (d == undefined)
        {
            myBag.log.fatal("Bad message");
            return;
        }
        
        if ( d.cmd._type == 'Status' )
        {
            myBag.log.info('Got Login Status');
            myBag.status = d.cmd.Code;
        }
        
        if ( d.cmd._type == 'Header' && d.cmd['ClientID'] != undefined)
        {
            myBag.log.info('Got ClientID');
            myBag.sessionKey = d.cmd.ClientID;
        }
        
        if ( d.cmd._type == 'Header' && d.cmd['Uhid'] != undefined && (gPlxPrefsMgr.getCharPref('plaxo.plxUhid', '') == ''))
        {
          gPlxUserMgr.setUhid(d.cmd['Uhid']);
        }
    }
    
    var ret = gPlxHttpMgr.restPOSTCall(myBag);
    
    if (!ret)
    {
        this.log.error("Failed to login. Server Error. Stopping");
        return "error";
    }

    if (myBag.status == '401')
    {
        this.log.info("Bad credentials. badLogin");
        return "badLogin";
    }
     
    if (myBag.status != '200')
    {
        this.log.error("Bad result code - status: " + myBag.status);
        return "error";
    }
    
    this.log.info("DoLogin returned: " + myBag.status);
    
    return "good";
}


PlxUserMgr.prototype.doLogin2 = function (theirBag)
{
    var myBag = {};
    
    myBag.reason     = "Checking Login...";
    myBag.vars       = [ 'signin', '2', 'signin.cid', gPlxPrefsMgr.getCharPref('plaxo.plxClientID'), 'signin.uid', this.getUhid() , 'signin.at', this.getToken()];
    myBag.result     = '';
    myBag.sessionKey = '';
    
    var ret = gPlxHttpMgr.restPOSTCall2(myBag);
    
    if (!ret)
    {
        if (theirBag) theirBag.reason = 'Server Communication Error';
        return 0;
    }

    this.log.info("DoLogin2 returned: " + ret);
    
    theirBag.sessionKey = myBag.sessionKey;
    
    return 1;
}


