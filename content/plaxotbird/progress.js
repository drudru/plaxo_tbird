
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
 

PlxLogSysInit("http.progress");

function onCancel()
{
    var bag = window.arguments[0];
    
    //bag.isGood = false;
    // Kill the stream
    bag.channel.cancel(Components.results.NS_BINDING_ABORTED);
    
    return true;
}

function onLoad()
{
    var bag = window.arguments[0];
    
    bag.isGood = false;

    var title = document.getElementById("title");
    title.value = bag.title;


    // Start the channel
    bag.channel.asyncOpen(new PlxNetStreamListener(window), null);
}

function PlxNetStreamListener(win)
{
    this.win = win;
    this.scriptInputStream = undefined;
}

PlxNetStreamListener.prototype.onStartRequest = function( req, data )
{
    var http = req.QueryInterface(Components.interfaces.nsIHttpChannel);                                     
}

PlxNetStreamListener.prototype.onStopRequest = function(req, data, status)
{
    var progress = document.getElementById("meter");
    progress.value = "100";
    
    var http = req.QueryInterface(Components.interfaces.nsIHttpChannel);
    
    if (this.scriptInputStream)
    {
        this.scriptInputStream.close();
    }


    if (status == 0 && http.responseStatus >= 200 && http.responseStatus < 300)
    {
        var bag = this.win.arguments[0];
        bag.isGood = true;
        bag.data = this.data;
        
        // Get the cookie
        bag.sessionKey = undefined;
        var cookieTxt = http.getResponseHeader("Set-Cookie");
        gLog.debug("Got responseHeader" + cookieTxt);
        if (isString(cookieTxt))
        {
            var m = cookieTxt.match( /Plaxo=([^;]+);/ );
            
            if (m)
            {
                bag.sessionKey = m[1];
                gLog.debug("Got sessionKey: " + bag.sessionKey);
            }
        }
 
    }
    else
    {
        gLog.fatal("ERROR - Got back status: " + status + " http: " + http);//+ (status == 0 ) ? (" http response: " + http.responseStatus) : "");
    }

    
    gLog.debug("Doing acceptDialog");

    document.documentElement.acceptDialog();
}

PlxNetStreamListener.prototype.onDataAvailable = function( req, data, iStream, sourceOffset, count )
{

    if (this.scriptInputStream == undefined)
    {
        this.scriptInputStream = Components.classes["@mozilla.org/scriptableinputstream;1"]
                 .createInstance(Components.interfaces.nsIScriptableInputStream);
        this.scriptInputStream.init(iStream);
        this.data = '';
    }
        
    this.data += this.scriptInputStream.read(count);
    
    var progress = document.getElementById("meter");
    progress.value = "80";
}

