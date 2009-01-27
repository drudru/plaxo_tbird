
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


function PlxPrefsMgr()
{
    // Grab the global scope logger and use that as a subclass
    this.log  = gLogSys.getLogger( "prefs." + gLog.name );

    this.server = null;
    
    this.server = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    if (!this.server)
        this.log.fatal("failed to get prefs service!\n");
        
    this.log.info("started prefs mgr");
}


PlxPrefsMgr.prototype.getIntPref = function(prefPath, defaultVal)
{
    var retVal = null;
    
    this.log.info("getIntPref: " + prefPath + " defaultValue:" + defaultVal);
    this.insureType(prefPath, "int");
    
    try 
    {
        retVal = this.server.getIntPref(prefPath);
        this.log.debug("getIntPref: " + prefPath + " retVal:" + retVal);
    } catch (ex)
    {
        this.log.debug("caught the getIntPref failure: " + prefPath);
        if (arguments.length == 2)
        {
            this.server.setIntPref(prefPath, defaultVal);
            retVal = defaultVal;
        }
    }
    
    return retVal;
}


PlxPrefsMgr.prototype.setIntPref = function(prefPath, value)
{
    this.log.debug("setIntPref: " + prefPath + " value:" + value);
    this.server.setIntPref(prefPath, value);
}



PlxPrefsMgr.prototype.getCharPref = function(prefPath, defaultVal)
{
    var retVal = null;
    
    this.log.info("getCharPref: " + prefPath + " defaultValue:" + defaultVal);
    this.insureType(prefPath, "string");
    
    try 
    {
        retVal = this.server.getCharPref(prefPath);
        this.log.debug("getCharPref: " + prefPath + " retVal:" + retVal);
    } catch (ex)
    {
        this.log.debug("caught the getCharPref failure: " + prefPath);
        if (arguments.length == 2)
        {
            this.server.setCharPref(prefPath, defaultVal);
            retVal = defaultVal;
        }
    }
    
    return retVal;
}


PlxPrefsMgr.prototype.setCharPref = function(prefPath, value)
{
    this.log.debug("setCharPref: " + prefPath + " value:" + value);
    this.server.setCharPref(prefPath, value);
}


PlxPrefsMgr.prototype.getBoolPref = function(prefPath, defaultVal)
{
    var retVal = null;

    this.log.info("getBoolPref: " + prefPath + " defaultValue:" + defaultVal);
    this.insureType(prefPath, "bool");
    
    try 
    {
        retVal = this.server.getBoolPref(prefPath);
        this.log.debug("getBoolPref: " + prefPath + " retVal:" + retVal);
    } catch (ex)
    {
        this.log.debug("caught the getBoolPref failure");
        if (arguments.length == 2)
        {
            this.server.setBoolPref(prefPath, defaultVal);
            retVal = defaultVal;
        }
    }
    
    return retVal;
}


PlxPrefsMgr.prototype.setBoolPref = function(prefPath, value)
{
    this.log.debug("setBoolPref: " + prefPath + " value:" + value);
    this.server.setBoolPref(prefPath, value);
}

PlxPrefsMgr.prototype.removePref = function(prefPath)
{
    this.log.debug("removePref: " + prefPath);
    try
    {
        this.server.clearUserPref(prefPath);
        this.log.debug('cleared pref');
    }
    catch (ex)
    {
        this.log.debug('clearing pref failed - no pref');
    }
}

PlxPrefsMgr.prototype.insureType = function(path, type)
{
    //AssertString(path);
    //AssertIsInList(type, ["invalid", "string", "int", "bool"]);
    
    var types = { "invalid" : 0, "string" : 32, "int" : 64, "bool" : 128 };

    var t = this.server.getPrefType( path );
    
    this.log.debug("insureType: path: " + path + " type: " + t + " expecting: " + types[type] + " (" + type + ")");
    
    if (t == 0)
        return;
    
    if (t != types[type])
    {
        this.log.debug("Clearing pref: " + path);
        try
        {
            this.server.clearUserPref(path);
        }
        catch (ex)
        {
            this.log.error("Exception clearing pref: " + path);
        }
    }
}

PlxPrefsMgr.prototype.getChildList = function(prefPath, obj)
{
    this.log.debug("getChildList: " + prefPath);
    return this.server.getChildList("ldap_2.servers", obj);
}
